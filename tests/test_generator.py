import pytest
from backend.generator import generate_secure_password, AMBIGUOUS_CHARS


def test_generator_default_options():
    res = generate_secure_password()
    pwd = res["password"]
    assert len(pwd) == 16
    assert res["entropy_bits"] > 60
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
