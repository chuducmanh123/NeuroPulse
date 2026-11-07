"""
Build 100% Brain Parenchyma Venous Drainage Vascular Territories Atlas (MNI152 Space)
Accurately matching Craig Hacking's (Radiopaedia 2020 CC-BY-SA-NC) 8 axial slice continuum.

Output Files:
- public/neurovision/atlases/venous_territories.nii.gz (100% brainmask coverage, uint8)
- public/neurovision/atlases/venous_territories.labels.json
- public/neurovision/data/colormaps/venous_territories.json
- updates public/neurovision/data/neuro_ontology.json
- updates public/neurovision/data/centroids.json
"""

import json
import os
from pathlib import Path
import nibabel as nib
import numpy as np
from scipy.ndimage import distance_transform_edt

WORKSPACE = Path(__file__).resolve().parent.parent
PUB = WORKSPACE / "public" / "neurovision"
ATLASES = PUB / "atlases"
DATA = PUB / "data"
COLORMAPS = DATA / "colormaps"
VOLUMES = PUB / "volumes"

BRAINMASK_PATH = VOLUMES / "brainmask.nii.gz"
AAL3_PATH = ATLASES / "aal3.nii.gz"
WM_PATH = ATLASES / "whitematter.nii.gz"

OUT_NII = ATLASES / "venous_territories.nii.gz"
OUT_LABELS = ATLASES / "venous_territories.labels.json"
OUT_COLORMAP = COLORMAPS / "venous_territories.json"
ONTOLOGY_PATH = DATA / "neuro_ontology.json"
CENTROIDS_PATH = DATA / "centroids.json"

print("1. Loading source volumes (brainmask, AAL3, JHU Whitematter)...")
bm_img = nib.load(str(BRAINMASK_PATH))
bm_data = bm_img.get_fdata() > 0
affine = bm_img.affine

aal_img = nib.load(str(AAL3_PATH))
aal_data = np.round(aal_img.get_fdata()).astype(np.int32)

wm_img = nib.load(str(WM_PATH))
wm_data = np.round(wm_img.get_fdata()).astype(np.int32)

shape = bm_data.shape
print(f"Volume shape: {shape}, total brainmask voxels: {np.count_nonzero(bm_data)}")

# Coordinates in MNI mm
i, j, k = np.indices(shape)
coords = np.stack([i, j, k, np.ones_like(i)], axis=-1)
coords_mm = np.einsum('ij,...j->...i', affine, coords)
x_mm = coords_mm[..., 0]
y_mm = coords_mm[..., 1]
z_mm = coords_mm[..., 2]

