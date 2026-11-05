"""Integrate Colin27 2008 High-Resolution T2 into NeuroVision."""
from pathlib import Path
import json
import nibabel as nib
import numpy as np
from nilearn.image import resample_to_img

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
PUB = ROOT / "public" / "neurovision"
VOLUMES = PUB / "volumes"
CACHE = SCRIPTS / ".cache"

def main():
    print("Loading Colin27 T2 and Reference T1...")
    t1_ref = nib.load(str(VOLUMES / "T1.nii.gz"))
    colin_t2_path = CACHE / "colin27_t2_tal_hires.nii"
    if not colin_t2_path.exists():
        raise FileNotFoundError(f"Missing {colin_t2_path}")

    c_t2 = nib.load(str(colin_t2_path))
    print(f"Colin27 T2 input shape: {c_t2.shape}, zooms: {c_t2.header.get_zooms()[:3]}")

    print("Resampling Colin27 T2 to target grid (MNI152NLin2009cAsym 1mm)...")
    c_t2_resampled = resample_to_img(c_t2, t1_ref, interpolation="continuous")
    data = c_t2_resampled.get_fdata()

    # Scale to uint8 using percentile 1 - 99.5
    fg = data[data > 0]
    p1, p995 = np.percentile(fg, [1.0, 99.5])
    print(f"Intensity percentiles: p1={p1:.2f}, p99.5={p995:.2f}")

    scaled = np.clip((data - p1) / (p995 - p1) * 255.0, 0, 255.0).astype(np.uint8)

    # Backup previous T2 if not backed up
    old_t2 = VOLUMES / "T2.nii.gz"
    backup_t2 = VOLUMES / "T2_mni152_backup.nii.gz"
    if old_t2.exists() and not backup_t2.exists():
        old_t2.rename(backup_t2)
        print(f"Backed up previous T2 to {backup_t2.name}")

    # Save new T2 with MNI sform/qform code 4
    nib.openers.Opener.default_compresslevel = 9
    out_img = nib.Nifti1Image(scaled, t1_ref.affine)
    out_img.set_sform(t1_ref.affine, code=4)
    out_img.set_qform(t1_ref.affine, code=4)
    out_img.header["descrip"] = b"Colin27 2008 T2 hires resampled to MNI152 1mm u8"
    nib.save(out_img, str(old_t2))
    print(f"Saved new T2 to {old_t2} (size: {old_t2.stat().st_size / 1e6:.2f} MB)")

    # Update provenance.json
    prov_path = PUB / "provenance.json"
    if prov_path.exists():
        prov = json.loads(prov_path.read_text(encoding="utf-8"))
        for item in prov.get("files", []):
            if item.get("file") == "volumes/T2.nii.gz":
                item["source"] = "Colin 27 Average Brain (2008 High-Resolution Version), MNI/McGill (Aubert-Broche et al. 2006/2008)"
                item["original_space"] = "Colin27 Talairach/MNI space (0.5 mm grid)"
                item["method"] = "Resampled to MNI152NLin2009cAsym 1 mm grid (continuous interpolation); percentile 1-99.5 linear scaling to uint8"
                item["size_bytes"] = old_t2.stat().st_size
                item["license"] = "MNI permission notice (see LICENSES.md)"
        prov_path.write_text(json.dumps(prov, indent=2, ensure_ascii=False), encoding="utf-8")
        print("Updated provenance.json")

if __name__ == "__main__":
    main()
