import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public" / "neurovision"
DATA = PUB / "data"
COLORMAPS = DATA / "colormaps"
ATLASES = PUB / "atlases"

# ============================================================================
# 1. ARTERIAL LEVEL 2 (Tổng quát - 10 vùng)
# ============================================================================
LEVEL2_PALETTE = {
    0: {"rgba": [0, 0, 0, 0], "vi": "Nền", "en": "Background"},
    1: {"rgba": [30, 144, 255, 255], "vi": "Lãnh thổ Động mạch não trước (Trái)", "en": "Anterior Cerebral Artery Territory (Left)", "code": "ACA_L", "cat": "major_arterial_territory"},
    2: {"rgba": [0, 190, 245, 255], "vi": "Lãnh thổ Động mạch não trước (Phải)", "en": "Anterior Cerebral Artery Territory (Right)", "code": "ACA_R", "cat": "major_arterial_territory"},
    3: {"rgba": [235, 60, 40, 255], "vi": "Lãnh thổ Động mạch não giữa (Trái)", "en": "Middle Cerebral Artery Territory (Left)", "code": "MCA_L", "cat": "major_arterial_territory"},
    4: {"rgba": [255, 130, 20, 255], "vi": "Lãnh thổ Động mạch não giữa (Phải)", "en": "Middle Cerebral Artery Territory (Right)", "code": "MCA_R", "cat": "major_arterial_territory"},
    5: {"rgba": [40, 190, 80, 255], "vi": "Lãnh thổ Động mạch não sau (Trái)", "en": "Posterior Cerebral Artery Territory (Left)", "code": "PCA_L", "cat": "major_arterial_territory"},
    6: {"rgba": [110, 215, 40, 255], "vi": "Lãnh thổ Động mạch não sau (Phải)", "en": "Posterior Cerebral Artery Territory (Right)", "code": "PCA_R", "cat": "major_arterial_territory"},
    7: {"rgba": [140, 70, 210, 255], "vi": "Lãnh thổ Động mạch Đốt sống - Thân nền (Trái)", "en": "Vertebrobasilar Territory (Left)", "code": "VB_L", "cat": "major_arterial_territory"},
    8: {"rgba": [185, 95, 230, 255], "vi": "Lãnh thổ Động mạch Đốt sống - Thân nền (Phải)", "en": "Vertebrobasilar Territory (Right)", "code": "VB_R", "cat": "major_arterial_territory"},
    9: {"rgba": [140, 155, 175, 255], "vi": "Không gian Não thất bên (Trái)", "en": "Lateral Ventricle Space (Left)", "code": "LVL", "cat": "ventricle"},
    10: {"rgba": [165, 180, 200, 255], "vi": "Không gian Não thất bên (Phải)", "en": "Lateral Ventricle Space (Right)", "code": "LVR", "cat": "ventricle"},
}

cm_l2 = {
    "R": [LEVEL2_PALETTE[i]["rgba"][0] for i in range(11)],
    "G": [LEVEL2_PALETTE[i]["rgba"][1] for i in range(11)],
    "B": [LEVEL2_PALETTE[i]["rgba"][2] for i in range(11)],
    "A": [LEVEL2_PALETTE[i]["rgba"][3] for i in range(11)],
    "I": list(range(11)),
    "labels": ["Background"] + [f"{LEVEL2_PALETTE[i]['vi']} ({LEVEL2_PALETTE[i]['en']})" for i in range(1, 11)]
}

with open(COLORMAPS / "arterial_level2.json", "w", encoding="utf-8") as f:
    json.dump(cm_l2, f, ensure_ascii=False, indent=2)
print("Updated arterial_level2.json colormap successfully.")