# Territory Labels Definition
TERRITORIES = [
    {
        "id": 1,
        "code": "VEN_TERR_SSS_L",
        "name_vi": "Vùng Xoang dọc trên & Tĩnh mạch vỏ não (Trái)",
        "name_en": "Superior Sagittal Sinus Territory (Left)",
        "sinus": "Superior Sagittal Sinus",
        "vein": "Superior Cortical Veins / Vein of Trolard",
        "color": [235, 75, 60, 255], # Coral / Salmon Red
        "desc_vi": "Vùng nhu mô vỏ não và chất trắng dưới vỏ thùy trán - đỉnh - chẩm trên bên trái, chạy dọc cạnh đường giữa (parasagittal) lên tận đỉnh não.",
        "syndrome": "Huyết khối xoang dọc trên (SSS Thrombosis): Nhức đầu dữ dội, phù não song phương, liệt vận động 2 chân (paraparesis), co giật cục bộ hoặc toàn thể, nguy cơ xuất huyết chuyển dạng hình lưỡi liềm."
    },
    {
        "id": 2,
        "code": "VEN_TERR_SSS_R",
        "name_vi": "Vùng Xoang dọc trên & Tĩnh mạch vỏ não (Phải)",
        "name_en": "Superior Sagittal Sinus Territory (Right)",
        "sinus": "Superior Sagittal Sinus",
        "vein": "Superior Cortical Veins / Vein of Trolard",
        "color": [245, 115, 60, 255], # Vibrant Coral Orange
        "desc_vi": "Vùng nhu mô vỏ não và chất trắng dưới vỏ thùy trán - đỉnh - chẩm trên bên phải, chạy dọc cạnh đường giữa (parasagittal) lên tận đỉnh não.",
        "syndrome": "Huyết khối xoang dọc trên (SSS Thrombosis): Tăng áp lực nội sọ cấp, phù gai thị, phù nhu mô đỉnh - trán phải, động kinh vận động đối bên."
    },
    {
        "id": 3,
        "code": "VEN_TERR_ISS",
        "name_vi": "Vùng Xoang dọc dưới (Thể chai & Vòm não)",
        "name_en": "Inferior Sagittal Sinus Territory",
        "sinus": "Inferior Sagittal Sinus",
        "vein": "Anterior Cerebral Veins / Callosal & Forniceal Veins",
        "color": [250, 225, 25, 255], # Bright Yellow
        "desc_vi": "Vùng thể chai (Gối, Thân, Lồi thể chai), vòm não (Fornix), vách trong suốt và phần dưới hồi đai dọc đường giữa liềm đại não.",
        "syndrome": "Huyết khối xoang dọc dưới: Rối loạn chức năng kết nối liên bán cầu, mất chú ý, vô cảm (abulia), rối loạn trí nhớ ngắn hạn do tổn thương vòm não và thể chai."
    },
    {
        "id": 4,
        "code": "VEN_TERR_DEEP_L",
        "name_vi": "Vùng Tĩnh mạch sâu & Xoang thẳng (Trái)",
        "name_en": "Deep Cerebral Venous Territory (Left)",
        "sinus": "Straight Sinus",
        "vein": "Internal Cerebral Vein & Basal Vein of Rosenthal",
        "color": [35, 110, 235, 255], # Deep Royal Blue
        "desc_vi": "Đồi thị, thể vân (nhân bèo, nhân đuôi), bao trong, chất trắng sâu quanh não thất (corona radiata) và hồi hải mã bên trái.",
        "syndrome": "Huyết khối hệ tĩnh mạch não sâu (Deep Cerebral Venous Thrombosis - DCVT): Rối loạn tri giác nhanh chóng dẫn đến hôn mê, mất trí nhớ cấp tính, phù não hoặc xuất huyết đồi thị - hạch nền hai bên đối xứng."
    },
    {
        "id": 5,
        "code": "VEN_TERR_DEEP_R",
        "name_vi": "Vùng Tĩnh mạch sâu & Xoang thẳng (Phải)",
        "name_en": "Deep Cerebral Venous Territory (Right)",
        "sinus": "Straight Sinus",
        "vein": "Internal Cerebral Vein & Basal Vein of Rosenthal",
        "color": [70, 150, 250, 255], # Vibrant Azure Blue
        "desc_vi": "Đồi thị, thể vân (nhân bèo, nhân đuôi), bao trong, chất trắng sâu quanh não thất (corona radiata) và hồi hải mã bên phải.",
        "syndrome": "Huyết khối hệ tĩnh mạch não sâu: Hôn mê, liệt vận nhãn, phù xuất huyết đồi thị phải kèm thoát vị não trung tâm, tiên lượng rất nặng cần can thiệp tiêu sợi huyết/lấy huyết khối tĩnh mạch khẩn cấp."
    },
    {
        "id": 6,
        "code": "VEN_TERR_TS_L",
        "name_vi": "Vùng Xoang ngang & Tĩnh mạch Labbé (Trái)",
        "name_en": "Transverse Sinus / Labbé Territory (Left)",
        "sinus": "Transverse Sinus",
        "vein": "Inferior Anastomotic Vein (of Labbé)",
        "color": [40, 185, 85, 255], # Crisp Emerald Green
        "desc_vi": "Nhu mô vỏ não và chất trắng dưới vỏ thùy thái dương dưới ngoài, thùy chẩm dưới ngoài và hồi thoi bên trái.",
        "syndrome": "Huyết khối xoang ngang trái / Tĩnh mạch Labbé: Mất ngôn ngữ tiếp nhận Wernicke (aphasia), khiếm khuyết thị trường (bán manh đồng danh), co giật thái dương, nhồi máu xuất huyết thùy thái dương trái."
    },
    {
        "id": 7,
        "code": "VEN_TERR_TS_R",
        "name_vi": "Vùng Xoang ngang & Tĩnh mạch Labbé (Phải)",
        "name_en": "Transverse Sinus / Labbé Territory (Right)",
        "sinus": "Transverse Sinus",
        "vein": "Inferior Anastomotic Vein (of Labbé)",
        "color": [80, 215, 115, 255], # Vivid Mint / Apple Green
        "desc_vi": "Nhu mô vỏ não và chất trắng dưới vỏ thùy thái dương dưới ngoài, thùy chẩm dưới ngoài và hồi thoi bên phải.",
        "syndrome": "Huyết khối xoang ngang ưu thế phải / Tĩnh mạch Labbé: Tăng áp lực nội sọ nặng, đau đầu vùng chẩm - sau tai, mất nhận thức không gian (spatial neglect), nhồi máu phù não thùy thái dương phải."
    },
    {
        "id": 8,
        "code": "VEN_TERR_CAV_L",
        "name_vi": "Vùng Xoang hang / Bướm đỉnh & Tĩnh mạch Sylvian (Trái)",
        "name_en": "Cavernous Sinus / SMCV Territory (Left)",
        "sinus": "Sphenoparietal / Cavernous Sinuses",
        "vein": "Superficial Middle Cerebral (Sylvian) Vein",
        "color": [210, 75, 180, 255], # Magenta / Orchid Pink
        "desc_vi": "Cực thái dương, vỏ não quanh rãnh Sylvius, hồi trán dưới (nắp Broca), thùy đảo trước và vỏ trán ổ mắt bên trái.",
        "syndrome": "Huyết khối xoang hang / Tĩnh mạch nông giữa: Phù nề mắt, lồi mắt, liệt các dây thần kinh sọ III, IV, V1, V2, VI, kèm nhồi máu tĩnh mạch vùng cực thái dương - trán dưới trái (mất ngôn ngữ vận động Broca)."
    },
    {
        "id": 9,
        "code": "VEN_TERR_CAV_R",
        "name_vi": "Vùng Xoang hang / Bướm đỉnh & Tĩnh mạch Sylvian (Phải)",
        "name_en": "Cavernous Sinus / SMCV Territory (Right)",
        "sinus": "Sphenoparietal / Cavernous Sinuses",
        "vein": "Superficial Middle Cerebral (Sylvian) Vein",
        "color": [235, 115, 205, 255], # Radiant Pink
        "desc_vi": "Cực thái dương, vỏ não quanh rãnh Sylvius, hồi trán dưới, thùy đảo trước và vỏ trán ổ mắt bên phải.",
        "syndrome": "Huyết khối xoang hang phải / Xoang bướm đỉnh: Liệt vận nhãn hoàn toàn bên phải, đau sau hốc mắt, giảm cảm giác nhánh V1/V2, phù não thùy thái dương trước phải."
    },
    {
        "id": 10,
        "code": "VEN_TERR_INFRA_ANT",
        "name_vi": "Vùng Thân não & Tiểu não trước (Xoang đá & Xoang sigma)",
        "name_en": "Anterior Infratentorial Territory (Brainstem & Ant Cerebellum)",
        "sinus": "Sigmoid & Petrosal Sinuses",
        "vein": "Anterior (Petrosal) PCF Group",
        "color": [0, 210, 210, 255], # Electric Cyan
        "desc_vi": "Cầu não, hành não, cuống đại não và các tiểu thùy trước của tiểu não (Lobules 3, 4, 5, thùy nhung - Flocculus).",
        "syndrome": "Huyết khối xoang đá / xoang sigma trước: Liệt mặt ngoại biên, điếc tiếp nhận, chóng mặt dữ dội, thất điều tiểu não và tổn thương các đường dẫn truyền thân não dài."
    },
    {
        "id": 11,
        "code": "VEN_TERR_INFRA_POST_L",
        "name_vi": "Vùng Bán cầu Tiểu não sau (Trái)",
        "name_en": "Posterior Infratentorial Territory (Left Cerebellum)",
        "sinus": "Transverse Sinus & Torcular",
        "vein": "Posterior (Tentorial) PCF Group",
        "color": [120, 205, 75, 255], # Leaf / Lime Green
        "desc_vi": "Bán cầu tiểu não sau (Crus I, Crus II, Lobules 6, 7, 8, 9) và thùy nhộng phía sau bên trái.",
        "syndrome": "Huyết khối xoang ngang / xoang chẩm sau trái: Nhồi máu tĩnh mạch tiểu não trái, hội chứng tiểu não bán cầu (quá tầm, loạn nhịp vận động tay chân trái), nguy cơ chèn ép hành - cầu não gây tụt hạnh nhân tiểu não."
    },
    {
        "id": 12,
        "code": "VEN_TERR_INFRA_POST_R",
        "name_vi": "Vùng Bán cầu Tiểu não sau (Phải)",
        "name_en": "Posterior Infratentorial Territory (Right Cerebellum)",
        "sinus": "Transverse Sinus & Torcular",
        "vein": "Posterior (Tentorial) PCF Group",
        "color": [150, 225, 100, 255], # Light Spring Green
        "desc_vi": "Bán cầu tiểu não sau (Crus I, Crus II, Lobules 6, 7, 8, 9) và thùy nhộng phía sau bên phải.",
        "syndrome": "Huyết khối xoang ngang / xoang chẩm sau phải: Đau sau gáy, chóng mặt tư thế, mất thăng bằng bán cầu phải, nhồi máu xuất huyết tiểu não diện rộng có chỉ định phẫu thuật giải áp hố sau."
    }
]

