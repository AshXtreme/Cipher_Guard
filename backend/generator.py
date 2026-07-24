import math
import secrets
from pathlib import Path
from typing import Dict, Any, List

AMBIGUOUS_CHARS = set("0Oo1lI")

LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz"
UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
DIGIT_CHARS = "0123456789"
SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"

EFF_WORDLIST_FILE = Path(__file__).parent.parent / "data" / "eff_large_wordlist.txt"


def load_eff_wordlist() -> List[str]:
    """Loads EFF's Large Word List from file, returning a list of words."""
    words: List[str] = []
    if EFF_WORDLIST_FILE.exists():
        with open(EFF_WORDLIST_FILE, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    parts = line.split("\t")
                    word = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                    if word:
                        words.append(word)
    if not words:
        # Fallback list if file is somehow missing
        words = ["correct", "horse", "battery", "staple", "cipher", "guard", "emerald", "obsidian"]
    return words


EFF_WORDS = load_eff_wordlist()


def generate_diceware_passphrase(
    word_count: int = 6,
    separator: str = "-"
) -> Dict[str, Any]:
    """
    Generates a memorable Diceware passphrase using EFF's Large Word List and `secrets.choice`.
    Calculates exact entropy H = word_count * log2(7776).
    """
    # Clamp word_count bounds (min 3, max 20)
    word_count = max(3, min(20, word_count))

    selected_words = [secrets.choice(EFF_WORDS) for _ in range(word_count)]
    passphrase = separator.join(selected_words)

    # Exact entropy calculation
    list_size = len(EFF_WORDS)
    entropy_bits = word_count * math.log2(list_size) if list_size > 0 else 0.0

    return {
        "password": passphrase,
        "mode": "diceware",
        "word_count": word_count,
        "separator": separator,
        "entropy_bits": round(entropy_bits, 2)
    }


def generate_secure_password(
    length: int = 16,
    include_symbols: bool = True,
    include_numbers: bool = True,
    exclude_ambiguous: bool = True,
    mode: str = "random",
    word_count: int = 6,
    separator: str = "-"
) -> Dict[str, Any]:
    """
    Generates a cryptographically secure random password or Diceware passphrase
    using Python's `secrets` module.
    Maintains 100% backward compatibility for mode='random' or default calls.
    """
    if mode == "diceware":
        return generate_diceware_passphrase(word_count=word_count, separator=separator)

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
        "mode": "random",
        "length": length,
        "entropy_bits": round(entropy_bits, 2)
    }
