import os
import logging
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Request, Response, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.analyzer import analyze_password, MAX_PASSWORD_LENGTH
from backend.generator import generate_secure_password
from backend.breach_check import fetch_hibp_range, validate_prefix
from backend.utils.redactor import SensitiveDataRedactingFilter, redact_sensitive_text

# Configure logging with redaction filter
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cipherguard")
logger.addFilter(SensitiveDataRedactingFilter())

# Environment settings
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI App instance (disable interactive docs in production)
is_prod = ENVIRONMENT == "production"
app = FastAPI(
    title="CipherGuard API",
    description="Production-grade Password Strength Analyzer, Generator, and HIBP k-Anonymity Proxy API",
    version="1.0.0",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    openapi_url=None if is_prod else "/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 1. Add CORS Middleware with explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# 2. Add Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    # Prevent caching of password-related HTTP responses
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    # Security headers
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; object-src 'none'"
    return response

# Central exception handler ensuring sanitized responses to client
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on path {request.url.path}: {redact_sensitive_text(str(exc))}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# --- Pydantic Data Models ---

class AnalyzeRequest(BaseModel):
    password: str = Field(
        ...,
        description="Candidate password string to analyze",
        max_length=MAX_PASSWORD_LENGTH
    )

class ChecksModel(BaseModel):
    length_ok: bool
    has_lower: bool
    has_upper: bool
    has_digit: bool
    has_symbol: bool
    is_common_password: bool
    has_sequential_chars: bool

class AnalyzeResponse(BaseModel):
    score: int
    label: str
    checks: ChecksModel
    suggestions: List[str]

class SuffixModel(BaseModel):
    suffix: str
    count: int

class BreachCheckResponse(BaseModel):
    prefix: str
    suffixes: List[SuffixModel]
    status: str
    message: Optional[str] = None

class GenerateResponse(BaseModel):
    password: str
    length: int
    entropy_bits: float

class HealthResponse(BaseModel):
    status: str

# --- API Routes ---

@app.get("/health", response_model=HealthResponse, tags=["Health"])
@limiter.limit("60/minute")
async def health_check(request: Request):
    """Health check endpoint for monitoring uptime."""
    return {"status": "healthy"}


@app.post("/api/analyze", response_model=AnalyzeResponse, tags=["Security"])
@limiter.limit("30/minute")
async def analyze_endpoint(request: Request, body: AnalyzeRequest):
    """
    Analyzes password strength using regex heuristics, character class checks,
    sequential character detection, and top-10k dictionary matching.
    """
    result = analyze_password(body.password)
    return result


@app.get("/api/breach-check", response_model=BreachCheckResponse, tags=["Security"])
@limiter.limit("20/minute")
async def breach_check_endpoint(
    request: Request,
    prefix: str = Query(..., description="First 5 hex characters of SHA-1 password hash")
):
    """
    Proxies HIBP range API using k-anonymity.
    Forwards ONLY the 5-character SHA-1 hash prefix over HTTPS with Add-Padding: true.
    """
    cleaned_prefix = prefix.strip().upper()
    if not validate_prefix(cleaned_prefix):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid prefix format. Must be exactly 5 hexadecimal characters."
        )

    result = await fetch_hibp_range(cleaned_prefix)
    return result


@app.get("/api/generate", response_model=GenerateResponse, tags=["Generator"])
@limiter.limit("60/minute")
async def generate_endpoint(
    request: Request,
    length: int = Query(16, ge=8, le=128, description="Length of generated password"),
    symbols: bool = Query(True, description="Include special symbols"),
    numbers: bool = Query(True, description="Include numbers"),
    exclude_ambiguous: bool = Query(True, description="Exclude ambiguous characters (0, O, o, 1, l, I)")
):
    """
    Returns a cryptographically secure random password generated using Python's secrets module.
    """
    result = generate_secure_password(
        length=length,
        include_symbols=symbols,
        include_numbers=numbers,
        exclude_ambiguous=exclude_ambiguous
    )
    return result