print("2. Mapping anatomical structures to venous territories...")
out_labels = np.zeros(shape, dtype=np.uint8)

# Hemisphere split: Left (x_mm < 0), Right (x_mm >= 0)
is_left = (x_mm < 0)
is_right = ~is_left

# A. Inferior Sagittal Sinus (ID 3):
# Genu (3), Body (4), Splenium (5) of corpus callosum, Fornix (6) from JHU Whitematter atlas
# plus midline medial cingulate voxels near falx
iss_wm_mask = (wm_data >= 3) & (wm_data <= 6)
# Midline cingulate near corpus callosum
iss_cing_mask = ((aal_data >= 35) & (aal_data <= 40)) & (np.abs(x_mm) <= 6) & (z_mm >= 10) & (z_mm <= 36)
out_labels[bm_data & (iss_wm_mask | iss_cing_mask)] = 3

# B. Deep Venous System (Straight Sinus / ICVs / Galen / Rosenthal) (ID 4: Left, ID 5: Right):
# Thalamus (81, 82), Caudate (75, 76), Putamen (77, 78), Pallidum (79, 80), Hippocampus (41, 42), ParaHippocampal (43, 44), Amygdala (45, 46)
deep_aal_left = [81, 75, 77, 79, 41, 43, 45]
deep_aal_right = [82, 76, 78, 80, 42, 44, 46]

