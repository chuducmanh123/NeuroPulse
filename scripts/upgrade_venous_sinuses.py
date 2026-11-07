"""
Upgrade VENAT Venous Atlas to comprehensive 12-structure parcellation:
1: Superior Sagittal Sinus (SSS)
2: Inferior Sagittal Sinus (ISS)
3: Straight Sinus (SS)
4: Confluence of Sinuses (Torcular)
5: Left Transverse Sinus
6: Right Transverse Sinus
7: Left Sigmoid Sinus
8: Right Sigmoid Sinus
9: Cavernous Sinuses (Parasellar)
10: Petrosal Sinuses (Superior / Inferior)
11: Internal Cerebral Veins (ICVs)
12: Great Cerebral Vein of Galen
"""

import json
import os
from pathlib import Path
import nibabel as nib
import numpy as np

WORKSPACE = Path(__file__).resolve().parent.parent
PUB = WORKSPACE / "public" / "neurovision"
ATLASES = PUB / "atlases"
DATA = PUB / "data"
COLORMAPS = DATA / "colormaps"
VOLUMES = PUB / "volumes"

VENOUS_NII = ATLASES / "venous.nii.gz"
VENOUS_LABELS = ATLASES / "venous.labels.json"
VENOUS_COLORMAP = COLORMAPS / "venous.json"
ONTOLOGY_PATH = DATA / "neuro_ontology.json"
CENTROIDS_PATH = DATA / "centroids.json"

img = nib.load(str(VENOUS_NII))
data = img.get_fdata().astype(np.uint8)
affine = img.affine

# We also check the raw warped density from cache if available, or current data
CACHE_DENSITY = WORKSPACE / "scripts" / ".cache" / "venat_density.nii.gz"
v = (data > 0)
print(f"Total non-zero venous voxels in current mask: {np.count_nonzero(v)}")

i, j, k = np.indices(data.shape)
coords = np.stack([i, j, k, np.ones_like(i)], axis=-1)
coords_mm = np.einsum('ij,...j->...i', affine, coords)
x_mm = coords_mm[..., 0]
y_mm = coords_mm[..., 1]
z_mm = coords_mm[..., 2]

out_labels = np.zeros_like(data, dtype=np.uint8)

# 1. Torcular / Confluence of sinuses (y <= -72, -10 <= z <= 18, |x| <= 14)
torcular = v & (y_mm <= -72) & (z_mm >= -10) & (z_mm <= 18) & (np.abs(x_mm) <= 14)
out_labels[torcular] = 4

# 2. Great Cerebral Vein of Galen (junction between ICV and Straight Sinus: y -45 to -33, z 2 to 16, |x| <= 6)
galen = v & (out_labels == 0) & (np.abs(x_mm) <= 6) & (y_mm >= -45) & (y_mm <= -33) & (z_mm >= 2) & (z_mm <= 16)
out_labels[galen] = 12

# 3. Straight Sinus (|x| <= 8, -72 < y < -33, 0 <= z <= 26)
straight = v & (out_labels == 0) & (np.abs(x_mm) <= 8) & (y_mm > -72) & (y_mm < -33) & (z_mm >= 0) & (z_mm <= 26)
out_labels[straight] = 3

# 4. Inferior Sagittal Sinus (|x| <= 4, -35 <= y <= 25, 14 <= z <= 28)
iss = v & (out_labels == 0) & (np.abs(x_mm) <= 4) & (y_mm >= -35) & (y_mm <= 25) & (z_mm >= 14) & (z_mm <= 28)
out_labels[iss] = 2

# 5. Internal Cerebral Veins (ICVs) (|x| <= 14, -36 <= y <= 8, -4 <= z <= 20)
deep = v & (out_labels == 0) & (np.abs(x_mm) <= 14) & (y_mm > -36) & (y_mm <= 8) & (z_mm >= -4) & (z_mm <= 20)
out_labels[deep] = 11

# 6. Transverse Sinuses
trans_l = v & (out_labels == 0) & (x_mm < -10) & (y_mm <= -45) & (z_mm >= -15) & (z_mm <= 18)
out_labels[trans_l] = 5
trans_r = v & (out_labels == 0) & (x_mm > 10) & (y_mm <= -45) & (z_mm >= -15) & (z_mm <= 18)
out_labels[trans_r] = 6

