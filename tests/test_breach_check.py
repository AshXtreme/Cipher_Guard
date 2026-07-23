import pytest
from unittest.mock import MagicMock, patch
import httpx
from backend.breach_check import validate_prefix, fetch_hibp_range


def test_validate_prefix():
    assert validate_prefix("5BAA6") is True
    assert validate_prefix("5baa6") is True
    assert validate_prefix("12345") is True
    assert validate_prefix("5BAA") is False
    assert validate_prefix("5BAA67") is False
    assert validate_prefix("5BAAG") is False


@pytest.mark.asyncio
async def test_fetch_hibp_range_invalid_prefix():
    with pytest.raises(ValueError, match="Invalid hash prefix"):
        await fetch_hibp_range("INVALID")


@pytest.mark.asyncio
async def test_fetch_hibp_range_known_breached_prefix():
    # 5BAA6 is the SHA-1 prefix for "password" (5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8)
    res = await fetch_hibp_range("5BAA6")
    assert res["prefix"] == "5BAA6"
    if res["status"] == "success":
        assert len(res["suffixes"]) > 0
        target_suffix = "1E4C9B93F3F0682250B6CF8331B7EE68FD8"
        matching = [s for s in res["suffixes"] if s["suffix"] == target_suffix]
        assert len(matching) == 1
        assert matching[0]["count"] > 1000


@pytest.mark.asyncio
async def test_fetch_hibp_range_rate_limited():
    mock_resp = MagicMock()
    mock_resp.status_code = 429
    mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Rate Limited", request=MagicMock(), response=mock_resp
    )

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        res = await fetch_hibp_range("5BAA6")
        assert res["status"] == "rate_limited"
        assert "rate limit exceeded" in res["message"].lower()


@pytest.mark.asyncio
async def test_fetch_hibp_range_timeout():
    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Timeout")):
        res = await fetch_hibp_range("5BAA6")
        assert res["status"] == "unavailable"
        assert "timed out" in res["message"].lower()