deep_mask_l = np.isin(aal_data, deep_aal_left)
deep_mask_r = np.isin(aal_data, deep_aal_right)

# JHU Internal Capsule & Corona Radiata (17..28)
deep_wm_left = np.isin(wm_data, [18, 20, 22, 24, 26, 28])
deep_wm_right = np.isin(wm_data, [17, 19, 21, 23, 25, 27])

# Midbrain tectum/tegmentum (z_mm between -14 and 4, y_mm between -36 and -10, |x| <= 16)
midbrain_l = (z_mm >= -14) & (z_mm <= 4) & (y_mm >= -36) & (y_mm <= -10) & (x_mm >= -16) & (x_mm < 0)
midbrain_r = (z_mm >= -14) & (z_mm <= 4) & (y_mm >= -36) & (y_mm <= -10) & (x_mm >= 0) & (x_mm <= 16)

out_labels[bm_data & (out_labels == 0) & (deep_mask_l | deep_wm_left | midbrain_l)] = 4
out_labels[bm_data & (out_labels == 0) & (deep_mask_r | deep_wm_right | midbrain_r)] = 5

# C. Infratentorial - Anterior (Sigmoid / Petrosal) (ID 10):
# Brainstem (Pons: z_mm < -14, y_mm > -42; Medulla: z_mm < -32) & Anterior cerebellar lobules 3, 4_5, 10
infra_ant_aal = [99, 100, 101, 102, 111, 112, 113, 114, 115] # Lobules 3, 4_5, 10, Vermis 1-5
brainstem_pons_medulla = (z_mm <= 0) & (y_mm >= -40) & (y_mm <= 0) & (np.abs(x_mm) <= 24)
out_labels[bm_data & (out_labels == 0) & (np.isin(aal_data, infra_ant_aal) | brainstem_pons_medulla) & (z_mm <= 0)] = 10

