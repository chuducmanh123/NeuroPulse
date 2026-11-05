import nibabel as nib
import numpy as np
import pandas as pd
from collections import Counter

bna_img = nib.load('scripts/.cache/BN_Atlas_246_1mm.nii.gz')
bna_data = bna_img.get_fdata().astype(int)

yeo_img = nib.load('scripts/.cache/Yeo2011_7Networks_1mm.nii.gz')
yeo_data = yeo_img.get_fdata().astype(int)

glossary = pd.read_csv('scripts/.cache/Yeo2011_7Networks_glossary.csv')
# glossary index is component label ID (0 = None, 1 = 7Networks_LH_Vis, etc.)
# Let's map component ID -> broad network name
comp_to_net = {}
for idx, row in glossary.iterrows():
    comp_to_net[idx] = row['Network Name']

print("Comp to net sample:", list(comp_to_net.items())[:10])

# For each BNA region 1..246:
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
        # Region is subcortical
        bna_to_yeo[r_id] = {"network": "Subcortical", "pct": 100.0}
    else:
        # map to network name
        nets = [comp_to_net.get(v, "None") for v in yeo_vals_cortical]
        counts = Counter(nets)
        top_net, top_count = counts.most_common(1)[0]
        pct = round(top_count / len(yeo_vals_cortical) * 100, 1)
        bna_to_yeo[r_id] = {"network": top_net, "pct": pct}

print("Sample computed BNA to Yeo:")
for r_id in [1, 2, 10, 20, 50, 100, 211, 246]:
    print(f"Region {r_id}: {bna_to_yeo[r_id]}")
