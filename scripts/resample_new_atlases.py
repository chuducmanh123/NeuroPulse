import ants
import nibabel as nib
import numpy as np
from pathlib import Path

cache = Path("scripts/.cache")
out_dir = Path("public/neurovision/atlases")
out_dir.mkdir(parents=True, exist_ok=True)

# 1. Load Reference image (MNI152NLin2009cAsym 1mm, 193x229x193)
ref_path = "public/neurovision/volumes/T1.nii.gz"
ref_ants = ants.image_read(ref_path)
print("Reference grid:", ref_ants.shape, ref_ants.origin, ref_ants.spacing)

# 2. Transform H5
tx = str(cache / "tpl-MNI152NLin2009cAsym_from-MNI152NLin6Asym_mode-image_xfm.h5")

# 3. Resample Glasser 360
glasser_src = str(cache / "glasser360MNI.nii.gz")
print("Reading Glasser source...")
glasser_ants = ants.image_read(glasser_src)
print("Glasser moving shape:", glasser_ants.shape)

glasser_warped = ants.apply_transforms(
    fixed=ref_ants,
    moving=glasser_ants,
    transformlist=[tx],
    interpolator="nearestNeighbor",
)
glasser_out = out_dir / "glasser.nii.gz"
ants.image_write(glasser_warped, str(glasser_out))
print(f"Wrote {glasser_out}")

# Verify Glasser warped
img_g = nib.load(glasser_out)
g_data = img_g.get_fdata().astype(np.uint16)
# Save as uint16
nib.save(nib.Nifti1Image(g_data, img_g.affine, img_g.header), glasser_out)
print("Glasser final shape:", g_data.shape, "unique labels:", len(np.unique(g_data)), "dtype:", g_data.dtype)

# 4. Resample Brainnetome
bna_src = str(cache / "BN_Atlas_246_1mm.nii.gz")
print("Reading Brainnetome source...")
bna_ants = ants.image_read(bna_src)
print("BNA moving shape:", bna_ants.shape)

bna_warped = ants.apply_transforms(
    fixed=ref_ants,
    moving=bna_ants,
    transformlist=[tx],
    interpolator="nearestNeighbor",
)
bna_out = out_dir / "brainnetome.nii.gz"
ants.image_write(bna_warped, str(bna_out))
print(f"Wrote {bna_out}")

# Verify BNA warped
img_b = nib.load(bna_out)
b_data = img_b.get_fdata().astype(np.uint8)
nib.save(nib.Nifti1Image(b_data, img_b.affine, img_b.header), bna_out)
print("BNA final shape:", b_data.shape, "unique labels:", len(np.unique(b_data)), "dtype:", b_data.dtype)