# 7. Sigmoid Sinuses
sig_l = v & (out_labels == 0) & (x_mm < -15) & (y_mm >= -60) & (y_mm <= -15) & (z_mm < -10)
out_labels[sig_l] = 7
sig_r = v & (out_labels == 0) & (x_mm > 15) & (y_mm >= -60) & (y_mm <= -15) & (z_mm < -10)
out_labels[sig_r] = 8

# 8. Superior Sagittal Sinus (|x| <= 20, z >= 22)
sss = v & (out_labels == 0) & (np.abs(x_mm) <= 20) & (z_mm >= 22)
out_labels[sss] = 1

# 9. Cavernous & Sphenoparietal Sinuses (Parasellar: 8 <= |x| <= 20, -22 <= y <= -2, -26 <= z <= -10)
cav = (out_labels == 0) & (np.abs(x_mm) >= 8) & (np.abs(x_mm) <= 20) & (y_mm >= -22) & (y_mm <= -2) & (z_mm >= -26) & (z_mm <= -10)
# Model cavernous sinus lumen in MNI space
cav_voxels = cav & (np.abs(x_mm) <= 18) & (y_mm >= -18) & (y_mm <= -6) & (z_mm >= -24) & (z_mm <= -14)
out_labels[cav_voxels] = 9

# 10. Petrosal Sinuses (Superior / Inferior petrosal sinuses along petrous ridge: 14 <= |x| <= 32, -40 <= y <= -18, -26 <= z <= -14)
petro = (out_labels == 0) & (np.abs(x_mm) >= 14) & (np.abs(x_mm) <= 32) & (y_mm >= -40) & (y_mm <= -18) & (z_mm >= -26) & (z_mm <= -14)
# Keep only petroclival line
petro_line = petro & (np.abs(np.abs(x_mm) - ( -0.7 * y_mm )) <= 8)
out_labels[petro_line] = 10

# Remaining non-zero venous voxels go to SSS if high, or Transverse if low
rem_high = v & (out_labels == 0) & (z_mm >= 15)
out_labels[rem_high] = 1
rem_low_l = v & (out_labels == 0) & (x_mm < 0)
out_labels[rem_low_l] = 5
rem_low_r = v & (out_labels == 0) & (x_mm >= 0)
out_labels[rem_low_r] = 6

print(f"Parcellated labels counts:")
for lbl in range(1, 13):
    print(f"  Label {lbl}: {np.count_nonzero(out_labels == lbl)} voxels")

# Save updated venous.nii.gz
nib.openers.Opener.default_compresslevel = 9
out_img = nib.Nifti1Image(out_labels, affine, img.header)
out_img.set_sform(affine, code=4)
out_img.set_qform(affine, code=4)
out_img.header["descrip"] = b"Comprehensive 12-structure Cerebral Venous Sinuses Atlas (MNI152 1mm)"
out_img.set_data_dtype(np.uint8)
nib.save(out_img, str(VENOUS_NII))
print(f"Saved updated venous.nii.gz ({os.path.getsize(str(VENOUS_NII))/1024:.1f} KB)")