# D. Infratentorial - Posterior (Tentorial / Transverse) (ID 11: Left, ID 12: Right):
# Posterior cerebellar crus1, crus2, lobules 6, 7b, 8, 9, vermis 6-10
infra_post_aal_l = [95, 97, 103, 105, 107, 109] # Crus1, Crus2, 6, 7b, 8, 9 L
infra_post_aal_r = [96, 98, 104, 106, 108, 110] # Crus1, Crus2, 6, 7b, 8, 9 R
infra_vermis_post = [116, 117, 118, 119, 120]

out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, infra_post_aal_l)] = 11
out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, infra_post_aal_r)] = 12
out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, infra_vermis_post) & is_left] = 11
out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, infra_vermis_post) & is_right] = 12

# General cerebellar catch-all for z_mm <= -10 in posterior fossa
out_labels[bm_data & (out_labels == 0) & (z_mm <= -12) & (y_mm <= -38) & is_left] = 11
out_labels[bm_data & (out_labels == 0) & (z_mm <= -12) & (y_mm <= -38) & is_right] = 12

# E. Cavernous Sinus / Sphenoparietal & SMCV (Sylvian) (ID 8: Left, ID 9: Right):
# Temporal Pole Sup/Mid (87, 88, 91, 92), Superior Temporal (85, 86), Heschl (83, 84),
# Insula (33, 34), Frontal Inf Oper/Tri/Orb (7..12), Rolandic Oper (13, 14), Rectus/OFC (21..32)
cav_aal_l = [87, 91, 85, 83, 33, 7, 9, 11, 13, 21, 23, 25, 27, 29, 31]
cav_aal_r = [88, 92, 86, 84, 34, 8, 10, 12, 14, 22, 24, 26, 28, 30, 32]

out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, cav_aal_l)] = 8
out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, cav_aal_r)] = 9

# F. Transverse Sinus / Vein of Labbé (ID 6: Left, ID 7: Right):
# Inferior Temporal (93, 94), Fusiform (59, 60), Occipital Inf (57, 58), Occipital Mid (55, 56)
ts_aal_l = [93, 59, 57, 55, 89] # + Middle Temporal posterior (89)
ts_aal_r = [94, 60, 58, 56, 90]

# For middle temporal (89, 90), posterior part belongs to Labbé/Transverse, anterior part to SMCV
out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, [93, 59, 57, 55])] = 6
out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, [94, 60, 58, 56])] = 7
out_labels[bm_data & (out_labels == 0) & (aal_data == 89) & (y_mm <= -25)] = 6
out_labels[bm_data & (out_labels == 0) & (aal_data == 90) & (y_mm <= -25)] = 7
out_labels[bm_data & (out_labels == 0) & (aal_data == 89) & (y_mm > -25)] = 8
out_labels[bm_data & (out_labels == 0) & (aal_data == 90) & (y_mm > -25)] = 9

