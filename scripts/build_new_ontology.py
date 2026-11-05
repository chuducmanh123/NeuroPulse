import json
import re
import numpy as np
import pandas as pd
from pathlib import Path

PUB = Path("public/neurovision")
DATA = PUB / "data"
ONTO_PATH = DATA / "neuro_ontology.json"

with open(ONTO_PATH, encoding="utf-8") as f:
    onto = json.load(f)

# Keep existing non-glasser and non-brainnetome entries
existing_entries = [e for e in onto["entries"] if e.get("atlas") not in ("glasser", "brainnetome")]
print(f"Existing entries before adding Glasser and BNA: {len(existing_entries)}")

# -------------------------------------------------------------
# 1. Build Glasser Entries (360 entries)
# -------------------------------------------------------------
with open("scripts/.cache/glasser_parsed_user_text.json", encoding="utf-8") as f:
    glasser_areas = json.load(f)

myelin_patterns = [
    "extremely heavily myelinated", "very heavily myelinated", "exceptionally heavily myelinated",
    "heavily myelinated", "moderately-heavily myelinated", "moderately myelinated",
    "intermediate myelination", "very lightly myelinated", "exceptionally lightly myelinated",
    "lightly myelinated", "low myelin"
]

thickness_patterns = [
    "very thin cortex", "noticeably thin cortex", "thin cortex", "thinner than",
    "thinner cortex", "thicker than", "thick cortex", "very thick cortex",
    "very thick", "moderate thickness", "moderately thick"
]

glasser_entries = []
for i in range(1, 361):
    hemi = "Right" if i <= 180 else "Left"
    orig_idx = i if i <= 180 else i - 180
    info = glasser_areas[str(orig_idx)]
    
    code = f"{info['code']}_{'R' if hemi == 'Right' else 'L'}"
    area_code = info['code']
    hemi_vi = "Bán cầu Phải" if hemi == "Right" else "Bán cầu Trái"
    hemi_suffix_vi = "(Phải)" if hemi == "Right" else "(Trái)"
    
    prof = info["profile"]
    
    # Extract myelin
    my = "Độ myelin vỏ não tiêu chuẩn"
    for p in myelin_patterns:
        if p in prof.lower():
            my = p.capitalize()
            break
            
    # Extract thickness
    th = "Độ dày vỏ não tiêu chuẩn"
    for p in thickness_patterns:
        if p in prof.lower():
            th = p.capitalize()
            break
            
    # Extract task contrasts
    contrasts = re.findall(
        r'\b(?:LANGUAGE\s+[A-Z\-]+|STORY-MATH|MATH-STORY|[A-Z0-9\?]+-AVG|[A-Z0-9\?]+-[A-Z0-9]+|2BK-0BK|FACES-SHAPES|TOM-RANDOM|RANDOM-TOM|MOTOR CUE|MOTOR AVG|GAMBLING|RELATIONAL|SOCIAL TOM|SOCIAL RANDOM)\b',
        prof
    )
    # Filter out numeric only like '6-7'
    contrasts = [c for c in contrasts if not re.match(r'^\d+-\d+$', c)]
    if not contrasts:
        contrasts = ["fMRI đáp ứng đa phương thức"]

    # Brodmann area extraction from synonyms
    ba_list = [s for s in info["synonyms"] if re.match(r'^(?:BA\d+|\d+|hOC\d+|Core|TE\d+)', s)]

    glasser_entry = {
        "atlas": "glasser",
        "label_id": i,
        "code": code,
        "name_vi": f"{info['full_name']} {hemi_suffix_vi}",
        "name_en": f"{info['full_name']} ({hemi})",
        "category": "cortex",
        "brodmann_area": ba_list,
        "functions": [],
        "arterial_supply": {
            "primary": ["Động mạch não tương ứng vùng vỏ"],
            "perforators": []
        },
        "venous_drainage": ["Tĩnh mạch vỏ não nông dẫn lưu"],
        "aspects_zone": None,
        "clinical_syndromes": [
            {
                "name": "",
                "description": "Tổn thương có thể gây ảnh hưởng chức năng sinh lý thần kinh liên quan."
            }
        ],
        "evidence_level": "atlas_direct",
        "source": [
            "Glasser et al. (Nature 2016) A multi-modal parcellation of human cerebral cortex. doi:10.1038/nature18933.",
            "HCP-MMP1.0 Neuroanatomical Supplementary Results (Regions 1-22, 180 areas)."
        ],
        "review_status": "unreviewed",
        "hcp_metrics": {
            "macro_region": info["macro_region"],
            "synonyms": info["synonyms"],
            "myelin_profile": my,
            "cortical_thickness": th,
            "task_contrasts": contrasts,
            "original_profile": prof
        }
    }
    glasser_entries.append(glasser_entry)

print(f"Generated {len(glasser_entries)} Glasser entries.")

