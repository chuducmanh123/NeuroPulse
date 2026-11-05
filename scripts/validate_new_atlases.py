import json
import nibabel as nib
import numpy as np
from pathlib import Path

PUB = Path("public/neurovision")

# 1. Glasser NIfTI
g_img = nib.load(PUB / "atlases" / "glasser.nii.gz")
assert g_img.shape == (193, 229, 193), f"Wrong shape: {g_img.shape}"
assert g_img.header['intent_code'] == 1002, f"Expected intent_code 1002, got {g_img.header['intent_code']}"
assert g_img.header['cal_min'] == 0.0 and g_img.header['cal_max'] == 0.0, "cal_min/cal_max must be 0.0"
g_data = g_img.get_fdata().astype(int)
g_labels = np.unique(g_data)
assert len(g_labels) == 361, f"Expected 361 unique labels, got {len(g_labels)}"
assert g_labels[0] == 0 and g_labels[-1] == 360, "Glasser labels must span 0..360"
print("[PASS] Glasser NIfTI verified: 360 labels, shape (193, 229, 193), intent_code 1002 (NIFTI_INTENT_LABEL)")

# 2. Brainnetome NIfTI
b_img = nib.load(PUB / "atlases" / "brainnetome.nii.gz")
assert b_img.shape == (193, 229, 193), f"Wrong shape: {b_img.shape}"
assert b_img.header['intent_code'] == 1002, f"Expected intent_code 1002, got {b_img.header['intent_code']}"
assert b_img.header['cal_min'] == 0.0 and b_img.header['cal_max'] == 0.0, "cal_min/cal_max must be 0.0"
b_data = b_img.get_fdata().astype(int)
b_labels = np.unique(b_data)
assert len(b_labels) == 247, f"Expected 247 unique labels, got {len(b_labels)}"
assert b_labels[0] == 0 and b_labels[-1] == 246, "BNA labels must span 0..246"
print("[PASS] Brainnetome NIfTI verified: 246 labels, shape (193, 229, 193), intent_code 1002 (NIFTI_INTENT_LABEL)")

# 3. Colormaps
with open(PUB / "data" / "colormaps" / "glasser.json") as f:
    cm_g = json.load(f)
assert len(cm_g["R"]) == 361 and len(cm_g["I"]) == 361, "Glasser colormap length mismatch"
assert "labels" in cm_g and cm_g["labels"][0] == "Background", "Glasser colormap missing labels or Background at 0"
assert cm_g["A"][0] == 0, "Glasser background opacity A[0] must be 0"

with open(PUB / "data" / "colormaps" / "brainnetome.json") as f:
    cm_b = json.load(f)
assert len(cm_b["R"]) == 247 and len(cm_b["I"]) == 247, "BNA colormap length mismatch"
assert "labels" in cm_b and cm_b["labels"][0] == "Background", "BNA colormap missing labels or Background at 0"
assert cm_b["A"][0] == 0, "BNA background opacity A[0] must be 0"
print("[PASS] Colormaps verified: glasser.json (361 entries with labels, A[0]=0), brainnetome.json (247 entries with labels, A[0]=0)")

# 4. Centroids
with open(PUB / "data" / "centroids.json", encoding="utf-8") as f:
    cents = json.load(f)
assert len(cents["glasser"]) == 360, f"Expected 360 Glasser centroids, got {len(cents['glasser'])}"
assert len(cents["brainnetome"]) == 246, f"Expected 246 BNA centroids, got {len(cents['brainnetome'])}"

# Check that in_mask_vox is valid
for k, v in cents["glasser"].items():
    vox = v["in_mask_vox"]
    assert g_data[vox[0], vox[1], vox[2]] == int(k), f"Glasser centroid voxel {vox} does not match label {k}"

for k, v in cents["brainnetome"].items():
    vox = v["in_mask_vox"]
    assert b_data[vox[0], vox[1], vox[2]] == int(k), f"BNA centroid voxel {vox} does not match label {k}"
print("[PASS] Centroids verified: 100% of centroids lie directly inside their respective label masks")

# 5. Ontology
with open(PUB / "data" / "neuro_ontology.json", encoding="utf-8") as f:
    onto = json.load(f)

g_entries = [e for e in onto["entries"] if e["atlas"] == "glasser"]
b_entries = [e for e in onto["entries"] if e["atlas"] == "brainnetome"]

assert len(g_entries) == 360, f"Expected 360 Glasser ontology entries, got {len(g_entries)}"
assert len(b_entries) == 246, f"Expected 246 BNA ontology entries, got {len(b_entries)}"

for ge in g_entries:
    assert "hcp_metrics" in ge, f"Missing hcp_metrics in label {ge['label_id']}"
    assert ge["hcp_metrics"]["macro_region"].startswith("Region "), f"Invalid macro_region in {ge['code']}"

for be in b_entries:
    assert "brainnetome_metrics" in be, f"Missing brainnetome_metrics in label {be['label_id']}"
    assert be["brainnetome_metrics"]["yeo_network_7"], f"Missing yeo_network_7 in {be['code']}"
    assert sum(be["brainnetome_metrics"]["behavioral_domains"].values()) == 100, f"Domains do not sum to 100 in {be['code']}"

print("[PASS] Ontology verified: All 360 Glasser and 246 BNA entries are complete and schema-valid!")
print("\n>>> ALL VALIDATION TESTS PASSED WITH 100% SUCCESS <<<")
