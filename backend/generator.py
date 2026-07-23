import math
import secrets
from typing import Dict, Any

AMBIGUOUS_CHARS = set("0Oo1lI")

LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz"
UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
DIGIT_CHARS = "0123456789"
SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"


def generate_secure_password(
    length: int = 16,
    include_symbols: bool = True,
    include_numbers: bool = True,
    exclude_ambiguous: bool = True
) -> Dict[str, Any]:
    """
    Generates a cryptographically secure random password using Python's `secrets` module.
    Calculates theoretical entropy in bits for default/configured settings.
    """
    # Clamp length bounds (min 8, max 128)
    length = max(8, min(128, length))

    # Determine active character pools
    lower_pool = LOWERCASE_CHARS
    upper_pool = UPPERCASE_CHARS
    digit_pool = DIGIT_CHARS if include_numbers else ""
    symbol_pool = SYMBOL_CHARS if include_symbols else ""

    if exclude_ambiguous:
        lower_pool = "".join(c for c in lower_pool if c not in AMBIGUOUS_CHARS)
        upper_pool = "".join(c for c in upper_pool if c not in AMBIGUOUS_CHARS)
        digit_pool = "".join(c for c in digit_pool if c not in AMBIGUOUS_CHARS)
        symbol_pool = "".join(c for c in symbol_pool if c not in AMBIGUOUS_CHARS)

    active_pools = [p for p in [lower_pool, upper_pool, digit_pool, symbol_pool] if p]

    if not active_pools:
        # Fallback to lower + upper if all options disabled
        active_pools = [lower_pool, upper_pool]

    combined_charset = "".join(active_pools)
    charset_size = len(combined_charset)

    # Guarantee at least one character from each active pool
    password_chars = [secrets.choice(pool) for pool in active_pools]

    # Fill remaining length with random choices from combined charset
    remaining_length = length - len(password_chars)
    for _ in range(remaining_length):
        password_chars.append(secrets.choice(combined_charset))

    # Cryptographically shuffle character positions
    sys_rand = secrets.SystemRandom()
    sys_rand.shuffle(password_chars)

    password = "".join(password_chars)

    # Calculate theoretical entropy: H = L * log2(R)
    entropy_bits = length * math.log2(charset_size) if charset_size > 0 else 0.0

    return {
        "password": password,
        "length": length,
        "entropy_bits": round(entropy_bits, 2)
    }
