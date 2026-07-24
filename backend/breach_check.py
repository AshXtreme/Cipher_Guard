import re
import os
import httpx
from typing import Dict, List, Any

HIBP_API_URL = os.getenv("HIBP_API_URL", "https://api.pwnedpasswords.com/range/")
HIBP_TIMEOUT = float(os.getenv("HIBP_TIMEOUT_SECONDS", "5.0"))
PREFIX_PATTERN = re.compile(r"^[0-9a-fA-F]{5}$")


def validate_prefix(prefix: str) -> bool:
    """Verifies that the provided prefix is exactly 5 hexadecimal characters."""
    return bool(PREFIX_PATTERN.match(prefix))


async def fetch_hibp_range(prefix: str) -> Dict[str, Any]:
    """
    Proxies the Have I Been Pwned range API using the k-anonymity model.
    Sends ONLY the 5-character SHA-1 prefix over HTTPS with `Add-Padding: true`.
    Returns matching hash suffixes and breach counts.
    """
    cleaned_prefix = prefix.strip().upper()
    if not validate_prefix(cleaned_prefix):
        raise ValueError("Invalid hash prefix. Prefix must be exactly 5 hexadecimal characters.")

    url = f"{HIBP_API_URL.rstrip('/')}/{cleaned_prefix}"
    headers = {
        "User-Agent": "CipherGuard-Security-Proxy/1.0",
        "Add-Padding": "true"  # Prevents response-size timing attacks
    }

    async with httpx.AsyncClient(timeout=HIBP_TIMEOUT) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            suffixes: List[Dict[str, Any]] = []
            lines = response.text.splitlines()

            for line in lines:
                if ":" in line:
                    suffix, count_str = line.split(":", 1)
                    try:
                        count = int(count_str.strip())
                        # Ignore padded dummy zero-count entries returned by HIBP padding
                        if count > 0:
                            suffixes.append({
                                "suffix": suffix.strip().upper(),
                                "count": count
                            })
                    except ValueError:
                        continue

            return {
                "prefix": cleaned_prefix,
                "suffixes": suffixes,
                "status": "success"
            }

        except httpx.TimeoutException:
            return {
                "prefix": cleaned_prefix,
                "suffixes": [],
                "status": "unavailable",
                "message": "Breach database query timed out. Please try again later."
            }
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                return {
                    "prefix": cleaned_prefix,
                    "suffixes": [],
                    "status": "rate_limited",
                    "message": "HIBP service rate limit exceeded. Please wait a moment before trying again."
                }
            return {
                "prefix": cleaned_prefix,
                "suffixes": [],
                "status": "error",
                "message": f"Upstream breach service returned HTTP status {exc.response.status_code}."
            }
        except Exception as exc:
            return {
                "prefix": cleaned_prefix,
                "suffixes": [],
                "status": "error",
                "message": "Unable to contact breach check service."
            }