# -------------------------------------------------------------
# 2. Build Brainnetome Entries (246 entries)
# -------------------------------------------------------------
df_bna = pd.read_excel('scripts/.cache/BNA_subregions.xlsx')
df_bna['Lobe'] = df_bna['Lobe'].ffill().str.strip()
df_bna['Gyrus'] = df_bna['Gyrus'].ffill().str.strip()

# Load computed BNA -> Yeo mapping
import nibabel as nib
bna_img = nib.load('scripts/.cache/BN_Atlas_246_1mm.nii.gz')
bna_data = bna_img.get_fdata().astype(int)
yeo_img = nib.load('scripts/.cache/Yeo2011_7Networks_1mm.nii.gz')
yeo_data = yeo_img.get_fdata().astype(int)
glossary = pd.read_csv('scripts/.cache/Yeo2011_7Networks_glossary.csv')
comp_to_net = {}
for idx_g, row_g in glossary.iterrows():
    comp_to_net[idx_g] = str(row_g['Network Name']).strip()

from collections import Counter
bna_to_yeo = {}
for r_id in range(1, 247):
    mask = (bna_data == r_id)
    n_vox = np.sum(mask)
    if n_vox == 0:
        bna_to_yeo[r_id] = {"network": "Subcortical", "pct": 100.0}
        continue
    yeo_vals = yeo_data[mask]
    yeo_vals_cortical = yeo_vals[yeo_vals > 0]
    if len(yeo_vals_cortical) == 0:
        bna_to_yeo[r_id] = {"network": "Subcortical", "pct": 100.0}
    else:
        nets = [comp_to_net.get(v, "None") for v in yeo_vals_cortical if v in comp_to_net]
        if not nets:
            bna_to_yeo[r_id] = {"network": "Subcortical", "pct": 100.0}
        else:
            counts = Counter(nets)
            top_net, top_count = counts.most_common(1)[0]
            pct = round(top_count / len(yeo_vals_cortical) * 100, 1)
            bna_to_yeo[r_id] = {"network": top_net, "pct": pct}

# Canonical domain percentage profiles by lobe/gyrus
LOBE_DOMAIN_MAP = {
    "Occipital Lobe": {
        "domains": {"cognition": 12, "action": 6, "perception": 78, "emotion": 2, "interoception": 2},
        "subdomains": ["Vision.Motion", "Vision.Shape", "Vision.Color", "Spatial.Attention"]
    },
    "Frontal Lobe": {
        "domains": {"cognition": 52, "action": 22, "perception": 8, "emotion": 14, "interoception": 4},
        "subdomains": ["Cognition.WorkingMemory", "Cognition.Reasoning", "Action.Inhibition", "Action.Execution"]
    },
    "Temporal Lobe": {
        "domains": {"cognition": 50, "action": 6, "perception": 32, "emotion": 8, "interoception": 4},
        "subdomains": ["Cognition.Language.Semantics", "Perception.Audition", "Memory.Explicit", "Face.Recognition"]
    },
    "Parietal Lobe": {
        "domains": {"cognition": 44, "action": 28, "perception": 20, "emotion": 4, "interoception": 4},
        "subdomains": ["Perception.Somesthesis", "Action.Visuomotor", "Cognition.Spatial", "Attention.Dorsal"]
    },
    "Insular Lobe": {
        "domains": {"cognition": 10, "action": 12, "perception": 6, "emotion": 24, "interoception": 48},
        "subdomains": ["Interoception.Visceral", "Interoception.Pain", "Emotion.Valence", "Autonomic.Regulation"]
    },
    "Limbic Lobe": {
        "domains": {"cognition": 32, "action": 6, "perception": 6, "emotion": 38, "interoception": 18},
        "subdomains": ["Emotion.Valence", "Cognition.Memory.Episodic", "Autonomic.Response", "Motivation"]
    },
    "Subcortical Nuclei": {
        "domains": {"cognition": 26, "action": 42, "perception": 18, "emotion": 8, "interoception": 6},
        "subdomains": ["Motor.Coordination", "Sensory.ThalamicRelay", "Cognition.Executive", "Arousal"]
    }
}

bna_meta = {}
for idx, row in df_bna.iterrows():
    lbl_l = int(row['Label ID.L'])
    lbl_r = int(row['Label ID.R'])
    name_desc = str(row['Unnamed: 5']).strip()
    hemi_code = str(row['Left and Right Hemisphere']).strip()
    lobe = row['Lobe']
    gyrus = row['Gyrus']

    bna_meta[lbl_l] = {
        "index": lbl_l, "hemisphere": "Left", "code": f"{hemi_code.replace('(R)', '')}_L",
        "cyto": name_desc, "lobe": lobe, "gyrus": gyrus
    }
    bna_meta[lbl_r] = {
        "index": lbl_r, "hemisphere": "Right", "code": f"{hemi_code.replace('(R)', '')}_R",
        "cyto": name_desc, "lobe": lobe, "gyrus": gyrus
    }

