import pytest
from backend.generator import generate_secure_password, generate_diceware_passphrase, AMBIGUOUS_CHARS, EFF_WORDS


def test_generator_default_options():
    res = generate_secure_password()
    pwd = res["password"]
    assert len(pwd) == 16
    assert res["entropy_bits"] > 60
    assert res["mode"] == "random"
    # Confirm no ambiguous characters when exclude_ambiguous is True
    assert not any(c in AMBIGUOUS_CHARS for c in pwd)


def test_generator_length_bounds():
    res_short = generate_secure_password(length=4)
    assert len(res_short["password"]) == 8  # Clamped to min 8

    res_long = generate_secure_password(length=200)
    assert len(res_long["password"]) == 128  # Clamped to max 128


def test_generator_custom_options():
    res = generate_secure_password(
        length=24,
        include_symbols=False,
        include_numbers=True,
        exclude_ambiguous=False
    )
    pwd = res["password"]
    assert len(pwd) == 24
    assert any(c.isdigit() for c in pwd)


def test_diceware_passphrase_generation():
    res = generate_secure_password(mode="diceware", word_count=6, separator="-")
    assert res["mode"] == "diceware"
    assert res["word_count"] == 6
    assert res["separator"] == "-"
    words = res["password"].split("-")
    assert len(words) == 6
    # Each word should belong to EFF_WORDS list
    for w in words:
        assert w in EFF_WORDS
    # Entropy calculation for 6 words from 7776 wordlist: 6 * log2(7776) ~ 77.55 bits
    assert 77.0 <= res["entropy_bits"] <= 78.0


def test_diceware_custom_separator_and_bounds():
    res_custom = generate_diceware_passphrase(word_count=4, separator="_")
    assert res_custom["word_count"] == 4
    assert res_custom["separator"] == "_"
    assert len(res_custom["password"].split("_")) == 4

    res_clamped = generate_diceware_passphrase(word_count=1)
    assert res_clamped["word_count"] == 3  # Clamped to min 3


def test_generator_backward_compatibility():
    # Calling generate_secure_password without mode must contain all v1.0/v1.1 fields
    res = generate_secure_password(length=20)
    assert "password" in res
    assert "length" in res
    assert "entropy_bits" in res
    assert res["length"] == 20