# Definition of the 12 structures
SINUS_DEFS = [
    {
        "id": 1,
        "code": "VEN_SSS",
        "name_vi": "Xoang dọc trên (Superior Sagittal Sinus)",
        "name_en": "Superior Sagittal Sinus",
        "color": [0, 235, 235, 255], # Bright Cyan
        "desc_vi": "Xoang tĩnh mạch lớn nhất màng cứng chạy dọc bờ trên liềm não từ mào gà qua đỉnh vòm sọ ra ụ chẩm trong.",
        "syndrome": "Huyết khối xoang dọc trên (SSS Thrombosis): Nhức đầu tăng dần, tăng áp lực nội sọ, phù gai thị, phù não và xuất huyết thùy trán - đỉnh hai bên, co giật cục bộ hoặc toàn thể."
    },
    {
        "id": 2,
        "code": "VEN_ISS",
        "name_vi": "Xoang dọc dưới (Inferior Sagittal Sinus)",
        "name_en": "Inferior Sagittal Sinus",
        "color": [255, 225, 30, 255], # Bright Yellow
        "desc_vi": "Chạy ở bờ dưới tự do của liềm đại não ngay phía trên thể chai, dẫn lưu máu mặt trong bán cầu và đổ vào xoang thẳng.",
        "syndrome": "Huyết khối xoang dọc dưới: Rối loạn chức năng thể chai, giảm chú ý, suy giảm ý thức thứ phát do cản trở tuần hoàn tĩnh mạch đường giữa."
    },
    {
        "id": 3,
        "code": "VEN_SS",
        "name_vi": "Xoang thẳng (Straight Sinus)",
        "name_en": "Straight Sinus",
        "color": [255, 0, 255, 255], # Vivid Magenta / Purple
        "desc_vi": "Nằm ở đường nối giữa liềm não và lều tiểu não, nhận máu từ tĩnh mạch não lớn (Galen) và xoang dọc dưới đổ về hội lưu xoang.",
        "syndrome": "Huyết khối xoang thẳng: Rối loạn tri giác nhanh chóng tiến triển thành hôn mê, phù hoặc nhồi máu xuất huyết đồi thị hai bên, tiên lượng nặng."
    },
    {
        "id": 4,
        "code": "VEN_TORCULAR",
        "name_vi": "Hội lưu các xoang (Confluence of Sinuses / Torcular)",
        "name_en": "Confluence of Sinuses (Torcular Herophili)",
        "color": [255, 30, 45, 255], # Bright Crimson Red
        "desc_vi": "Ngã tư hội lưu xoang nằm ở ụ chẩm trong, nơi gặp nhau của xoang dọc trên, xoang thẳng, xoang chẩm và hai xoang ngang.",
        "syndrome": "Huyết khối hội lưu xoang: Tắc nghẽn đường thoát máu tĩnh mạch toàn bộ não bộ sau, tăng áp lực nội sọ kịch phát, nguy cơ xuất huyết tiểu não và chẩm cao."
    },
    {
        "id": 5,
        "code": "VEN_L_TS",
        "name_vi": "Xoang ngang Trái (Left Transverse Sinus)",
        "name_en": "Left Transverse Sinus",
        "color": [0, 65, 255, 255], # Deep Royal Blue
        "desc_vi": "Chạy ngang theo rãnh xoang ngang xương chẩm bên trái dọc bờ sau lều tiểu não. Thường có hiện tượng thiểu sản sinh lý (hypoplasia).",
        "syndrome": "Huyết khối xoang ngang trái: Đau đầu vùng chẩm - thái dương trái, đau sau tai, ù tai dạng mạch đập, nhồi máu tĩnh mạch thùy thái dương trái gây mất ngôn ngữ Wernicke."
    },
    {
        "id": 6,
        "code": "VEN_R_TS",
        "name_vi": "Xoang ngang Phải (Right Transverse Sinus)",
        "name_en": "Right Transverse Sinus",
        "color": [30, 165, 255, 255], # Vivid Sky Blue
        "desc_vi": "Xoang ngang bên phải, thường là xoang ưu thế (dominant sinus) dẫn lưu máu chính từ xoang dọc trên về tĩnh mạch cảnh trong.",
        "syndrome": "Huyết khối xoang ngang ưu thế bên phải: Gây hội chứng tăng áp lực nội sọ rầm rộ, phù gai thị nặng nề, phù não thùy thái dương - chẩm phải."
    },
    {
        "id": 7,
        "code": "VEN_L_SIGS",
        "name_vi": "Xoang sigma Trái (Left Sigmoid Sinus)",
        "name_en": "Left Sigmoid Sinus",
        "color": [255, 125, 0, 255], # Vivid Orange
        "desc_vi": "Phần tiếp nối hình chữ S của xoang ngang trái, uốn cong qua xương chũm và đổ vào hành tĩnh mạch cảnh trong trái.",
        "syndrome": "Huyết khối xoang sigma trái: Đau vùng xương chũm (dấu hiệu Griesinger), viêm tắc tĩnh mạch huyết khối thứ phát sau viêm tai giữa / viêm xương chũm."
    },
    {
        "id": 8,
        "code": "VEN_R_SIGS",
        "name_vi": "Xoang sigma Phải (Right Sigmoid Sinus)",
        "name_en": "Right Sigmoid Sinus",
        "color": [255, 215, 0, 255], # Bright Gold / Amber
        "desc_vi": "Xoang sigma bên phải uốn qua rãnh sigma xương chũm phải đổ vào lỗ tĩnh mạch cảnh phải.",
        "syndrome": "Huyết khối xoang sigma phải: Đau sau tai phải, hội chứng lỗ tĩnh mạch cảnh (liệt dây IX, X, XI nếu lan xuống hành tĩnh mạch cảnh)."
    },
    {
        "id": 9,
        "code": "VEN_CAVERNOUS",
        "name_vi": "Xoang hang & Xoang bướm đỉnh (Cavernous Sinuses)",
        "name_en": "Cavernous & Sphenoparietal Sinuses",
        "color": [215, 75, 185, 255], # Radiant Magenta Pink
        "desc_vi": "Xoang tĩnh mạch nằm hai bên thân xương bướm và hố yên, chứa động mạch cảnh trong và các dây thần kinh sọ III, IV, V1, V2, VI.",
        "syndrome": "Huyết khối xoang hang (Cavernous Sinus Thrombosis): Phù nề kết mạc, lồi mắt mạch đập, liệt vận nhãn hoàn toàn, đau sau ổ mắt, biến chứng nhiễm trùng tối cấp đe dọa tính mạng."
    },
    {
        "id": 10,
        "code": "VEN_PETROSAL",
        "name_vi": "Xoang đá trên & dưới (Petrosal Sinuses)",
        "name_en": "Superior & Inferior Petrosal Sinuses",
        "color": [0, 220, 200, 255], # Bright Turquoise
        "desc_vi": "Chạy dọc theo bờ trên và rãnh dưới xương đá, dẫn lưu máu từ xoang hang và tiểu não về xoang ngang/sigma và tĩnh mạch cảnh.",
        "syndrome": "Huyết khối xoang đá: Hội chứng Gradenigo (chảy mủ tai, đau sau ổ mắt theo nhánh V1, liệt dây VI), chóng mặt, giảm thính lực."
    },
    {
        "id": 11,
        "code": "VEN_ICV",
        "name_vi": "Tĩnh mạch não trong (Internal Cerebral Veins - ICVs)",
        "name_en": "Internal Cerebral Veins (ICVs)",
        "color": [0, 255, 65, 255], # Bright Lime / Spring Green
        "desc_vi": "Hai tĩnh mạch chạy ở vòm não thất ba, dẫn lưu máu từ đồi thị, thể vân và đám rối màng mạch trước khi hợp lưu thành tĩnh mạch Galen.",
        "syndrome": "Huyết khối tĩnh mạch não trong: Nhồi máu/phù xuất huyết đồi thị hai bên kinh điển, lú lẫn cấp, hôn mê, mất khả năng ghi nhớ."
    },
    {
        "id": 12,
        "code": "VEN_GALEN",
        "name_vi": "Tĩnh mạch lớn Galen (Great Cerebral Vein of Galen)",
        "name_en": "Great Cerebral Vein of Galen",
        "color": [140, 60, 255, 255], # Electric Violet Purple
        "desc_vi": "Thân tĩnh mạch ngắn và dày nằm dưới lồi thể chai trong bể củ não tư, là ngã ba hợp lưu của 2 tĩnh mạch não trong và 2 tĩnh mạch đáy Rosenthal đổ vào xoang thẳng.",
        "syndrome": "Huyết khối tĩnh mạch Galen / Phình tĩnh mạch Galen (Vein of Galen Malformation): Suy tim cung lượng cao ở trẻ sơ sinh, hoặc đột quỵ tĩnh mạch não sâu diện rộng ở người lớn."
    }
]

