import re
from pathlib import Path
from typing import Dict, List, Set, Any

MAX_PASSWORD_LENGTH = 256
COMMON_PASSWORDS_FILE = Path(__file__).parent.parent / "data" / "common_passwords.txt"

def load_common_passwords() -> Set[str]:
    """Loads the set of common passwords from file, returning a lowercased set."""
    common_set: Set[str] = set()
    if COMMON_PASSWORDS_FILE.exists():
        with open(COMMON_PASSWORDS_FILE, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                cleaned = line.strip().lower()
                if cleaned:
                    common_set.add(cleaned)
    else:
        # Minimal embedded fallback set
        common_set = {
            "123456", "password", "123456789", "12345678", "12345", "1234567",
            "qwerty", "admin", "welcome", "iloveyou", "sunshine", "letmein"
        }
    return common_set

COMMON_PASSWORDS = load_common_passwords()


def has_sequential_or_repeated(password: str) -> bool:
    """
    Checks for 3+ consecutive repeated characters (e.g. 'aaa')
    or 3+ sequential characters (e.g. 'abc', 'cba', '123', '321').
    """
    if len(password) < 3:
        return False

    lowered = password.lower()
    for i in range(len(lowered) - 2):
        c1, c2, c3 = ord(lowered[i]), ord(lowered[i+1]), ord(lowered[i+2])

        # 3 identical consecutive characters
        if c1 == c2 == c3:
            return True

        # Ascending sequence (abc, 123)
        if c2 == c1 + 1 and c3 == c2 + 1:
            return True

        # Descending sequence (cba, 321)
        if c2 == c1 - 1 and c3 == c2 - 1:
            return True

    return False


def analyze_password(password: str) -> Dict[str, Any]:
    """
    Analyzes password strength using regex heuristics, character class checks,
    sequential character detection, and dictionary matching.
    """
    if not password:
        return {
            "score": 0,
            "label": "Very Weak",
            "checks": {
                "length_ok": False,
                "has_lower": False,
                "has_upper": False,
                "has_digit": False,
                "has_symbol": False,
                "is_common_password": False,
                "has_sequential_chars": False,
            },
            "suggestions": ["Enter a password to analyze its strength."]
        }

    # Truncate input if it exceeds max allowed length to prevent ReDoS / hashing DoS
    eval_password = password[:MAX_PASSWORD_LENGTH]

    checks = {
        "length_ok": len(eval_password) >= 12,
        "has_lower": bool(re.search(r"[a-z]", eval_password)),
        "has_upper": bool(re.search(r"[A-Z]", eval_password)),
        "has_digit": bool(re.search(r"\d", eval_password)),
        "has_symbol": bool(re.search(r"[^A-Za-z0-9]", eval_password)),
        "is_common_password": eval_password.lower() in COMMON_PASSWORDS,
        "has_sequential_chars": has_sequential_or_repeated(eval_password),
    }

    # Score calculation
    # Length contributes up to 60 points (3 points per character up to 20 chars)
    score = min(len(eval_password), 20) * 3

    # Character class completeness adds 10 points per class (up to 40)
    class_count = sum([checks["has_lower"], checks["has_upper"], checks["has_digit"], checks["has_symbol"]])
    score += class_count * 10

    # Penalties
    if checks["is_common_password"]:
        score = min(score, 10)  # Hard cap for known breach/dictionary passwords

    if checks["has_sequential_chars"]:
        score -= 15

    # Clamp score between 0 and 100
    score = max(0, min(100, score))

    # Rating label determination
    if score <= 20:
        label = "Very Weak"
    elif score <= 40:
        label = "Weak"
    elif score <= 60:
        label = "Fair"
    elif score <= 80:
        label = "Strong"
    else:
        label = "Very Strong"

    # Build actionable suggestions
    suggestions: List[str] = []
    if checks["is_common_password"]:
        suggestions.append("This is a commonly used password. Choose a unique passphrase.")
    if not checks["length_ok"]:
        suggestions.append("Increase password length to at least 12 characters (16+ recommended).")
    if not checks["has_lower"]:
        suggestions.append("Add lowercase letters (a-z).")
    if not checks["has_upper"]:
        suggestions.append("Add uppercase letters (A-Z).")
    if not checks["has_digit"]:
        suggestions.append("Include numeric digits (0-9).")
    if not checks["has_symbol"]:
        suggestions.append("Include special symbols (e.g. !@#$%^&*).")
    if checks["has_sequential_chars"]:
        suggestions.append("Avoid repetitive or sequential character patterns (e.g. 'abc', '123', 'aaa').")

    if not suggestions:
        suggestions.append("Great password! It satisfies all key security criteria.")

    return {
        "score": score,
        "label": label,
        "checks": checks,
        "suggestions": suggestions
    }