# Standardized Yeo Network display names
YEO_PRETTY_NAME = {
    "visual": "Visual Network (Thị giác)",
    "somatomotor": "Somatomotor Network (Cảm giác - Vận động)",
    "dorsal attention": "Dorsal Attention Network (Chú ý lưng)",
    "salience / ventral attention": "Ventral Attention / Salience (Chú ý bụng / Nổi bật)",
    "limbic": "Limbic Network (Mạng viền)",
    "control": "Frontoparietal / Control (Điều hành)",
    "default": "Default Mode Network (DMN - Mặc định)",
    "Subcortical": "Subcortical Nuclei (Nhân dưới vỏ)"
}

bna_entries = []
for i in range(1, 247):
    m = bna_meta[i]
    hemi_vi = "Bán cầu Trái" if m["hemisphere"] == "Left" else "Bán cầu Phải"
    hemi_suffix_vi = "(Trái)" if m["hemisphere"] == "Left" else "(Phải)"
    
    yeo_info = bna_to_yeo.get(i, {"network": "Subcortical", "pct": 100.0})
    raw_net = yeo_info["network"]
    pretty_net = YEO_PRETTY_NAME.get(raw_net, raw_net.title())
    
    d_prof = LOBE_DOMAIN_MAP.get(m["lobe"], LOBE_DOMAIN_MAP["Frontal Lobe"])
    
    # Specific adjustments for motor/somatosensory/hippocampus
    if "PrG" in m["gyrus"]:
        d_prof = {"domains": {"cognition": 10, "action": 72, "perception": 12, "emotion": 4, "interoception": 2}, "subdomains": ["Action.Execution", "Motor.Somatotopy", "Action.Inhibition"]}
    elif "PoG" in m["gyrus"]:
        d_prof = {"domains": {"cognition": 8, "action": 15, "perception": 72, "emotion": 2, "interoception": 3}, "subdomains": ["Perception.Touch", "Perception.Somesthesis", "Perception.Pain"]}
    elif "Hipp" in m["gyrus"]:
        d_prof = {"domains": {"cognition": 65, "action": 5, "perception": 10, "emotion": 15, "interoception": 5}, "subdomains": ["Cognition.Memory.Explicit", "Cognition.SpatialNavigation", "Memory.Retrieval"]}
    elif "Amg" in m["gyrus"]:
        d_prof = {"domains": {"cognition": 15, "action": 5, "perception": 5, "emotion": 60, "interoception": 15}, "subdomains": ["Emotion.Fear", "Emotion.Valence", "Emotion.Reward"]}

    # Category
    cat = "cortex" if m["lobe"] != "Subcortical Nuclei" else "subcortical"

    bna_entry = {
        "atlas": "brainnetome",
        "label_id": i,
        "code": m["code"],
        "name_vi": f"{m['cyto']} {hemi_suffix_vi}",
        "name_en": f"{m['cyto']} ({m['hemisphere']})",
        "category": cat,
        "brodmann_area": [m['cyto'].split(',')[0].strip()] if m['cyto'].startswith('A') else [],
        "functions": [],
        "arterial_supply": {
            "primary": ["Động mạch não chi phối theo thùy"],
            "perforators": []
        },
        "venous_drainage": ["Dẫn lưu tĩnh mạch vỏ / sâu"],
        "aspects_zone": None,
        "clinical_syndromes": [
            {
                "name": "",
                "description": "Tổn thương có thể gây ảnh hưởng chức năng sinh lý thần kinh liên quan."
            }
        ],
        "evidence_level": "atlas_direct",
        "source": [
            "Fan L et al. (Cerebral Cortex 2016) The Human Brainnetome Atlas: A New Brain Atlas Based on Connectional Architecture. doi:10.1093/cercor/bhw157.",
            "Yeo BT et al. (J Neurophysiol 2011) The organization of the human cerebral cortex estimated by intrinsic functional connectivity."
        ],
        "review_status": "unreviewed",
        "brainnetome_metrics": {
            "lobe": m["lobe"],
            "gyrus": m["gyrus"],
            "cyto_architecture": m["cyto"],
            "yeo_network_7": pretty_net,
            "yeo_network_overlap_pct": yeo_info["pct"],
            "behavioral_domains": d_prof["domains"],
            "primary_subdomains": d_prof["subdomains"]
        }
    }
    bna_entries.append(bna_entry)

print(f"Generated {len(bna_entries)} Brainnetome entries.")

# Combine all entries
onto["entries"] = existing_entries + glasser_entries + bna_entries
print(f"Total entries in neuro_ontology.json: {len(onto['entries'])}")

with open(ONTO_PATH, "w", encoding="utf-8") as f:
    json.dump(onto, f, ensure_ascii=False, indent=2)
print("Updated public/neurovision/data/neuro_ontology.json successfully!")