# ============================================================================
# 2. ARTERIAL LEVEL 1 (Chi tiết - 32 vùng phân nhánh giải phẫu)
# ============================================================================
LEVEL1_PALETTE = {
    0: {"rgba": [0, 0, 0, 0], "vi": "Nền", "en": "Background"},
    
    # --- ACA Group (Xanh dương & Lam ngọc) ---
    1: {"rgba": [25, 110, 235, 255], "vi": "ĐM não trước (ACA - Trái) (Mặt trong thùy trán & đỉnh)", "en": "Anterior Cerebral Artery territory (Left)", "code": "ACAL", "cat": "arterial_trunk", "group": "ACA"},
    2: {"rgba": [30, 165, 255, 255], "vi": "ĐM não trước (ACA - Phải) (Mặt trong thùy trán & đỉnh)", "en": "Anterior Cerebral Artery territory (Right)", "code": "ACAR", "cat": "arterial_trunk", "group": "ACA"},
    3: {"rgba": [70, 95, 240, 255], "vi": "Nhánh vân thể trong (ĐM não trước - Trái) (ĐM Heubner)", "en": "Medial Lenticulostriate Artery territory (Left)", "code": "MLSL", "cat": "arterial_perforator", "group": "ACA"},
    4: {"rgba": [0, 205, 220, 255], "vi": "Nhánh vân thể trong (ĐM não trước - Phải) (ĐM Heubner)", "en": "Medial Lenticulostriate Artery territory (Right)", "code": "MLSR", "cat": "arterial_perforator", "group": "ACA"},
    
    # --- MCA Group (Vàng nổi bật cho nhân sâu; Đỏ, Cam, Hồng, Tía, Nâu cho các thùy vỏ não) ---
    5: {"rgba": [255, 200, 20, 255], "vi": "Nhánh vân thể ngoài (ĐM não giữa - Trái) (Nhánh xuyên bao trong & hạch nền)", "en": "Lateral Lenticulostriate Artery territory (Left)", "code": "LLSL", "cat": "arterial_perforator", "group": "MCA"},
    6: {"rgba": [255, 230, 60, 255], "vi": "Nhánh vân thể ngoài (ĐM não giữa - Phải) (Nhánh xuyên bao trong & hạch nền)", "en": "Lateral Lenticulostriate Artery territory (Right)", "code": "LLSR", "cat": "arterial_perforator", "group": "MCA"},
    7: {"rgba": [235, 45, 55, 255], "vi": "ĐM não giữa - Phân nhánh trán (Trái) (Vỏ não vận động & Broca)", "en": "Middle Cerebral Artery - Frontal pars (Left)", "code": "MCAFL", "cat": "arterial_branch", "group": "MCA"},
    8: {"rgba": [245, 85, 85, 255], "vi": "ĐM não giữa - Phân nhánh trán (Phải) (Vỏ não vận động trán bên)", "en": "Middle Cerebral Artery - Frontal pars (Right)", "code": "MCAFR", "cat": "arterial_branch", "group": "MCA"},
    9: {"rgba": [245, 115, 25, 255], "vi": "ĐM não giữa - Phân nhánh đỉnh (Trái) (Vỏ não cảm giác & đỉnh dưới)", "en": "Middle Cerebral Artery - Parietal pars (Left)", "code": "MCAPL", "cat": "arterial_branch", "group": "MCA"},
    10: {"rgba": [255, 155, 45, 255], "vi": "ĐM não giữa - Phân nhánh đỉnh (Phải) (Vỏ não chú ý không gian)", "en": "Middle Cerebral Artery - Parietal pars (Right)", "code": "MCAPR", "cat": "arterial_branch", "group": "MCA"},
    11: {"rgba": [225, 40, 135, 255], "vi": "ĐM não giữa - Phân nhánh thái dương (Trái) (Vùng Wernicke & thái dương trên/giữa)", "en": "Middle Cerebral Artery - Temporal pars (Left)", "code": "MCATL", "cat": "arterial_branch", "group": "MCA"},
    12: {"rgba": [245, 95, 160, 255], "vi": "ĐM não giữa - Phân nhánh thái dương (Phải) (Thùy thái dương ngoài)", "en": "Middle Cerebral Artery - Temporal pars (Right)", "code": "MCATR", "cat": "arterial_branch", "group": "MCA"},
    13: {"rgba": [195, 75, 35, 255], "vi": "ĐM não giữa - Phân nhánh chẩm (Trái) (Vùng chuyển tiếp đỉnh - chẩm)", "en": "Middle Cerebral Artery - Occipital pars (Left)", "code": "MCAOL", "cat": "arterial_branch", "group": "MCA"},
    14: {"rgba": [215, 100, 50, 255], "vi": "ĐM não giữa - Phân nhánh chẩm (Phải) (Vùng chuyển tiếp đỉnh - chẩm)", "en": "Middle Cerebral Artery - Occipital pars (Right)", "code": "MCAOR", "cat": "arterial_branch", "group": "MCA"},
    15: {"rgba": [175, 30, 85, 255], "vi": "ĐM não giữa - Phân nhánh thùy đảo (Trái) (Vỏ thùy đảo M2)", "en": "Middle Cerebral Artery - Insular pars (Left)", "code": "MCAIL", "cat": "arterial_branch", "group": "MCA"},
    16: {"rgba": [205, 55, 110, 255], "vi": "ĐM não giữa - Phân nhánh thùy đảo (Phải) (Vỏ thùy đảo M2)", "en": "Middle Cerebral Artery - Insular pars (Right)", "code": "MCAIR", "cat": "arterial_branch", "group": "MCA"},
    
    # --- PCA Group (Xanh lá, Xanh ngọc, Xanh ô liu cho nhánh đồi thị & chẩm) ---
    17: {"rgba": [35, 145, 65, 255], "vi": "ĐM não sau - Phân nhánh thái dương (Trái) (Mặt dưới thùy thái dương)", "en": "Posterior Cerebral Artery - Temporal pars (Left)", "code": "PCATL", "cat": "arterial_branch", "group": "PCA"},
    18: {"rgba": [70, 190, 95, 255], "vi": "ĐM não sau - Phân nhánh thái dương (Phải) (Mặt dưới thùy thái dương)", "en": "Posterior Cerebral Artery - Temporal pars (Right)", "code": "PCATR", "cat": "arterial_branch", "group": "PCA"},
    19: {"rgba": [20, 205, 90, 255], "vi": "ĐM não sau - Phân nhánh chẩm (Trái) (Vỏ thị giác V1 & khe cựa)", "en": "Posterior Cerebral Artery - Occipital pars (Left)", "code": "PCAOL", "cat": "arterial_branch", "group": "PCA"},
    20: {"rgba": [90, 230, 75, 255], "vi": "ĐM não sau - Phân nhánh chẩm (Phải) (Vỏ thị giác V1 & khe cựa)", "en": "Posterior Cerebral Artery - Occipital pars (Right)", "code": "PCAOR", "cat": "arterial_branch", "group": "PCA"},
    21: {"rgba": [0, 160, 135, 255], "vi": "ĐM màng mạch sau & Nhánh xuyên đồi thị (Trái)", "en": "Posterior Choroidal & Thalamoperforating Arteries (Left)", "code": "PCTPL", "cat": "arterial_perforator", "group": "PCA"},
    22: {"rgba": [35, 195, 165, 255], "vi": "ĐM màng mạch sau & Nhánh xuyên đồi thị (Phải)", "en": "Posterior Choroidal & Thalamoperforating Arteries (Right)", "code": "PCTPR", "cat": "arterial_perforator", "group": "PCA"},
    23: {"rgba": [135, 175, 30, 255], "vi": "ĐM màng mạch trước & Nhánh xuyên đồi thị (Trái)", "en": "Anterior Choroidal & Thalamoperforating Arteries (Left)", "code": "ACTPL", "cat": "arterial_perforator", "group": "PCA"},
    24: {"rgba": [175, 205, 45, 255], "vi": "ĐM màng mạch trước & Nhánh xuyên đồi thị (Phải)", "en": "Anterior Choroidal & Thalamoperforating Arteries (Right)", "code": "ACTPR", "cat": "arterial_perforator", "group": "PCA"},
    
    # --- VB Group (Hệ sống nền: Thân nền, Tiểu não trên SCA, Tiểu não dưới PICA/AICA) ---
    25: {"rgba": [120, 50, 200, 255], "vi": "Động mạch thân nền (Trái) (Cầu não & trung não)", "en": "Basilar Artery territory (Left)", "code": "BL", "cat": "arterial_trunk", "group": "VB"},
    26: {"rgba": [155, 80, 235, 255], "vi": "Động mạch thân nền (Phải) (Cầu não & trung não)", "en": "Basilar Artery territory (Right)", "code": "BR", "cat": "arterial_trunk", "group": "VB"},
    27: {"rgba": [95, 85, 215, 255], "vi": "Động mạch tiểu não trên (SCA - Trái) (Mặt trên tiểu não)", "en": "Superior Cerebellar Artery territory (Left)", "code": "SCL", "cat": "arterial_branch", "group": "VB"},
    28: {"rgba": [135, 115, 240, 255], "vi": "Động mạch tiểu não trên (SCA - Phải) (Mặt trên tiểu não)", "en": "Superior Cerebellar Artery territory (Right)", "code": "SCR", "cat": "arterial_branch", "group": "VB"},
    29: {"rgba": [165, 35, 170, 255], "vi": "Động mạch tiểu não dưới (PICA/AICA - Trái) (Tiểu não dưới & hành não)", "en": "Inferior Cerebellar Artery territory (Left)", "code": "ICL", "cat": "arterial_branch", "group": "VB"},
    30: {"rgba": [200, 65, 205, 255], "vi": "Động mạch tiểu não dưới (PICA/AICA - Phải) (Tiểu não dưới & hành não)", "en": "Inferior Cerebellar Artery territory (Right)", "code": "ICR", "cat": "arterial_branch", "group": "VB"},
    
    # --- Ventricles Group ---
    31: {"rgba": [130, 150, 170, 255], "vi": "Không gian Não thất bên (Trái)", "en": "Lateral Ventricle Space (Left)", "code": "LVL", "cat": "ventricle", "group": "LV"},
    32: {"rgba": [160, 175, 195, 255], "vi": "Không gian Não thất bên (Phải)", "en": "Lateral Ventricle Space (Right)", "code": "LVR", "cat": "ventricle", "group": "LV"},
}

