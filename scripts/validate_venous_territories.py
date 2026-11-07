"""
Render Axial slices of venous_territories.nii.gz on top of T1.nii.gz
matching Craig Hacking's 8 Radiopaedia slices.
"""

import json
from pathlib import Path
import nibabel as nib
import numpy as np
import matplotlib.pyplot as plt

WORKSPACE = Path(__file__).resolve().parent.parent
PUB = WORKSPACE / "public" / "neurovision"
VAL_DIR = PUB / "validation"
VAL_DIR.mkdir(parents=True, exist_ok=True)

T1_PATH = PUB / "volumes" / "T1.nii.gz"
TERR_PATH = PUB / "atlases" / "venous_territories.nii.gz"
COLORMAP_PATH = PUB / "data" / "colormaps" / "venous_territories.json"

t1_img = nib.load(str(T1_PATH))
t1_data = t1_img.get_fdata()
affine = t1_img.affine

terr_img = nib.load(str(TERR_PATH))
terr_data = terr_img.get_fdata().astype(np.uint8)

with open(COLORMAP_PATH, encoding="utf-8") as f:
    cmap_json = json.load(f)

# Build RGBA colormap lookup
max_label = max(cmap_json["I"])
rgba_lut = np.zeros((max_label + 1, 4), dtype=np.float32)
for idx, r, g, b, a in zip(cmap_json["I"], cmap_json["R"], cmap_json["G"], cmap_json["B"], cmap_json["A"]):
    if idx == 0:
        continue
    rgba_lut[idx] = [r / 255.0, g / 255.0, b / 255.0, 0.55] # 55% opacity for overlay

# 8 slice z_mm levels
SLICE_LEVELS = [
    (-38, "1. Hố sau thấp: Hành não & Tiểu não dưới (Sigmoid/Petrosal vs Transverse)"),
    (-22, "2. Cầu não & Não thất IV & Cực thái dương (SMCV vs Petrosal vs Transverse)"),
    (-10, "3. Trung não & Hồi hải mã (Rosenthal / Galen / Labbé / SMCV)"),
    (10, "4. Đồi thị & Hạch nền (Tĩnh mạch não sâu / Xoang thẳng vs SSS vs Sylvian vs Labbé)"),
    (24, "5. Thân não thất bên & Thể chai (Xoang dọc dưới - ISS vs Tĩnh mạch sâu vs SSS)"),
    (34, "6. Trần não thất & Vỏ não vận động cảm giác (Trolard vs ISS vs SSS)"),
    (44, "7. Trung tâm bán bầu dục (Centrum Semiovale - SSS vs Lõi sâu Straight)"),
    (58, "8. Đỉnh não (Vertex - 100% Xoang dọc trên SSS & Tĩnh mạch Trolard)")
]

# Coordinate mapping from mm to voxel index
# z_vox = round((z_mm - affine[2, 3]) / affine[2, 2])
fig, axes = plt.subplots(2, 4, figsize=(22, 12), facecolor="#0f172a")
plt.subplots_adjust(wspace=0.08, hspace=0.18, left=0.03, right=0.97, top=0.93, bottom=0.04)

fig.suptitle("NeuroVision - Brain Venous Vascular Territories Atlas (Craig Hacking Radiopaedia 2020 CC-BY-SA-NC)",
             fontsize=17, fontweight="bold", color="#f8fafc")

for ax_idx, (z_mm, title) in enumerate(SLICE_LEVELS):
    row = ax_idx // 4
    col = ax_idx % 4
    ax = axes[row, col]

    z_vox = int(np.clip(round((z_mm - affine[2, 3]) / affine[2, 2]), 0, t1_data.shape[2] - 1))

    t1_slice = np.rot90(t1_data[:, :, z_vox])
    terr_slice = np.rot90(terr_data[:, :, z_vox])

    # Normalize T1 slice for grayscale background
    t1_norm = (t1_slice - t1_slice.min()) / (t1_slice.max() - t1_slice.min() + 1e-6)

    # Convert terr labels to RGBA
    overlay_rgba = rgba_lut[terr_slice]

    ax.imshow(t1_norm, cmap="gray", origin="upper")
    ax.imshow(overlay_rgba, origin="upper")

    ax.set_title(f"Z = {z_mm:+d} mm\n{title}", fontsize=10, color="#38bdf8", fontweight="semibold")
    ax.axis("off")

out_png = VAL_DIR / "venous_territories_8slices.png"
plt.savefig(str(out_png), dpi=150, facecolor=fig.get_facecolor(), edgecolor="none")
plt.close()
print(f"Validation figure saved -> {out_png}")
