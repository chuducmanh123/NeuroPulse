"""Shared helpers for the NeuroVision data pipeline (scripts 01, 02, 04)."""
from __future__ import annotations

import json
from pathlib import Path

import nibabel as nib
import numpy as np

try:  # Windows: use the OS trust store (TemplateFlow/GitHub downloads). Verification stays ON.
    import truststore

    truststore.inject_into_ssl()
except ImportError:  # pragma: no cover
    pass

# Lossless: smaller .nii.gz without changing data.
nib.openers.Opener.default_compresslevel = 9

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
PUB = ROOT / "public" / "neurovision"
VOLUMES = PUB / "volumes"
ATLASES = PUB / "atlases"
MESHES = PUB / "meshes"
DATA = PUB / "data"
CACHE = SCRIPTS / ".cache"
VALIDATION = SCRIPTS / "validation"

TARGET_SPACE = "MNI152NLin2009cAsym"
TARGET_SHAPE = (193, 229, 193)

# Size targets from the brief (reported, never "fixed" by degrading quality).
MAX_ATLAS_BYTES = 1 * 1024 * 1024
MAX_VOLUME_BYTES = 3 * 1024 * 1024


def save_nifti(data: np.ndarray, affine: np.ndarray, path: Path, description: str = "") -> None:
    """Save with sform/qform code 4 (MNI standard space)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    img = nib.Nifti1Image(data, affine)
    img.set_sform(affine, code=4)
    img.set_qform(affine, code=4)
    img.header["descrip"] = description.encode("ascii", "ignore")[:79]
    nib.save(img, str(path))


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


def label_table(atlas: str, space: str, source: str, license_: str, labels: list[dict], notes: list[str] | None = None) -> dict:
    """Label sidecar. Every medical item carries `source` and `review_status` (default 'unreviewed')."""
    return {
        "atlas": atlas,
        "space": space,
        "source": source,
        "license": license_,
        "review_status": "unreviewed",
        "notes": notes or [],
        "labels": [{**lab, "source": source, "review_status": "unreviewed"} for lab in labels],
    }