cm_l1 = {
    "R": [LEVEL1_PALETTE[i]["rgba"][0] for i in range(33)],
    "G": [LEVEL1_PALETTE[i]["rgba"][1] for i in range(33)],
    "B": [LEVEL1_PALETTE[i]["rgba"][2] for i in range(33)],
    "A": [LEVEL1_PALETTE[i]["rgba"][3] for i in range(33)],
    "I": list(range(33)),
    "labels": ["Background"] + [f"{LEVEL1_PALETTE[i]['vi']} ({LEVEL1_PALETTE[i]['en']})" for i in range(1, 33)]
}

with open(COLORMAPS / "arterial.json", "w", encoding="utf-8") as f:
    json.dump(cm_l1, f, ensure_ascii=False, indent=2)
print("Updated arterial.json colormap successfully.")

# ============================================================================
# 3. UPDATE neuro_ontology.json
# ============================================================================
onto_path = DATA / "neuro_ontology.json"
with open(onto_path, "r", encoding="utf-8") as f:
    onto = json.load(f)

for entry in onto["entries"]:
    atlas = entry.get("atlas")
    lid = entry.get("label_id")
    
    if atlas == "arterial_level2" and lid in LEVEL2_PALETTE:
        p = LEVEL2_PALETTE[lid]
        entry["name_vi"] = p["vi"]
        entry["name_en"] = p["en"]
        entry["code"] = p["code"]
        entry["category"] = p["cat"]
        entry["color_rgb"] = p["rgba"][:3]
        
    elif atlas == "arterial" and lid in LEVEL1_PALETTE:
        p = LEVEL1_PALETTE[lid]
        entry["name_vi"] = p["vi"]
        entry["name_en"] = p["en"]
        entry["code"] = p["code"]
        entry["category"] = p["cat"]
        entry["color_rgb"] = p["rgba"][:3]
        if "group" in p:
            entry["bilateral_group"] = p["group"]

