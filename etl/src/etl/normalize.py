from __future__ import annotations

import re
from typing import Optional

MAKE_ALIASES = {
    "mercedes benz": "Mercedes-Benz",
    "mercedesbenz": "Mercedes-Benz",
    "vw": "Volkswagen",
    "ram trucks": "Ram",
    "ram": "Ram",
    "mini": "MINI",
    "alfa romeo": "Alfa Romeo",
    "genesis": "Genesis",
    "polestar": "Polestar",
}

NON_WORD_RE = re.compile(r"[^\w\s]")
WHITESPACE_RE = re.compile(r"\s+")
DRIVE_SUFFIX_RE = re.compile(r"\b(awd|fwd|rwd|4wd|4x4)\b", re.IGNORECASE)


def normalize_text(value: str) -> str:
    value = value.strip().lower()
    value = value.replace("-", " ")
    value = NON_WORD_RE.sub(" ", value)
    value = WHITESPACE_RE.sub(" ", value)
    return value.strip()


def normalize_make_name(value: str) -> str:
    key = normalize_text(value)
    canonical = MAKE_ALIASES.get(key, value.strip())
    return canonical


def normalized_key(value: str) -> str:
    return normalize_text(value)


TRIM_AT_RE = re.compile(r"\b(\d+)(at|mt)\b", re.IGNORECASE)


def _replace_transmission(match: re.Match[str]) -> str:
    gear = match.group(1)
    code = match.group(2).lower()
    label = "Automatic" if code == "at" else "Manual"
    return f"{gear} {label}"


def clean_trim_name(name: str) -> str:
    text = name.strip()
    text = text.replace("w/", "with ")
    # Remove duplicate drive suffix if present separately
    parts = text.split()
    drives = {"awd", "fwd", "rwd", "4wd", "4x4"}
    if parts and parts[-1].lower() in drives:
        drive_token = parts[-1]
        body = " ".join(parts[:-1])
        if DRIVE_SUFFIX_RE.search(body):
            text = body
    text = TRIM_AT_RE.sub(_replace_transmission, text)
    return re.sub(r"\s+", " ", text).strip()


def derive_standard_transmission(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    val = value.strip().upper()
    if val in {"AT", "AUTO", "AUTOMATIC"}:
        return "Automatic"
    if val in {"MT", "MANUAL"}:
        return "Manual"
    return value


def normalize_drivetrain(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    val = value.strip().upper()
    mapping = {"4X4": "4WD", "FOUR-WHEEL DRIVE": "4WD", "FWD": "FWD", "RWD": "RWD", "AWD": "AWD", "4WD": "4WD"}
    return mapping.get(val, val)


def collapse_spaces(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return re.sub(r"\s+", " ", value).strip()
