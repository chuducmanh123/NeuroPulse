"""Single Source of Truth loader for Gemini model configuration."""

import json
from pathlib import Path
from typing import List

_FALLBACK_WATERFALL: List[str] = [
    "gemini-4-hydrogen",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
]
_DEFAULT_LABELER = "gemini-4-hydrogen"


def _load_config() -> dict:
    config_path = Path(__file__).resolve().parent.parent / "config" / "gemini-models.json"
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def get_gemini_waterfall() -> List[str]:
    cfg = _load_config()
    wf = cfg.get("waterfall")
    if isinstance(wf, list) and wf:
        return [str(m) for m in wf]
    return list(_FALLBACK_WATERFALL)


def get_default_labeler_model() -> str:
    cfg = _load_config()
    val = cfg.get("defaultLabelerModel")
    return str(val) if isinstance(val, str) and val.strip() else _DEFAULT_LABELER