# G. Superior Sagittal Sinus & Cortical Veins (ID 1: Left, ID 2: Right):
# Frontal Sup (3, 4), Frontal Mid (5, 6), Supp Motor (15, 16), Frontal Sup Medial (19, 20),
# Precentral (1, 2), Postcentral (61, 62), Parietal Sup (63, 64), Parietal Inf / SupraMarginal / Angular (65..70),
# Precuneus (71, 72), Paracentral Lobule (73, 74), Occipital Sup (53, 54), Cuneus (49, 50), Calcarine (47, 48)
sss_aal_l = [3, 5, 15, 19, 1, 61, 63, 65, 67, 69, 71, 73, 53, 49, 47, 51]
sss_aal_r = [4, 6, 16, 20, 2, 62, 64, 66, 68, 70, 72, 74, 54, 50, 48, 52]

out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, sss_aal_l)] = 1
out_labels[bm_data & (out_labels == 0) & np.isin(aal_data, sss_aal_r)] = 2

# High Vertex (z_mm >= 48) is 100% SSS territory (Slice 8)
out_labels[bm_data & (z_mm >= 48) & is_left] = 1
out_labels[bm_data & (z_mm >= 48) & is_right] = 2

# 3. 100% Brain Coverage via Nearest-Neighbor Voronoi Propagation
unlabeled_mask = bm_data & (out_labels == 0)
num_unlabeled = np.count_nonzero(unlabeled_mask)
print(f"Directly classified brain voxels: {np.count_nonzero(out_labels > 0)} / {np.count_nonzero(bm_data)} ({np.count_nonzero(out_labels > 0) / np.count_nonzero(bm_data) * 100:.1f}%)")
print(f"Unlabeled voxels to propagate (white matter / sulci boundaries): {num_unlabeled}")

if num_unlabeled > 0:
    print("Propagating labels to 100% brainmask voxels using Euclidean Distance Transform...")
    # Compute nearest classified voxel for all unlabeled voxels
    _, nearest_indices = distance_transform_edt(out_labels == 0, return_indices=True)
    propagated_labels = out_labels[tuple(nearest_indices)]
    out_labels[unlabeled_mask] = propagated_labels[unlabeled_mask]

# Ensure zero voxels outside brainmask
out_labels[~bm_data] = 0

final_classified = np.count_nonzero(out_labels > 0)
total_brain = np.count_nonzero(bm_data)
print(f"\nFINAL VERIFICATION: {final_classified} / {total_brain} brain voxels classified ({final_classified / total_brain * 100:.2f}%)")
assert final_classified == total_brain, "ERROR: Brainmask coverage is not 100%!"

# 4. Save NIfTI Volume with Level 9 Gzip Compression
print(f"Saving NIfTI volume -> {OUT_NII}...")
nib.openers.Opener.default_compresslevel = 9
out_img = nib.Nifti1Image(out_labels.astype(np.uint8), affine, bm_img.header)
out_img.set_sform(affine, code=4)
out_img.set_qform(affine, code=4)
out_img.header["descrip"] = b"Brain Venous Vascular Territories Atlas (Craig Hacking Radiopaedia 2020)"
out_img.set_data_dtype(np.uint8)
nib.save(out_img, str(OUT_NII))
file_size_kb = os.path.getsize(str(OUT_NII)) / 1024
print(f"Saved {OUT_NII.name} ({file_size_kb:.1f} KB)")

# 5. Save Labels Sidecar JSON
print(f"Saving labels sidecar -> {OUT_LABELS}...")
labels_meta = {
    "atlas": "venous_territories",
    "space": "MNI152NLin2009cAsym",
    "source": "Craig Hacking, Brain venous vascular territories, Radiopaedia.org (2020, CC BY-SA-NC 3.0)",
    "description": "Comprehensive 3D Parcellation of Brain Venous Drainage Vascular Territories (100% MNI152 coverage, 12 bilateral zones)",
    "review_status": "unreviewed",
    "labels": [
        {
            "index": t["id"],
            "code": t["code"],
            "name": t["name_en"],
            "name_vi": t["name_vi"],
            "dural_sinus": t["sinus"],
            "tributary_vein": t["vein"],
            "color": t["color"],
            "source": "Craig Hacking, Radiopaedia.org (2020) & Neuroanatomy",
            "review_status": "unreviewed"
        }
        for t in TERRITORIES
    ]
}
with open(OUT_LABELS, "w", encoding="utf-8") as f:
    json.dump(labels_meta, f, indent=2, ensure_ascii=False)

