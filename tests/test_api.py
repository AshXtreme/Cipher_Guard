import pytest
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_security_headers_present():
    response = client.get("/health")
    headers = response.headers

    assert headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["X-Frame-Options"] == "DENY"
    assert headers["Referrer-Policy"] == "no-referrer"
    assert "Strict-Transport-Security" in headers
    assert "Content-Security-Policy" in headers


def test_analyze_endpoint_success():
    payload = {"password": "xQ7$mPz2!vT9@wLk"}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] >= 80
    assert data["label"] == "Very Strong"
    assert data["checks"]["length_ok"] is True
    assert data["checks"]["has_lower"] is True
    assert data["checks"]["has_upper"] is True
    assert data["checks"]["has_digit"] is True
    assert data["checks"]["has_symbol"] is True


def test_analyze_endpoint_common_password():
    payload = {"password": "password"}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["checks"]["is_common_password"] is True
    assert data["score"] <= 10


def test_analyze_endpoint_oversized_input():
    # Attempt to send input > 256 characters
    oversized_password = "A1!" + "a" * 300
    payload = {"password": oversized_password}
    response = client.post("/api/analyze", json=payload)
    # Fastapi Pydantic model validation should return 422 Unprocessable Entity for max_length violation
    assert response.status_code == 422
    assert "string_too_long" in response.text or "password" in response.text


def test_breach_check_valid_prefix():
    # 5BAA6 is SHA-1 prefix for "password"
    response = client.get("/api/breach-check?prefix=5BAA6")
    assert response.status_code == 200
    data = response.json()
    assert data["prefix"] == "5BAA6"
    assert "suffixes" in data


def test_breach_check_invalid_prefix():
    # Invalid length (4 chars)
    response = client.get("/api/breach-check?prefix=5BAA")
    assert response.status_code == 400
    assert "Invalid prefix format" in response.json()["detail"]

    # Invalid non-hex char
    response = client.get("/api/breach-check?prefix=5BAAG")
    assert response.status_code == 400


def test_generate_endpoint_defaults():
    response = client.get("/api/generate")
    assert response.status_code == 200
    data = response.json()
    assert len(data["password"]) == 16
    assert data["entropy_bits"] > 60


def test_generate_endpoint_custom_params():
    response = client.get("/api/generate?length=24&symbols=false&numbers=true&exclude_ambiguous=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data["password"]) == 24
    assert data["entropy_bits"] > 0


def test_cors_rejects_unlisted_origin():
    response = client.options(
        "/api/analyze",
        headers={
            "Origin": "http://evil-attacker.com",
            "Access-Control-Request-Method": "POST"
        }
    )
    # Unlisted origin should not receive Access-Control-Allow-Origin header matching evil-attacker.com
    assert response.headers.get("Access-Control-Allow-Origin") != "http://evil-attacker.com"