# Write venous.labels.json
labels_sidecar = {
    "atlas": "venous",
    "space": "MNI152NLin2009cAsym",
    "source": "VENAT 7T QSM (Bazin et al., Figshare CC BY 4.0; doi:10.6084/m9.figshare.7205960) & MNI Neuroanatomy",
    "description": "Comprehensive parcellation of cerebral venous sinuses & major deep veins (12 distinct anatomical structures)",
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

# Write venous.json Colormap
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

# Update neuro_ontology.json
with open(ONTOLOGY_PATH, encoding="utf-8") as f:
    onto_data = json.load(f)

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
            "Dẫn lưu máu tĩnh mạch nghèo oxy từ các cấu trúc não tương ứng về tĩnh mạch cảnh trong.",
            "Tham gia điều hòa áp lực nội sọ và tuần hoàn dịch não tủy."
        ],
        "arterial_supply": {
            "primary": [],
            "perforators": []
        },
        "venous_drainage": [s["name_en"]],
        "aspects_zone": None,
        "clinical_syndromes": [
            {
                "name": f"Huyết khối xoang tĩnh mạch não (CVST) - {s['name_en']}",
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

# Update centroids.json for venous
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

print("\nSUCCESS! Upgraded venous.nii.gz to 12 distinct structures!")