# 6. Save NiiVue Colormap JSON
print(f"Saving NiiVue colormap -> {OUT_COLORMAP}...")
R_list = [0] + [t["color"][0] for t in TERRITORIES]
G_list = [0] + [t["color"][1] for t in TERRITORIES]
B_list = [0] + [t["color"][2] for t in TERRITORIES]
A_list = [0] + [t["color"][3] for t in TERRITORIES]
I_list = [0] + [t["id"] for t in TERRITORIES]
names_list = ["Background"] + [t["name_vi"] for t in TERRITORIES]

colormap_obj = {
    "R": R_list,
    "G": G_list,
    "B": B_list,
    "A": A_list,
    "I": I_list,
    "labels": names_list
}
with open(OUT_COLORMAP, "w", encoding="utf-8") as f:
    json.dump(colormap_obj, f, indent=2, ensure_ascii=False)

# 7. Update neuro_ontology.json
print(f"Updating clinical ontology -> {ONTOLOGY_PATH}...")
with open(ONTOLOGY_PATH, encoding="utf-8") as f:
    onto_data = json.load(f)

# Remove any existing venous_territories entries
entries = [e for e in onto_data["entries"] if e.get("atlas") != "venous_territories"]

for t in TERRITORIES:
    entry = {
        "atlas": "venous_territories",
        "label_id": t["id"],
        "code": t["code"],
        "name_vi": t["name_vi"],
        "name_en": t["name_en"],
        "category": "vascular_territory",
        "brodmann_area": [],
        "functions": [
            t["desc_vi"],
            f"Xoang màng cứng chính tiếp nhận dẫn lưu: {t['sinus']}.",
            f"Nhánh tĩnh mạch phụ trách trực tiếp: {t['vein']}."
        ],
        "arterial_supply": {
            "primary": [],
            "perforators": []
        },
        "venous_drainage": [t["sinus"], t["vein"]],
        "aspects_zone": None,
        "clinical_syndromes": [
            {
                "name": f"Huyết khối tĩnh mạch não (CVT) - {t['sinus']}",
                "description": t["syndrome"]
            }
        ],
        "evidence_level": "approximate",
        "source": [
            "Craig Hacking, Brain venous vascular territories, Radiopaedia.org (2020 CC BY-SA-NC 3.0)",
            "AHA/ASA Scientific Statement: Diagnosis and Management of Cerebral Venous Thrombosis (Saposnik 2011)",
            "Leach JL et al. Imaging of Cerebral Venous Thrombosis: Current Techniques, Spectrum of Findings, and Diagnostic Pitfalls. Radiographics 2006"
        ],
        "review_status": "unreviewed"
    }
    entries.append(entry)

onto_data["entries"] = entries
with open(ONTOLOGY_PATH, "w", encoding="utf-8") as f:
    json.dump(onto_data, f, indent=2, ensure_ascii=False)

# 8. Update centroids.json
print(f"Updating centroids -> {CENTROIDS_PATH}...")
with open(CENTROIDS_PATH, encoding="utf-8") as f:
    centroids_data = json.load(f)

centroids_data["venous_territories"] = {}
for t in TERRITORIES:
    lbl = t["id"]
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

    centroids_data["venous_territories"][str(lbl)] = {
        "mean_mm": [round(float(x), 2) for x in mean_mm],
        "in_mask_mm": [round(float(x), 2) for x in in_mask_mm],
        "in_mask_vox": [int(x) for x in in_mask_vox]
    }

with open(CENTROIDS_PATH, "w", encoding="utf-8") as f:
    json.dump(centroids_data, f, indent=2)

print("\nSUCCESS! Venous territories atlas generation completed with 100% brainmask coverage!")
