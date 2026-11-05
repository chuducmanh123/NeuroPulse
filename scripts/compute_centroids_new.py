import json
import nibabel as nib
import numpy as np
from pathlib import Path

DATA_DIR = Path("public/neurovision/data")
CENTROIDS_PATH = DATA_DIR / "centroids.json"

with open(CENTROIDS_PATH, encoding="utf-8") as f:
    centroids_data = json.load(f)

# 1. Glasser Centroids
glasser_path = Path("public/neurovision/atlases/glasser.nii.gz")
img_g = nib.load(glasser_path)
g_data = img_g.get_fdata().astype(int)
g_aff = img_g.affine

centroids_data["glasser"] = {}
print("Computing centroids for Glasser (360 labels)...")
for lbl in range(1, 361):
    mask = (g_data == lbl)
    vox_coords = np.argwhere(mask)
    if len(vox_coords) == 0:
        print(f"Warning: Glasser label {lbl} has 0 voxels!")
        continue
    mm_coords = nib.affines.apply_affine(g_aff, vox_coords)
    mean_mm = mm_coords.mean(axis=0)

    dists = np.linalg.norm(mm_coords - mean_mm, axis=1)
    best_idx = np.argmin(dists)
    in_mask_mm = mm_coords[best_idx]
    in_mask_vox = vox_coords[best_idx]

    centroids_data["glasser"][str(lbl)] = {
        "mean_mm": [round(float(x), 2) for x in mean_mm],
        "in_mask_mm": [round(float(x), 2) for x in in_mask_mm],
        "in_mask_vox": [int(x) for x in in_mask_vox]
    }
print(f"Computed {len(centroids_data['glasser'])} Glasser centroids.")

# 2. Brainnetome Centroids
bna_path = Path("public/neurovision/atlases/brainnetome.nii.gz")
img_b = nib.load(bna_path)
b_data = img_b.get_fdata().astype(int)
b_aff = img_b.affine

centroids_data["brainnetome"] = {}
print("Computing centroids for Brainnetome (246 labels)...")
for lbl in range(1, 247):
    mask = (b_data == lbl)
    vox_coords = np.argwhere(mask)
    if len(vox_coords) == 0:
        print(f"Warning: BNA label {lbl} has 0 voxels!")
        continue
    mm_coords = nib.affines.apply_affine(b_aff, vox_coords)
    mean_mm = mm_coords.mean(axis=0)

    dists = np.linalg.norm(mm_coords - mean_mm, axis=1)
    best_idx = np.argmin(dists)
    in_mask_mm = mm_coords[best_idx]
    in_mask_vox = vox_coords[best_idx]

    centroids_data["brainnetome"][str(lbl)] = {
        "mean_mm": [round(float(x), 2) for x in mean_mm],
        "in_mask_mm": [round(float(x), 2) for x in in_mask_mm],
        "in_mask_vox": [int(x) for x in in_mask_vox]
    }
print(f"Computed {len(centroids_data['brainnetome'])} Brainnetome centroids.")

with open(CENTROIDS_PATH, "w", encoding="utf-8") as f:
    json.dump(centroids_data, f, indent=2)
print("Updated public/neurovision/data/centroids.json successfully!")
