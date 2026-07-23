import re
import logging
from typing import Any, Dict, Union

# Pattern matching sensitive key and capturing the value to redact
SENSITIVE_KEY_PATTERN = re.compile(
    r'(?i)("?(?:password|pass|secret|token|hash|raw_password)"?\s*[:=]\s*["\']?)([^"\'\s,{}]+)(["\']?)'
)

# Pattern matching full 40-character SHA-1 hashes
SHA1_FULL_HASH_PATTERN = re.compile(r'\b[a-fA-F0-9]{40}\b')


def redact_sensitive_text(text: str) -> str:
    """
    Redacts full passwords and 40-character SHA-1 hashes from a log text string.
    5-character prefixes used in k-anonymity checks are preserved.
    """
    if not isinstance(text, str):
        return text

    # Redact sensitive values following keys like password, token, secret
    redacted = SENSITIVE_KEY_PATTERN.sub(r'\1[REDACTED]\3', text)

    # Redact full SHA-1 hashes (matching 40 hex chars)
    def redact_hash(match: re.Match) -> str:
        full_hash = match.group(0)
        # Keep only the first 5 characters for k-anonymity context, redact the rest
        return f"{full_hash[:5]}***[REDACTED_HASH]***"

    redacted = SHA1_FULL_HASH_PATTERN.sub(redact_hash, redacted)
    return redacted


def redact_sensitive_dict(data: Union[Dict[str, Any], list, str]) -> Union[Dict[str, Any], list, str]:
    """
    Recursively redacts sensitive fields (password, raw_password, full hashes) from dictionaries or lists.
    """
    if isinstance(data, dict):
        cleaned = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(sens in key_lower for sens in ["password", "secret", "token", "raw_password"]):
                cleaned[key] = "[REDACTED]"
            elif isinstance(value, (dict, list)):
                cleaned[key] = redact_sensitive_dict(value)
            elif isinstance(value, str):
                cleaned[key] = redact_sensitive_text(value)
            else:
                cleaned[key] = value
        return cleaned
    elif isinstance(data, list):
        return [redact_sensitive_dict(item) for item in data]
    elif isinstance(data, str):
        return redact_sensitive_text(data)
    return data


class SensitiveDataRedactingFilter(logging.Filter):
    """
    Logging filter that automatically redacts sensitive data from all log records.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_text(record.msg)
        if isinstance(record.args, dict):
            record.args = redact_sensitive_dict(record.args)
        elif isinstance(record.args, tuple):
            record.args = tuple(
                redact_sensitive_text(arg) if isinstance(arg, str) else arg for arg in record.args
            )
        return True
