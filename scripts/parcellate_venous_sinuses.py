"""
Parcellate VENAT 7T QSM Venous Atlas into 8 distinct major anatomical sinuses/veins
and update NIfTI volume, labels sidecar, colormap, centroids, and ontology.
"""

import json
import os
import nibabel as nib
import numpy as np

WORKSPACE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ATLAS_DIR = os.path.join(WORKSPACE, "public", "neurovision", "atlases")
DATA_DIR = os.path.join(WORKSPACE, "public", "neurovision", "data")
COLORMAP_DIR = os.path.join(DATA_DIR, "colormaps")

VENOUS_NII = os.path.join(ATLAS_DIR, "venous.nii.gz")
VENOUS_LABELS = os.path.join(ATLAS_DIR, "venous.labels.json")
VENOUS_COLORMAP = os.path.join(COLORMAP_DIR, "venous.json")
ONTOLOGY_PATH = os.path.join(DATA_DIR, "neuro_ontology.json")
CENTROIDS_PATH = os.path.join(DATA_DIR, "centroids.json")

# 1. Load current venous volume
img = nib.load(VENOUS_NII)
data = img.get_fdata().astype(np.uint8)
affine = img.affine

i, j, k = np.indices(data.shape)
coords = np.stack([i, j, k, np.ones_like(i)], axis=-1)
coords_mm = np.einsum('ij,...j->...i', affine, coords)
x_mm = coords_mm[..., 0]
y_mm = coords_mm[..., 1]
z_mm = coords_mm[..., 2]

v = (data > 0)
print(f"Total non-zero venous voxels: {np.count_nonzero(v)}")

out_labels = np.zeros_like(data, dtype=np.uint8)

# 1. Torcular / Confluence of sinuses (y <= -72, -10 <= z <= 18, |x| <= 14)
torcular = v & (y_mm <= -72) & (z_mm >= -10) & (z_mm <= 18) & (np.abs(x_mm) <= 14)
out_labels[torcular] = 3

# 2. Straight Sinus (|x| <= 8, -72 < y <= -25, 0 <= z <= 26)
straight = v & (out_labels == 0) & (np.abs(x_mm) <= 8) & (y_mm > -72) & (y_mm <= -25) & (z_mm >= 0) & (z_mm <= 26)
out_labels[straight] = 2

# 3. Deep cerebral veins (|x| <= 14, -36 <= y <= 8, -4 <= z <= 20)
deep = v & (out_labels == 0) & (np.abs(x_mm) <= 14) & (y_mm > -36) & (y_mm <= 8) & (z_mm >= -4) & (z_mm <= 20)
out_labels[deep] = 8

# 4. Transverse Sinuses
trans_l = v & (out_labels == 0) & (x_mm < -10) & (y_mm <= -45) & (z_mm >= -15) & (z_mm <= 18)
out_labels[trans_l] = 4
trans_r = v & (out_labels == 0) & (x_mm > 10) & (y_mm <= -45) & (z_mm >= -15) & (z_mm <= 18)
out_labels[trans_r] = 5

# 5. Sigmoid Sinuses
sig_l = v & (out_labels == 0) & (x_mm < -15) & (y_mm >= -60) & (y_mm <= -15) & (z_mm < -10)
out_labels[sig_l] = 6
sig_r = v & (out_labels == 0) & (x_mm > 15) & (y_mm >= -60) & (y_mm <= -15) & (z_mm < -10)
out_labels[sig_r] = 7

# 6. Superior Sagittal Sinus (|x| <= 20, z >= 22)
sss = v & (out_labels == 0) & (np.abs(x_mm) <= 20) & (z_mm >= 22)
out_labels[sss] = 1

# Note: Any remaining diffuse micro-vessels remain 0 (background) to keep the 8 sinuses crisp and high-contrast!

# Save parcellated volume
out_img = nib.Nifti1Image(out_labels, affine, img.header)
out_img.set_data_dtype(np.uint8)
nib.save(out_img, VENOUS_NII)
print(f"Saved parcellated venous atlas -> {VENOUS_NII} with {np.count_nonzero(out_labels > 0)} sinus voxels")