with open(onto_path, "w", encoding="utf-8") as f:
    json.dump(onto, f, ensure_ascii=False, indent=2)
print("Updated neuro_ontology.json successfully.")

# ============================================================================
# 4. UPDATE arterial.labels.json & arterial_level2.labels.json
# ============================================================================
with open(ATLASES / "arterial_level2.labels.json", "r", encoding="utf-8") as f:
    art2_labels = json.load(f)

for item in art2_labels["labels"]:
    idx = item["index"]
    if idx in LEVEL2_PALETTE:
        item["name"] = f"{LEVEL2_PALETTE[idx]['vi']} ({LEVEL2_PALETTE[idx]['en']})"
        item["code"] = LEVEL2_PALETTE[idx]["code"]

with open(ATLASES / "arterial_level2.labels.json", "w", encoding="utf-8") as f:
    json.dump(art2_labels, f, ensure_ascii=False, indent=2)

with open(ATLASES / "arterial.labels.json", "r", encoding="utf-8") as f:
    art1_labels = json.load(f)

for item in art1_labels["labels"]:
    idx = item["index"]
    if idx in LEVEL1_PALETTE:
        item["name"] = f"{LEVEL1_PALETTE[idx]['vi']} ({LEVEL1_PALETTE[idx]['en']})"
        item["acronym"] = LEVEL1_PALETTE[idx]["code"]

with open(ATLASES / "arterial.labels.json", "w", encoding="utf-8") as f:
    json.dump(art1_labels, f, ensure_ascii=False, indent=2)

print("Updated arterial.labels.json and arterial_level2.labels.json successfully.")
