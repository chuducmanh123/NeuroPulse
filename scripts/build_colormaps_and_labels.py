import json
import colorsys
import numpy as np
import pandas as pd
from pathlib import Path

PUB = Path("public/neurovision")
ATLASES = PUB / "atlases"
COLORMAPS = PUB / "data" / "colormaps"

# -------------------------------------------------------------
# 1. Glasser Labels & Colormap
# -------------------------------------------------------------
with open("scripts/.cache/glasser_parsed_user_text.json", encoding="utf-8") as f:
    glasser_areas = json.load(f)

with open("scripts/.cache/glasser360NodeNames.txt") as f:
    glasser_node_names = [l.strip() for l in f if l.strip()]

glasser_labels = []
# 360 labels
# 1..180 Right, 181..360 Left
for i in range(1, 361):
    hemi = "Right" if i <= 180 else "Left"
    orig_idx = i if i <= 180 else i - 180
    info = glasser_areas[str(orig_idx)]
    full_name = f"{info['full_name']} ({hemi})"
    code = f"{info['code']}_{'R' if hemi == 'Right' else 'L'}"
    glasser_labels.append({
        "index": i,
        "name": f"{code} - {full_name}",
        "code": code,
        "area_code": info["code"],
        "hemisphere": hemi,
        "macro_region": info["macro_region"],
        "synonyms": info["synonyms"],
        "source": "Glasser et al. (Nature 2016) HCP-MMP1.0 Neuroanatomical Supplementary Results",
        "review_status": "unreviewed"
    })

glasser_labels_sidecar = {
    "atlas": "glasser",
    "space": "MNI152NLin2009cAsym",
    "source": "Human Connectome Project Multi-Modal Parcellation (HCP-MMP1.0), Glasser et al. 2016 Nature",
    "license": "HCP Open Access Data Use Terms",
    "review_status": "unreviewed",
    "labels": glasser_labels
}

with open(ATLASES / "glasser.labels.json", "w", encoding="utf-8") as f:
    json.dump(glasser_labels_sidecar, f, ensure_ascii=False, indent=2)

# Colormap Glasser (360 labels)
R_g = [0]
G_g = [0]
B_g = [0]
A_g = [0]
I_g = [0]

# Golden ratio hue distribution for high distinctiveness between neighboring areas
golden_ratio = 0.618033988749895
h = 0.1
for i in range(1, 361):
    h = (h + golden_ratio) % 1.0
    s = 0.75 + 0.2 * ((i % 3) / 2.0)
    v = 0.85 + 0.15 * ((i % 2))
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    R_g.append(int(round(r * 255)))
    G_g.append(int(round(g * 255)))
    B_g.append(int(round(b * 255)))
    A_g.append(255)
    I_g.append(i)

with open(COLORMAPS / "glasser.json", "w", encoding="utf-8") as f:
    json.dump({"R": R_g, "G": G_g, "B": B_g, "A": A_g, "I": I_g}, f, indent=2)
print("Saved glasser.labels.json and colormaps/glasser.json")

# -------------------------------------------------------------
# 2. Brainnetome Labels & Colormap
# -------------------------------------------------------------
df_bna = pd.read_excel('scripts/.cache/BNA_subregions.xlsx')
df_bna['Lobe'] = df_bna['Lobe'].ffill().str.strip()
df_bna['Gyrus'] = df_bna['Gyrus'].ffill().str.strip()

bna_labels = []
# BNA has 123 rows -> Label ID.L (odd) and Label ID.R (even)
# Create a dict mapping label_id 1..246 to metadata
bna_meta = {}
for idx, row in df_bna.iterrows():
    lbl_l = int(row['Label ID.L'])
    lbl_r = int(row['Label ID.R'])
    name_desc = str(row['Unnamed: 5']).strip()
    hemi_code = str(row['Left and Right Hemisphere']).strip()
    lobe = row['Lobe']
    gyrus = row['Gyrus']

    bna_meta[lbl_l] = {
        "index": lbl_l,
        "hemisphere": "Left",
        "code": f"{hemi_code.replace('(R)', '')}_L",
        "cyto": name_desc,
        "lobe": lobe,
        "gyrus": gyrus
    }
    bna_meta[lbl_r] = {
        "index": lbl_r,
        "hemisphere": "Right",
        "code": f"{hemi_code.replace('(R)', '')}_R",
        "cyto": name_desc,
        "lobe": lobe,
        "gyrus": gyrus
    }

for i in range(1, 247):
    m = bna_meta[i]
    bna_labels.append({
        "index": i,
        "name": f"{m['code']} - {m['cyto']} ({m['hemisphere']})",
        "code": m['code'],
        "hemisphere": m['hemisphere'],
        "lobe": m['lobe'],
        "gyrus": m['gyrus'],
        "cyto": m['cyto'],
        "source": "Fan et al. (Cerebral Cortex 2016) Human Brainnetome Atlas",
        "review_status": "unreviewed"
    })

bna_labels_sidecar = {
    "atlas": "brainnetome",
    "space": "MNI152NLin2009cAsym",
    "source": "Human Brainnetome Atlas (Fan et al. 2016 Cerebral Cortex)",
    "license": "Brainnetome Atlas Terms of Use (Academic / Non-commercial)",
    "review_status": "unreviewed",
    "labels": bna_labels
}

with open(ATLASES / "brainnetome.labels.json", "w", encoding="utf-8") as f:
    json.dump(bna_labels_sidecar, f, ensure_ascii=False, indent=2)

# Colormap BNA (246 labels)
R_b = [0]
G_b = [0]
B_b = [0]
A_b = [0]
I_b = [0]

h = 0.25
for i in range(1, 247):
    h = (h + golden_ratio) % 1.0
    s = 0.8 + 0.15 * ((i % 4) / 3.0)
    v = 0.85 + 0.15 * ((i % 2))
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    R_b.append(int(round(r * 255)))
    G_b.append(int(round(g * 255)))
    B_b.append(int(round(b * 255)))
    A_b.append(255)
    I_b.append(i)

with open(COLORMAPS / "brainnetome.json", "w", encoding="utf-8") as f:
    json.dump({"R": R_b, "G": G_b, "B": B_b, "A": A_b, "I": I_b}, f, indent=2)
print("Saved brainnetome.labels.json and colormaps/brainnetome.json")
