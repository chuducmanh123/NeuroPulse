"""Integrate HCP S1200 3 Tesla High-Resolution T1 and T2 volumes into NeuroVision."""
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

def process_volume(input_path: Path, ref_img: nib.Nifti1Image, out_path: Path, descrip: str) -> int:
    print(f"Loading {input_path.name}...")
    src_img = nib.load(str(input_path))
    print(f"  Input shape: {src_img.shape}, zooms: {src_img.header.get_zooms()[:3]}")

    print("  Resampling to MNI152 1mm reference grid...")
    resampled = resample_to_img(src_img, ref_img, interpolation="continuous")
    data = resampled.get_fdata()

    fg = data[data > 0]
    p1, p995 = np.percentile(fg, [1.0, 99.5])
    print(f"  Intensity percentiles: p1={p1:.2f}, p99.5={p995:.2f}")

    scaled = np.clip((data - p1) / (p995 - p1) * 255.0, 0, 255.0).astype(np.uint8)

    nib.openers.Opener.default_compresslevel = 9
    out_img = nib.Nifti1Image(scaled, ref_img.affine)
    out_img.set_sform(ref_img.affine, code=4)
    out_img.set_qform(ref_img.affine, code=4)
    out_img.header["descrip"] = descrip.encode("ascii", "ignore")[:79]
    nib.save(out_img, str(out_path))

    size_bytes = out_path.stat().st_size
    print(f"  Saved {out_path.name}: {size_bytes / 1e6:.2f} MB")
    return size_bytes

def main():
    t1_ref = nib.load(str(VOLUMES / "brainmask.nii.gz"))

    hcp_t1 = CACHE / "S1200_AverageT1w_restore.nii.gz"
    hcp_t2 = CACHE / "S1200_AverageT2w_restore.nii.gz"

    if not hcp_t1.exists() or not hcp_t2.exists():
        raise FileNotFoundError("Missing HCP S1200 source files in scripts/.cache/")

    # Backup current T1 and T2
    for mod in ("T1", "T2"):
        cur_file = VOLUMES / f"{mod}.nii.gz"
        bk_file = CACHE / f"{mod}_mni152_backup.nii.gz"
        if cur_file.exists() and not bk_file.exists():
            cur_file.rename(bk_file)
            print(f"Backed up {cur_file.name} to {bk_file.name}")

    t1_out = VOLUMES / "T1.nii.gz"
    t2_out = VOLUMES / "T2.nii.gz"

    t1_bytes = process_volume(
        hcp_t1,
        t1_ref,
        t1_out,
        "HCP S1200 3T T1w MPRAGE 0.7mm resampled to MNI152 1mm u8",
    )
    t2_bytes = process_volume(
        hcp_t2,
        t1_ref,
        t2_out,
        "HCP S1200 3T T2w SPACE 0.7mm resampled to MNI152 1mm u8",
    )

    # Update provenance.json
    prov_path = PUB / "provenance.json"
    if prov_path.exists():
        prov = json.loads(prov_path.read_text(encoding="utf-8"))
        hcp_src = "Human Connectome Project (HCP S1200 Release, Washington University / Minnesota, 3T Siemens Prisma/Skyra 0.7mm)"
        hcp_lic = "WU-Minn HCP Consortium Open Access Data Use Terms"
        for item in prov.get("files", []):
            if item.get("file") == "volumes/T1.nii.gz":
                item["source"] = f"{hcp_src} - 3D T1w MPRAGE"
                item["original_space"] = "HCP S1200 MSM-All MNI space (0.7 mm grid)"
                item["method"] = "Resampled to MNI152NLin2009cAsym 1 mm grid (continuous interpolation); percentile 1-99.5 linear scaling to uint8"
                item["size_bytes"] = t1_bytes
                item["license"] = hcp_lic
            elif item.get("file") == "volumes/T2.nii.gz":
                item["source"] = f"{hcp_src} - 3D T2w SPACE"
                item["original_space"] = "HCP S1200 MSM-All MNI space (0.7 mm grid)"
                item["method"] = "Resampled to MNI152NLin2009cAsym 1 mm grid (continuous interpolation); percentile 1-99.5 linear scaling to uint8"
                item["size_bytes"] = t2_bytes
                item["license"] = hcp_lic
        prov_path.write_text(json.dumps(prov, indent=2, ensure_ascii=False), encoding="utf-8")
        print("Updated provenance.json")

if __name__ == "__main__":
    main()
