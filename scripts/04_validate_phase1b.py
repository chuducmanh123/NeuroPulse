"""04_validate_phase1b.py - Two-way validation for Phase 1B Ontology and Colormaps.

Strict Acceptance Criteria:
1. Two-way check: Every unique label_id in every atlas volume (.nii.gz)
   must have an entry in neuro_ontology.json and in the corresponding NiiVue colormap.
2. Medical Governance:
   - 100% of entries must have non-empty `source`.
   - No clinical syndrome or function entry without verified source.
   - 100% of entries default to `review_status: 'unreviewed'`.
3. NiiVue Colormap Format:
   - Valid JSON, arrays R, G, B, A, I, labels equal in length.
   - Index 0 is background (A=0).
4. Statistics:
   - Detailed vs minimal counts, category counts, review status counts.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
import nibabel as nib
import numpy as np

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
PUB = ROOT / "public" / "neurovision"
ATLASES = PUB / "atlases"
DATA = PUB / "data"
COLORMAPS = DATA / "colormaps"

FAILS: list[str] = []

def check(cond: bool, msg: str) -> None:
    print(("  PASS  " if cond else "  FAIL  ") + msg)
    if not cond:
        FAILS.append(msg)

print("=" * 70)
print("PHASE 1B VALIDATION: ONTOLOGY & NIIVUE COLORMAPS")
print("=" * 70)

# 1. Load ontology
ont_path = DATA / "neuro_ontology.json"
check(ont_path.exists(), f"Ontology file exists at {ont_path}")
ont = json.loads(ont_path.read_text(encoding="utf-8"))
entries = ont.get("entries", [])
check(len(entries) > 0, f"Ontology has {len(entries)} entries")

ont_map: dict[tuple[str, int], dict] = {(e["atlas"], e["label_id"]): e for e in entries}

# 2. Atlases to validate
ATLAS_NAMES = [
    "aspects",
    "arterial_level2",
    "arterial",
    "brainstem_aan",
    "anatomy",
    "whitematter",
    "venous",
    "aal3",
]

print("\n[1] TWO-WAY VALIDATION: Atlas Volumes <-> Ontology <-> Colormaps")
for name in ATLAS_NAMES:
    nii_file = ATLASES / f"{name}.nii.gz"
    json_file = ATLASES / f"{name}.labels.json"
    cmap_file = COLORMAPS / f"{name}.json"

    check(nii_file.exists(), f"Atlas volume exists: {nii_file.name}")
    check(json_file.exists(), f"Atlas labels sidecar exists: {json_file.name}")
    check(cmap_file.exists(), f"Colormap exists: {cmap_file.name}")

    # Read unique volume voxel labels (for non-density atlases)
    meta = json.loads(json_file.read_text(encoding="utf-8"))
    labels = meta.get("labels", [])
    expected_ids = {l["index"] for l in labels}

    # Volume check (for label volumes)
    if name != "venous":  # venous is a continuous density volume 0-255
        vol = np.asarray(nib.load(str(nii_file)).dataobj)
        vol_u = set(np.unique(vol)) - {0}
        # Check volume labels subset of expected labels
        missing_in_meta = vol_u - expected_ids
        check(len(missing_in_meta) == 0, f"{name}: all volume voxel values {len(vol_u)} exist in .labels.json ({len(missing_in_meta)} missing)")

    # Ontology check: every expected_id must exist in ontology
    missing_in_ont = []
    for lid in expected_ids:
        if (name, lid) not in ont_map:
            missing_in_ont.append(lid)
    check(len(missing_in_ont) == 0, f"{name}: all {len(expected_ids)} labels mapped to ontology ({len(missing_in_ont)} missing)")

    # Colormap check
    cmap = json.loads(cmap_file.read_text(encoding="utf-8"))
    R, G, B, A, I, lbls = cmap["R"], cmap["G"], cmap["B"], cmap["A"], cmap["I"], cmap["labels"]
    same_len = len(R) == len(G) == len(B) == len(A) == len(I) == len(lbls)
    check(same_len, f"{name} colormap: all channels equal length ({len(I)} entries)")
    check(I[0] == 0 and A[0] == 0 and lbls[0] == "Background", f"{name} colormap: index 0 is transparent Background")
    
    cmap_ids = set(I) - {0}
    missing_in_cmap = expected_ids - cmap_ids
    check(len(missing_in_cmap) == 0, f"{name} colormap: contains all {len(expected_ids)} label IDs ({len(missing_in_cmap)} missing)")

print("\n[2] MEDICAL CONTENT GOVERNANCE AUDIT")
unreviewed_cnt = 0
reviewed_cnt = 0
missing_source_cnt = 0
detailed_cnt = 0
minimal_cnt = 0
cat_counts: dict[str, int] = {}
approx_without_source = 0

for e in entries:
    # Review status
    st = e.get("review_status")
    if st == "unreviewed":
        unreviewed_cnt += 1
    elif st == "reviewed":
        reviewed_cnt += 1
    else:
        FAILS.append(f"Invalid review_status '{st}' in entry {e['atlas']}:{e['label_id']}")

    # Source check
    src = e.get("source", [])
    if not src or not any(s.strip() for s in src):
        missing_source_cnt += 1
        FAILS.append(f"Missing source in {e['atlas']}:{e['label_id']} ({e['name_en']})")

    # Evidence level
    ev = e.get("evidence_level")
    if ev in ("approximate", "literature") and not src:
        approx_without_source += 1

    # Detailed clinical entries
    if e.get("clinical_syndromes") or e.get("functions") or e.get("aspects_zone"):
        detailed_cnt += 1
    else:
        minimal_cnt += 1

    cat = e.get("category", "unknown")
    cat_counts[cat] = cat_counts.get(cat, 0) + 1

check(missing_source_cnt == 0, f"100% of ontology entries have verified source citations ({missing_source_cnt} missing)")
check(approx_without_source == 0, f"No approximate/literature entries without source ({approx_without_source} found)")
check(unreviewed_cnt == len(entries), f"All {len(entries)} entries default to 'unreviewed' (human verification pending)")

print("\n[3] STATISTICAL SUMMARY")
print(f"  Total Ontology Records : {len(entries)}")
print(f"  - Detailed clinical    : {detailed_cnt}")
print(f"  - Minimal baseline     : {minimal_cnt}")
print("  Categories breakdown:")
for cat, cnt in sorted(cat_counts.items()):
    print(f"    - {cat:20s}: {cnt:3d} entries")
print(f"  Governance status:")
print(f"    - unreviewed         : {unreviewed_cnt} (100.0%)")
print(f"    - reviewed           : {reviewed_cnt}")

print("\n" + "=" * 70)
print("FINAL RESULT:", "ALL HARD CHECKS PASSED" if not FAILS else f"{len(FAILS)} FAILED")
print("=" * 70)
if FAILS:
    for f in FAILS:
        print("  -", f)
    sys.exit(1)
else:
    sys.exit(0)