# 2. Venous Sinus Metadata (8 distinct sinuses with vibrant high-contrast palette)
SINUS_DEFS = [
    {
        "id": 1,
        "code": "VEN_SSS",
        "name_vi": "Xoang dọc trên (Superior Sagittal Sinus)",
        "name_en": "Superior Sagittal Sinus",
        "color": [0, 230, 230, 255], # Bright Cyan
        "desc_vi": "Xoang tĩnh mạch lớn nhất màng cứng chạy dọc bờ trên liềm não từ mào gà qua đỉnh vòm sọ ra ụ chẩm trong.",
        "syndrome": "Huyết khối xoang dọc trên (SSS Thrombosis): Nhức đầu tăng dần, tăng áp lực nội sọ, phù gai thị, phù não và xuất huyết thùy trán - đỉnh hai bên, co giật cục bộ hoặc toàn thể."
    },
    {
        "id": 2,
        "code": "VEN_SS",
        "name_vi": "Xoang thẳng (Straight Sinus)",
        "name_en": "Straight Sinus",
        "color": [255, 0, 255, 255], # Vivid Magenta / Purple
        "desc_vi": "Xoang tĩnh mạch nằm ở đường nối giữa liềm não và lều tiểu não, nhận máu từ tĩnh mạch não lớn (Galen) và xoang dọc dưới.",
        "syndrome": "Huyết khối xoang thẳng: Rối loạn tri giác nhanh chóng tiến triển thành hôn mê, phù hoặc nhồi máu xuất huyết đồi thị hai bên, tiên lượng nặng."
    },
    {
        "id": 3,
        "code": "VEN_TORCULAR",
        "name_vi": "Hội lưu các xoang (Confluence of Sinuses / Torcular)",
        "name_en": "Confluence of Sinuses (Torcular Herophili)",
        "color": [255, 25, 40, 255], # Bright Crimson Red
        "desc_vi": "Ngã tư hội lưu xoang nằm ở mặt trong xương chẩm, nơi gặp nhau của xoang dọc trên, xoang thẳng, xoang chẩm và hai xoang ngang.",
        "syndrome": "Huyết khối hội lưu xoang: Tắc nghẽn đường thoát máu tĩnh mạch toàn bộ não bộ sau, tăng áp lực nội sọ kịch phát, nguy cơ xuất huyết tiểu não và chẩm cao."
    },
    {
        "id": 4,
        "code": "VEN_L_TS",
        "name_vi": "Xoang ngang Trái (Left Transverse Sinus)",
        "name_en": "Left Transverse Sinus",
        "color": [0, 60, 255, 255], # Deep Royal Blue
        "desc_vi": "Chạy ngang theo rãnh xoang ngang xương chẩm bên trái dọc bờ sau lều tiểu não. Thường có hiện tượng thiểu sản sinh lý (hypoplasia).",
        "syndrome": "Huyết khối xoang ngang trái: Đau đầu vùng chẩm - thái dương trái, đau sau tai, ù tai dạng mạch đập (pulsatile tinnitus), cần phân biệt với thiểu sản bẩm sinh."
    },
    {
        "id": 5,
        "code": "VEN_R_TS",
        "name_vi": "Xoang ngang Phải (Right Transverse Sinus)",
        "name_en": "Right Transverse Sinus",
        "color": [30, 160, 255, 255], # Vivid Sky Blue
        "desc_vi": "Xoang ngang bên phải, thường là xoang ưu thế (dominant sinus) dẫn lưu máu chính từ xoang dọc trên về tĩnh mạch cảnh trong.",
        "syndrome": "Huyết khối xoang ngang ưu thế bên phải: Gây hội chứng tăng áp lực nội sọ rầm rộ, phù gai thị nặng nề, phù não thùy thái dương - chẩm phải."
    },
    {
        "id": 6,
        "code": "VEN_L_SIGS",
        "name_vi": "Xoang sigma Trái (Left Sigmoid Sinus)",
        "name_en": "Left Sigmoid Sinus",
        "color": [255, 120, 0, 255], # Vivid Orange
        "desc_vi": "Phần tiếp nối hình chữ S của xoang ngang trái, uốn cong qua xương chũm và đổ vào hành tĩnh mạch cảnh trong trái.",
        "syndrome": "Huyết khối xoang sigma trái: Đau vùng xương chũm (dấu hiệu Griesinger), viêm tắc tĩnh mạch huyết khối thứ phát sau viêm tai giữa / viêm xương chũm."
    },
    {
        "id": 7,
        "code": "VEN_R_SIGS",
        "name_vi": "Xoang sigma Phải (Right Sigmoid Sinus)",
        "name_en": "Right Sigmoid Sinus",
        "color": [255, 220, 0, 255], # Bright Gold / Yellow
        "desc_vi": "Xoang sigma bên phải uốn qua rãnh sigma xương chũm phải đổ vào lỗ tĩnh mạch cảnh phải.",
        "syndrome": "Huyết khối xoang sigma phải: Đau sau tai phải, hội chứng lỗ tĩnh mạch cảnh (liệt dây IX, X, XI nếu lan xuống hành tĩnh mạch cảnh)."
    },
    {
        "id": 8,
        "code": "VEN_DEEP",
        "name_vi": "Tĩnh mạch não trong & Tĩnh mạch Galen (Deep Veins)",
        "name_en": "Deep Cerebral Veins & Great Vein of Galen",
        "color": [0, 255, 60, 255], # Bright Lime / Spring Green
        "desc_vi": "Hệ tĩnh mạch sâu nằm ở mái não thất ba, gồm 2 tĩnh mạch não trong hợp lại thành tĩnh mạch Galen, dẫn lưu máu từ đồi thị và nhân nền.",
        "syndrome": "Huyết khối hệ tĩnh mạch sâu (Deep Cerebral Venous Thrombosis): Hội chứng tổn thương đồi thị - hạch nền song phương, lú lẫn, hôn mê, mất trí nhớ cấp, tiên lượng xấu."
    }
]

