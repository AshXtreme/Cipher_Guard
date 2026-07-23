import pytest
from backend.analyzer import analyze_password, has_sequential_or_repeated, MAX_PASSWORD_LENGTH


def test_analyze_empty_password():
    res = analyze_password("")
    assert res["score"] == 0
    assert res["label"] == "Very Weak"
    assert res["checks"]["length_ok"] is False


def test_analyze_common_password():
    res = analyze_password("password")
    assert res["checks"]["is_common_password"] is True
    assert res["score"] <= 10
    assert res["label"] in ["Very Weak", "Weak"]


def test_analyze_sequential_password():
    assert has_sequential_or_repeated("abc123XYZ") is True
    assert has_sequential_or_repeated("123456") is True
    assert has_sequential_or_repeated("aaaBBB") is True
    assert has_sequential_or_repeated("k9$mQ2!vT") is False

    res = analyze_password("abc123456")
    assert res["checks"]["has_sequential_chars"] is True


def test_analyze_strong_password():
    res = analyze_password("xQ7$mPz2!vT9@wLk")
    assert res["checks"]["length_ok"] is True
    assert res["checks"]["has_lower"] is True
    assert res["checks"]["has_upper"] is True
    assert res["checks"]["has_digit"] is True
    assert res["checks"]["has_symbol"] is True
    assert res["checks"]["is_common_password"] is False
    assert res["checks"]["has_sequential_chars"] is False
    assert res["score"] >= 80
    assert res["label"] == "Very Strong"


def test_input_length_capping():
    oversized = "A1!" + "a" * 1000
    res = analyze_password(oversized)
    # Ensure length check evaluates without error or hanging
    assert res["score"] > 0
