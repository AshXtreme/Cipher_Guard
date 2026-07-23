import logging
import pytest
from backend.utils.redactor import redact_sensitive_text, redact_sensitive_dict, SensitiveDataRedactingFilter
from fastapi.testclient import TestClient
from backend.app import app


def test_redact_sensitive_text_password_json():
    input_text = '{"username": "alice", "password": "SuperSecretPassword123!"}'
    redacted = redact_sensitive_text(input_text)
    assert "SuperSecretPassword123!" not in redacted
    assert '[REDACTED]' in redacted


def test_redact_sensitive_text_sha1_hash():
    # 40-character SHA-1 hash for "password"
    full_hash = "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"
    input_text = f"User SHA1 computed: {full_hash}"
    redacted = redact_sensitive_text(input_text)

    # 40-character full hash must not appear in full
    assert full_hash not in redacted
    # 5-character prefix should be preserved for k-anonymity context
    assert "5BAA6" in redacted
    assert "[REDACTED_HASH]" in redacted


def test_redact_sensitive_dict():
    data = {
        "user_id": 42,
        "raw_password": "MySecretPassword!99",
        "nested": {
            "token": "abc123secretToken",
            "safe_field": "public_data"
        }
    }
    redacted = redact_sensitive_dict(data)
    assert redacted["raw_password"] == "[REDACTED]"
    assert redacted["nested"]["token"] == "[REDACTED]"
    assert redacted["nested"]["safe_field"] == "public_data"


def test_logging_filter_scrubs_passwords(caplog):
    logger = logging.getLogger("test_redactor")
    logger.setLevel(logging.INFO)
    logger.addFilter(SensitiveDataRedactingFilter())

    with caplog.at_level(logging.INFO):
        logger.info('Processing password: "SuperSecretPassword123!"')
        logger.info('User SHA1 computed: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8')

    captured_logs = caplog.text
    assert "SuperSecretPassword123!" not in captured_logs
    assert "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8" not in captured_logs
    assert "5BAA6" in captured_logs