# 3. Write venous.labels.json
labels_sidecar = {
    "atlas": "venous",
    "space": "MNI152NLin2009cAsym",
    "source": "VENAT 7T QSM (Bazin et al., Figshare CC BY 4.0; doi:10.6084/m9.figshare.7205960)",
    "description": "Anatomically parcellated cerebral venous sinuses (8 distinct major compartments)",
    "review_status": "unreviewed",
    "labels": [
        {
            "index": s["id"],
            "code": s["code"],
            "name": s["name_en"],
            "name_vi": s["name_vi"],
            "source": "VENAT 7T QSM & Neuroanatomy",
            "review_status": "unreviewed"
        }
        for s in SINUS_DEFS
    ]
}
with open(VENOUS_LABELS, "w", encoding="utf-8") as f:
    json.dump(labels_sidecar, f, indent=2, ensure_ascii=False)
print(f"Saved labels sidecar -> {VENOUS_LABELS}")

# 4. Write venous.json Colormap
R_list = [0] + [s["color"][0] for s in SINUS_DEFS]
G_list = [0] + [s["color"][1] for s in SINUS_DEFS]
B_list = [0] + [s["color"][2] for s in SINUS_DEFS]
A_list = [0] + [s["color"][3] for s in SINUS_DEFS]
I_list = [0] + [s["id"] for s in SINUS_DEFS]
label_names = ["Background"] + [s["name_vi"] for s in SINUS_DEFS]

colormap_obj = {
    "R": R_list,
    "G": G_list,
    "B": B_list,
    "A": A_list,
    "I": I_list,
    "labels": label_names
}
with open(VENOUS_COLORMAP, "w", encoding="utf-8") as f:
    json.dump(colormap_obj, f, indent=2, ensure_ascii=False)
print(f"Saved NiiVue colormap -> {VENOUS_COLORMAP}")

# 5. Update neuro_ontology.json
with open(ONTOLOGY_PATH, encoding="utf-8") as f:
    onto_data = json.load(f)

# Remove old venous entries
entries = [e for e in onto_data["entries"] if e.get("atlas") != "venous"]

for s in SINUS_DEFS:
    entry = {
        "atlas": "venous",
        "label_id": s["id"],
        "code": s["code"],
        "name_vi": s["name_vi"],
        "name_en": s["name_en"],
        "category": "vascular_territory",
        "brodmann_area": [],
        "functions": [
            s["desc_vi"],
            "Dẫn lưu máu nghèo oxy từ vỏ não và nhân xám sâu về tĩnh mạch cảnh trong.",
            "Tham gia điều hòa áp lực nội sọ và tái hấp thu dịch não tủy qua các hạt màng nhện."
        ],
        "arterial_supply": {
            "primary": [],
            "perforators": []
        },
        "venous_drainage": [s["name_en"]],
        "aspects_zone": None,
        "clinical_syndromes": [
            {
                "name": "Huyết khối xoang tĩnh mạch não (CVST)",
                "description": s["syndrome"]
            }
        ],
        "evidence_level": "approximate",
        "source": [
            "VENAT 7T QSM (Bazin et al., 2020; doi:10.6084/m9.figshare.7205960)",
            "AHA/ASA Scientific Statement: Diagnosis and Management of Cerebral Venous Thrombosis (Saposnik 2011)"
        ],
        "review_status": "unreviewed"
    }
    entries.append(entry)

onto_data["entries"] = entries
with open(ONTOLOGY_PATH, "w", encoding="utf-8") as f:
    json.dump(onto_data, f, indent=2, ensure_ascii=False)
print(f"Updated neuro_ontology.json with 8 venous entries (Total: {len(entries)} entries)")

# 6. Recompute Centroids for venous
with open(CENTROIDS_PATH, encoding="utf-8") as f:
    centroids_data = json.load(f)

centroids_data["venous"] = {}
for s in SINUS_DEFS:
    lbl = s["id"]
    mask = (out_labels == lbl)
    vox_coords = np.argwhere(mask)
    if len(vox_coords) == 0:
        continue
    mm_coords = nib.affines.apply_affine(affine, vox_coords)
    mean_mm = mm_coords.mean(axis=0)

    dists = np.linalg.norm(mm_coords - mean_mm, axis=1)
    best_idx = np.argmin(dists)
    in_mask_mm = mm_coords[best_idx]
    in_mask_vox = vox_coords[best_idx]

    centroids_data["venous"][str(lbl)] = {
        "mean_mm": [round(float(x), 2) for x in mean_mm],
        "in_mask_mm": [round(float(x), 2) for x in in_mask_mm],
        "in_mask_vox": [int(x) for x in in_mask_vox]
    }

with open(CENTROIDS_PATH, "w", encoding="utf-8") as f:
    json.dump(centroids_data, f, indent=2)
print("Updated centroids.json for 8 venous sinuses")

print("\nALL 8 VENOUS SINUSES PARCELLATION COMPLETE!")
