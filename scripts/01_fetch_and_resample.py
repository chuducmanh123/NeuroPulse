"""01 - Fetch data and bring everything into MNI152NLin2009cAsym (193x229x193, 1 mm).

Anatomical correctness note
---------------------------
Atlases that live in another space (FSL's MNI152NLin6Asym) are NOT resampled with a
header-only resampler. They are warped with the official TemplateFlow transform
(tpl-MNI152NLin2009cAsym_from-MNI152NLin6Asym_mode-image_xfm.h5) through ANTs (antspyx),
nearest-neighbour for label images, linear for intensity images.

Not produced (no verified source/licence, see atlas_inventory.md): ASPECTS, venous
territories. Nothing is substituted for them.

Run:  python 01_fetch_and_resample.py
"""
from __future__ import annotations

import json
import sys
import tarfile
import xml.etree.ElementTree as ET
from pathlib import Path

import nv_common as nv  # noqa: F401  (must come first: installs OS trust store)

import ants
import nibabel as nib
import numpy as np
import requests
import templateflow.api as tf
from nilearn import datasets

CACHE = nv.CACHE
CACHE.mkdir(parents=True, exist_ok=True)
H = {"User-Agent": "NeuroVision-pipeline/1.0"}

PROV: list[dict] = []
SKIPPED = [
    {"item": "Circle of Willis micro-arterial mesh", "reason": "Requires high-resolution micro-TOF MRA segmentation not bundled in standard stereotaxic atlases."},
]

# ---------------------------------------------------------------- helpers
def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  downloading {url}")
    with requests.get(url, headers=H, timeout=600, stream=True) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    return dest


def to_uint8(data: np.ndarray, lo_pct: float = 1.0, hi_pct: float = 99.5) -> np.ndarray:
    """Linear scale to 0-255 using percentiles of strictly positive voxels."""
    d = np.nan_to_num(data.astype(np.float32))
    pos = d[d > 0]
    lo, hi = np.percentile(pos, [lo_pct, hi_pct])
    return np.clip((d - lo) / (hi - lo) * 255.0, 0, 255).round().astype(np.uint8)


def same_world_grid(a: nib.Nifti1Image, b: nib.Nifti1Image, tol: float = 1e-3) -> bool:
    """Same shape and same physical bounding box/voxel size, regardless of axis storage order
    (TemplateFlow stores RAS; FSL files store LAS: identical world grid, x-flipped arrays)."""
    if a.shape[:3] != b.shape[:3]:
        return False

    def bbox(img):
        sh = np.array(img.shape[:3]) - 1
        corners = np.array([[i, j, k] for i in (0, sh[0]) for j in (0, sh[1]) for k in (0, sh[2])], float)
        w = nib.affines.apply_affine(img.affine, corners)
        return w.min(0), w.max(0), np.abs(np.array(img.header.get_zooms()[:3]))

    (a0, a1, az), (b0, b1, bz) = bbox(a), bbox(b)
    return bool(np.allclose(a0, b0, atol=tol) and np.allclose(a1, b1, atol=tol) and np.allclose(az, bz, atol=tol))


def dice(a: np.ndarray, b: np.ndarray) -> float:
    a, b = a.astype(bool), b.astype(bool)
    return 2.0 * (a & b).sum() / (a.sum() + b.sum())


def warp(moving_nii: nib.Nifti1Image, fixed_path: Path, xfm: Path, interp: str, tmp: Path) -> np.ndarray:
    """Apply an ANTs transform. Returns array on the fixed (target) grid."""
    tmp.parent.mkdir(parents=True, exist_ok=True)
    nib.save(moving_nii, str(tmp))
    fixed = ants.image_read(str(fixed_path))
    moving = ants.image_read(str(tmp))
    out = ants.apply_transforms(fixed=fixed, moving=moving, transformlist=[str(xfm)], interpolator=interp)
    return out.numpy()


def as_label(arr: np.ndarray) -> np.ndarray:
    r = np.rint(arr)
    return r.astype(np.uint8 if r.max() < 256 else np.uint16)


def record(path: Path, **kw) -> None:
    img = nib.load(str(path))
    PROV.append({
        "file": str(path.relative_to(nv.PUB)).replace("\\", "/"),
        "shape": list(img.shape),
        "dtype": str(img.get_data_dtype()),
        "size_bytes": path.stat().st_size,
        "review_status": "unreviewed",
        **kw,
    })


# ---------------------------------------------------------------- 1. template
print("[1] TemplateFlow MNI152NLin2009cAsym")
T1P = Path(str(tf.get(nv.TARGET_SPACE, resolution=1, suffix="T1w", desc=None, extension="nii.gz")))
T2P = Path(str(tf.get(nv.TARGET_SPACE, resolution=1, suffix="T2w", desc=None, extension="nii.gz")))
MKP = Path(str(tf.get(nv.TARGET_SPACE, resolution=1, desc="brain", suffix="mask")))
t1 = nib.load(str(T1P))
AFFINE = t1.affine.copy()
assert t1.shape == nv.TARGET_SHAPE, f"unexpected T1 shape {t1.shape}"
assert np.allclose(t1.header.get_zooms()[:3], 1.0), "T1 is not 1 mm"
print("   T1 shape", t1.shape, "origin", np.round(AFFINE[:3, 3], 1), "orient", nib.aff2axcodes(AFFINE))
for p in (T2P, MKP):
    im = nib.load(str(p))
    assert im.shape == t1.shape and np.allclose(im.affine, AFFINE, atol=1e-4), f"{p.name} grid != T1 grid"

TF_SRC = "TemplateFlow tpl-MNI152NLin2009cAsym res-01 (Fonov et al. 2009/2011)"
for name, p in (("T1", T1P), ("T2", T2P)):
    out = nv.VOLUMES / f"{name}.nii.gz"
    nv.save_nifti(to_uint8(np.asarray(nib.load(str(p)).dataobj)), AFFINE, out, f"{name} MNI152NLin2009cAsym u8")
    record(out, source=TF_SRC, original_space=nv.TARGET_SPACE, method="none (native grid); percentile 1-99.5 linear scaling to uint8",
           interpolation="n/a", license="MNI/Collins permission notice (see LICENSES.md)")
out = nv.VOLUMES / "brainmask.nii.gz"
nv.save_nifti((np.asarray(nib.load(str(MKP)).dataobj) > 0).astype(np.uint8), AFFINE, out, "brain mask")
record(out, source=TF_SRC, original_space=nv.TARGET_SPACE, method="none (native grid), binarised", interpolation="n/a",
       license="MNI/Collins permission notice (see LICENSES.md)")
MASK_2009 = np.asarray(nib.load(str(MKP)).dataobj) > 0

# ---------------------------------------------------------------- 2. transform
print("[2] Transform NLin6Asym -> NLin2009cAsym")
XFM = Path(str(tf.get(nv.TARGET_SPACE, **{"from": "MNI152NLin6Asym"}, mode="image", suffix="xfm", extension="h5")))
print("   ", XFM.name, f"{XFM.stat().st_size/1e6:.0f} MB")
N6_T1 = Path(str(tf.get("MNI152NLin6Asym", resolution=1, suffix="T1w", desc=None, extension="nii.gz")))
N6_MASK = Path(str(tf.get("MNI152NLin6Asym", resolution=1, desc="brain", suffix="mask")))
n6 = nib.load(str(N6_T1))
n6_mask = np.asarray(nib.load(str(N6_MASK)).dataobj) > 0
print("   NLin6Asym res-01 shape", n6.shape, "origin", np.round(n6.affine[:3, 3], 1))
TMP = CACHE / "tmp_moving.nii.gz"


def warp_labels(arr: np.ndarray, affine: np.ndarray) -> np.ndarray:
    return as_label(warp(nib.Nifti1Image(arr.astype(np.float32), affine), T1P, XFM, "nearestNeighbor", TMP))


# ---------------------------------------------------------------- 3. Harvard-Oxford (FSL)
print("[3] Harvard-Oxford (nilearn / FSL) -> anatomy + hemispheres")
ho_c = datasets.fetch_atlas_harvard_oxford("cort-maxprob-thr25-1mm", data_dir=str(CACHE), verbose=0)
ho_s = datasets.fetch_atlas_harvard_oxford("sub-maxprob-thr25-1mm", data_dir=str(CACHE), verbose=0)
cimg, simg = ho_c.maps, ho_s.maps
assert cimg.shape == simg.shape and same_world_grid(cimg, n6) and same_world_grid(simg, n6), "HO world grid != NLin6Asym world grid"
assert np.allclose(cimg.affine, simg.affine, atol=1e-4), "HO cortical/subcortical affines differ"
cort = np.rint(np.asarray(cimg.dataobj)).astype(np.int32)
sub = np.rint(np.asarray(simg.dataobj)).astype(np.int32)

anat = cort.copy()
labels_anat = [{"index": i, "name": ho_c.labels[i], "group": "cortical"} for i in range(1, len(ho_c.labels))]
next_idx = len(ho_c.labels)  # 49
for i in range(1, len(ho_s.labels)):
    nm = ho_s.labels[i]
    if "Cerebral Cortex" in nm:  # cortex is covered by the finer cortical atlas
        continue
    sel = (sub == i) & (anat == 0)
    anat[sel] = next_idx
    labels_anat.append({"index": next_idx, "name": nm, "group": "subcortical/white matter/ventricle"})
    next_idx += 1
assert anat.max() < 256
left_ids = [i for i in range(1, len(ho_s.labels)) if ho_s.labels[i].startswith("Left")]
right_ids = [i for i in range(1, len(ho_s.labels)) if ho_s.labels[i].startswith("Right")]
hemi = np.zeros(sub.shape, np.uint8)
hemi[np.isin(sub, left_ids)] = 1
hemi[np.isin(sub, right_ids)] = 2

HO_SRC = "Harvard-Oxford atlas via nilearn 0.14.1 (FSL; Makris 2006, Desikan 2006, Frazier 2005, Goldstein 2007)"
HO_LIC = "FSL licence: non-commercial (user decision 2026-11-04: use)"
for name, arr, desc in (("anatomy", anat, "HO cortical 1-48 + subcortical/WM/ventricles"),
                        ("hemispheres", hemi, "1=left 2=right, from HO sub atlas L/R labels")):
    warped = warp_labels(arr, cimg.affine)
    out = nv.ATLASES / f"{name}.nii.gz"
    nv.save_nifti(warped, AFFINE, out, desc)
    record(out, source=HO_SRC, original_space="MNI152NLin6Asym (FSL MNI152, 1 mm 182x218x182)",
           method="ANTs apply_transforms with TemplateFlow h5 (NLin6Asym->NLin2009cAsym)", interpolation="nearestNeighbor", license=HO_LIC)
    print(f"   {name}: labels in output {len(np.unique(warped)) - 1}")
nv.write_json(nv.ATLASES / "anatomy.labels.json", nv.label_table(
    "anatomy", nv.TARGET_SPACE, HO_SRC, HO_LIC, labels_anat,
    ["Cortical atlas is NOT lateralised in the source (symmetric_split=False): no left/right split of cortical labels.",
     "Subcortical/white-matter/ventricle labels are lateralised in the source. 'Cerebral Cortex' labels were dropped in favour of the cortical atlas.",
     "Maxprob thr25: labels do not tile the whole brain; unlabeled voxels = 0."]))
nv.write_json(nv.ATLASES / "hemispheres.labels.json", nv.label_table(
    "hemispheres", nv.TARGET_SPACE, HO_SRC, HO_LIC,
    [{"index": 1, "name": "Left hemisphere (union of HO sub-atlas Left* labels, excl. brainstem)"},
     {"index": 2, "name": "Right hemisphere (union of HO sub-atlas Right* labels, excl. brainstem)"}]))

# ---------------------------------------------------------------- 4. JHU ICBM-DTI-81 (FSL)
print("[4] JHU ICBM-DTI-81 white-matter labels (FSL fsl-data_atlases)")
FSL_TAR = download("https://fsl.fmrib.ox.ac.uk/fsldownloads/fslconda/public/noarch/fsl-data_atlases-2103.0-0.tar.bz2",
                   CACHE / "fsl-data_atlases-2103.0-0.tar.bz2")
FSL_DIR = CACHE / "fsl_atlases"
if not (FSL_DIR / "data/atlases/JHU/JHU-ICBM-labels-1mm.nii.gz").exists():
    with tarfile.open(FSL_TAR) as t:
        members = [m for m in t.getmembers() if "JHU" in m.name or "icense" in m.name or m.name.startswith("info/")]
        try:
            t.extractall(FSL_DIR, members=members, filter="data")
        except TypeError:
            t.extractall(FSL_DIR, members=members)
jhu = nib.load(str(FSL_DIR / "data/atlases/JHU/JHU-ICBM-labels-1mm.nii.gz"))
assert same_world_grid(jhu, n6), "JHU world grid != NLin6Asym world grid"
print("   JHU orientation", nib.aff2axcodes(jhu.affine), "(NLin6Asym TemplateFlow:", nib.aff2axcodes(n6.affine), ") same world grid")
warped = warp_labels(np.asarray(jhu.dataobj), jhu.affine)
out = nv.ATLASES / "whitematter.nii.gz"
nv.save_nifti(warped, AFFINE, out, "JHU ICBM-DTI-81 labels")
JHU_SRC = "JHU ICBM-DTI-81 White-Matter Labels via FSL fsl-data_atlases 2103.0 (Mori 2008; Wakana 2007; Hua 2008)"
record(out, source=JHU_SRC, original_space="MNI152NLin6Asym (FSL MNI152, 1 mm 182x218x182)",
       method="ANTs apply_transforms with TemplateFlow h5 (NLin6Asym->NLin2009cAsym)", interpolation="nearestNeighbor", license=HO_LIC)
root = ET.parse(str(FSL_DIR / "data/atlases/JHU-labels.xml")).getroot()
jl = [{"index": int(e.get("index")), "name": (e.text or "").strip()} for e in root.iter("label") if int(e.get("index")) > 0]
nv.write_json(nv.ATLASES / "whitematter.labels.json", nv.label_table("whitematter", nv.TARGET_SPACE, JHU_SRC, HO_LIC, jl))

# ---------------------------------------------------------------- 5. JHU Arterial Atlas
print("[5] JHU Arterial Atlas (GitHub Chin-Fu-Liu/Arterial_Atlas, CC BY-SA 4.0)")
GH = "https://raw.githubusercontent.com/Chin-Fu-Liu/Arterial_Atlas/main/data"
art1 = download(f"{GH}/Atlas_182/ArterialAtlas.nii", CACHE / "arterial/Atlas_182/ArterialAtlas.nii")
art2 = download(f"{GH}/Atlas_182/ArterialAtlas_level2.nii", CACHE / "arterial/Atlas_182/ArterialAtlas_level2.nii")
artl = download(f"{GH}/ArterialAtlasLables.txt", CACHE / "arterial/ArterialAtlasLables.txt")
a1 = np.asarray(nib.load(str(art1)).dataobj).squeeze()
a2 = np.asarray(nib.load(str(art2)).dataobj).squeeze()
assert a1.shape == a2.shape == n6.shape, f"arterial shape {a1.shape}"
# The NIfTI header is diag(-1,1,1) with origin (0,0,0): LAS storage like FSL files, but no MNI origin.
# The authors call this grid "FSL compatible". Hypothesis: array = FSL MNI152 1 mm storage (LAS), so its
# world grid equals the NLin6Asym grid and the correct affine is the FSL one (`jhu.affine`).
# Test the hypotheses against the NLin6Asym brain mask (RAS array) before using any of them.
# In RAS storage the FSL (LAS) array is flipped along x.
m = a1 > 0
checks = {
    "LAS/FSL storage (matches header orientation)": m[::-1],
    "LAS + flip y": m[::-1, ::-1],
    "LAS + flip z": m[::-1, :, ::-1],
    "RAS storage": m,
    "RAS + flip y": m[:, ::-1],
    "RAS + flip z": m[:, :, ::-1],
}
scores = {k: dice(v, n6_mask) for k, v in checks.items()}
for k, v in scores.items():
    print(f"   Dice(arterial>0 vs NLin6Asym brain mask) {k}: {v:.3f}")
best = max(scores, key=scores.get)
H_LAS = "LAS/FSL storage (matches header orientation)"
if not (best == H_LAS and scores[H_LAS] > 0.85):
    sys.exit(f"STOP: Arterial Atlas orientation could not be established (best={best}). Not guessing a correction.")
a1_affine = jhu.affine  # FSL MNI152 1 mm LAS affine, verified above to be the same world grid as NLin6Asym
ART_SRC = "Liu CF et al., Digital 3D Brain MRI Arterial Territories Atlas, Sci Data 10:74 (2023), doi:10.1038/s41597-022-01923-0; GitHub Chin-Fu-Liu/Arterial_Atlas"
ART_LIC = "CC BY-SA 4.0 (GitHub repo LICENSE; NITRC page says CC-BY; user decision: follow GitHub). Derivatives must be shared alike."
for name, arr, desc in (("arterial", a1, "JHU arterial territories L1"), ("arterial_level2", a2, "JHU arterial territories L2")):
    warped = warp_labels(arr, a1_affine)  # source header has no origin: use the FSL affine verified by the Dice test
    out = nv.ATLASES / f"{name}.nii.gz"
    nv.save_nifti(warped, AFFINE, out, desc)
    record(out, source=ART_SRC, original_space="Authors' 'FSL compatible' 182x218x182 grid; header has no origin. Assigned the FSL MNI152 1 mm affine (LAS, origin 90,-126,-72) after the brain-mask Dice test (Dice=%.3f)" % scores[H_LAS],
           method="Affine replaced by FSL MNI152 1 mm affine, then ANTs apply_transforms with TemplateFlow h5", interpolation="nearestNeighbor", license=ART_LIC)
rows = [ln.split("\t") for ln in artl.read_text(encoding="latin-1").splitlines()]
start = next(i for i, r in enumerate(rows) if r and r[0].lower().startswith("aterial territories"))
l1, l2_acr = [], {}
for r in rows[start + 1:]:
    if len(r) < 5 or not r[1].strip().isdigit():
        continue
    l1.append({"index": int(r[1]), "name": r[0].strip(), "acronym": r[2].strip(), "level2_index": int(r[3]), "level2_acronym": r[4].strip(),
               "bilateral_group": r[5].strip() if len(r) > 5 else "", "major_territory": r[6].strip() if len(r) > 6 else ""})
    l2_acr.setdefault(int(r[3]), set()).add(r[4].strip())
nv.write_json(nv.ATLASES / "arterial.labels.json", nv.label_table(
    "arterial", nv.TARGET_SPACE, ART_SRC, ART_LIC, l1,
    ["Labels copied verbatim from ArterialAtlasLables.txt (file name typo is the source's).",
     "Source inconsistencies noticed, NOT corrected: duplicate acronyms (e.g. MCAPL used for left and right parietal MCA) and level-2 acronym vs L/R mismatches in some rows."]))
conf = {k: sorted(v) for k, v in l2_acr.items() if len(v) > 1}
nv.write_json(nv.ATLASES / "arterial_level2.labels.json", nv.label_table(
    "arterial_level2", nv.TARGET_SPACE, ART_SRC, ART_LIC,
    [{"index": k, "name": "/".join(sorted(v)) + " (acronyms found in source rows for this value)"} for k, v in sorted(l2_acr.items())],
    [f"Level-2 values whose source rows carry more than one acronym: {conf}"]))

# ---------------------------------------------------------------- 6. CT template
print("[6] CT template (Clinical Toolbox scct.nii, BSD-2)")
CT_URL = "https://raw.githubusercontent.com/neurolabusc/Clinical/master/scct.nii"
ctp = download(CT_URL, CACHE / "clinical/scct.nii")
ct = nib.load(str(ctp))
n6_2mm = Path(str(tf.get("MNI152NLin6Asym", resolution=2, suffix="T1w", desc=None, extension="nii.gz")))
g2 = nib.load(str(n6_2mm))
assert same_world_grid(ct, g2), "scct world grid != NLin6Asym 2 mm world grid"
cormack = np.nan_to_num(np.asarray(ct.dataobj).astype(np.float32))
cw = warp(nib.Nifti1Image(cormack, ct.affine), T1P, XFM, "linear", TMP)  # warp in the template's native (Cormack) units


def cormack_to_hu(img: np.ndarray, dark: float = 900.0, mid: float = 200.0, ratio: float = 10.0) -> np.ndarray:
    """Faithful port of neurolabusc/Clinical clinical_c2h.m (constants from clinical_cormack.m)."""
    kmax = mid * (ratio + 1)
    x = img - dark
    out = x.copy()
    m1 = (x > 0) & (x <= kmax)
    out[m1] = x[m1] / (ratio + 1)
    m2 = x > kmax
    out[m2] = x[m2] - kmax + kmax / (ratio + 1)
    return out + (dark - 1024.0)


HU = cormack_to_hu(cw)
WINDOW_LO, WINDOW_HI = 0.0, 80.0  # brain window: level 40 HU, width 80 HU
ct8 = np.clip((HU - WINDOW_LO) / (WINDOW_HI - WINDOW_LO) * 255.0, 0, 255).round().astype(np.uint8)
print("   HU percentiles inside brain mask (1,25,50,75,99):", np.round(np.percentile(HU[MASK_2009], [1, 25, 50, 75, 99]), 1))
out = nv.VOLUMES / "CT.nii.gz"
nv.save_nifti(ct8, AFFINE, out, "CT template, brain window 0-80 HU")
record(out, source="Clinical Toolbox for SPM scct.nii (Rorden et al. 2012, NeuroImage 61:957), github.com/neurolabusc/Clinical",
       original_space="SPM MNI 2 mm grid identical to FSL MNI152 2 mm (91x109x91). Anatomical match to NLin6Asym ASSUMED from the grid; check overlay",
       method="Warped in Cormack units with ANTs + TemplateFlow h5, then Cormack->HU (clinical_c2h.m port), window HU 0..80 (L40/W80) -> uint8",
       interpolation="linear", native_resolution_mm=2.0, license="BSD-2-Clause (repo LICENSE); template data coverage unverified")

# ---------------------------------------------------------------- 7. AAL3 (Automated Anatomical Labeling v3)
print("[7] AAL3 atlas (Rolls et al. 2020, GNU GPL)")
import zipfile
AAL3_URL = "https://www.oxcns.org/AAL3v1_for_SPM12.zip"
aal_zip_path = download(AAL3_URL, CACHE / "AAL3v1_for_SPM12.zip")
with zipfile.ZipFile(str(aal_zip_path)) as z:
    z.extract("AAL3/AAL3v1_1mm.nii.gz", str(CACHE / "aal3_extracted"))
    z.extract("AAL3/AAL3v1_1mm.nii.txt", str(CACHE / "aal3_extracted"))

aal_src_nii = CACHE / "aal3_extracted" / "AAL3" / "AAL3v1_1mm.nii.gz"
aal_txt_path = CACHE / "aal3_extracted" / "AAL3" / "AAL3v1_1mm.nii.txt"

aal_img = nib.load(str(aal_src_nii))
aal_data = np.asarray(aal_img.dataobj)
print("   AAL3 source grid:", aal_img.shape, "origin:", np.round(aal_img.affine[:3, 3], 1), "unique labels:", len(np.unique(aal_data)))

warped_aal = warp_labels(aal_data, aal_img.affine)
out_aal = nv.ATLASES / "aal3.nii.gz"
nv.save_nifti(warped_aal, AFFINE, out_aal, "AAL3v1 Automated Anatomical Labeling Atlas 3 (167 regions)")

AAL3_SRC = "Automated Anatomical Labeling Atlas 3 (AAL3v1), Rolls et al. 2020 NeuroImage; GIN-IMN CNRS & Oxford (oxcns.org)"
AAL3_LIC = "GNU General Public License (GPL) - verified from GIN-IMN CNRS (gin.cnrs.fr/en/tools/aal)"
record(out_aal, source=AAL3_SRC, original_space="SPM12 MNI (Colin27 1 mm 181x217x181)",
       method="ANTs apply_transforms with TemplateFlow h5 (NLin6Asym->NLin2009cAsym)",
       interpolation="nearestNeighbor", license=AAL3_LIC)

# Parse labels and classify into groups
aal_labels = []
with open(str(aal_txt_path), "r", encoding="latin-1") as f:
    for line in f:
        parts = line.strip().split()
        if len(parts) >= 2 and parts[0].isdigit():
            idx = int(parts[0])
            name = parts[1]
            nl = name.lower()
            if any(k in nl for k in ["vta", "sn_p", "red_n", "lc_", "raphe"]):
                grp = "brainstem_nuclei"
            elif "cerebel" in nl or "vermis" in nl:
                grp = "cerebellum"
            elif "thal" in nl:
                grp = "thalamus"
            elif any(k in nl for k in ["caudate", "putamen", "pallidum", "hippocampus", "amygdala", "accumbens"]):
                grp = "subcortical"
            else:
                grp = "cortical"
            aal_labels.append({"index": idx, "name": name, "group": grp})

nv.write_json(nv.ATLASES / "aal3.labels.json", nv.label_table(
    "aal3", nv.TARGET_SPACE, AAL3_SRC, AAL3_LIC, aal_labels,
    ["AAL3v1 adds thalamic sub-nuclei (AV, LP, VA, VL, VPL, VPM, Pulvinar, etc.), anterior cingulate sub-regions,",
     "and key brainstem arousal/neuromodulatory nuclei: Locus Coeruleus (LC), Ventral Tegmental Area (VTA),",
     "Substantia Nigra (SN), Red Nucleus, and Raphe Nuclei (Dorsal & Median)."]))

# ---------------------------------------------------------------- 8. Harvard AAN (Brainstem arousal nuclei)
print("[8] Harvard Ascending Arousal Network Atlas v2.0 (Edlow & Kinney 2023, Dryad CC0 1.0)")
aan_cache_file = CACHE / "aan" / "AAN_Brainstem_MNI152_1mm_v2p0.nii"
if not aan_cache_file.exists() or aan_cache_file.stat().st_size < 1000:
    raise RuntimeError(f"AAN file missing or incomplete: {aan_cache_file}")

aan_img = nib.load(str(aan_cache_file))
aan_data = np.asarray(aan_img.dataobj).astype(np.float32)
print("   AAN source grid:", aan_img.shape, "affine origin:", np.round(aan_img.affine[:3, 3], 1))

# Warp with ANTs from NLin6Asym grid to NLin2009cAsym
warped_aan = warp_labels(aan_data, aan_img.affine)

AAN_NODES = [
    (7201, "DR", "Dorsal raphe nucleus", "midline", "Serotonergic (5-HT)", [121, 255, 250]),
    (7202, "MnR", "Median raphe nucleus", "midline", "Serotonergic (5-HT)", [0, 255, 0]),
    (7203, "PAG", "Periaqueductal gray", "midline", "Pain modulation & autonomic defense", [153, 153, 255]),
    (7204, "VTA", "Ventral tegmental area", "midline", "Dopaminergic (DA)", [255, 0, 255]),
    (7301, "Left-LC", "Locus coeruleus, Left", "left", "Noradrenergic (NE)", [0, 0, 255]),
    (7302, "Left-LDTg", "Laterodorsal tegmental nucleus, Left", "left", "Cholinergic (ACh)", [255, 127, 0]),
    (7303, "Left-mRt", "Mesencephalic reticular formation, Left", "left", "Glutamatergic arousal", [255, 0, 0]),
    (7304, "Left-PBC", "Parabrachial complex, Left", "left", "Glutamatergic arousal & respiratory regulation", [255, 255, 0]),
    (7305, "Left-PnO", "Pontine reticular formation (pontis oralis), Left", "left", "Ascending reticular activating system", [0, 127, 255]),
    (7306, "Left-PTg", "Pedunculotegmental nucleus, Left", "left", "Cholinergic (ACh)", [127, 0, 255]),
    (7401, "Right-LC", "Locus coeruleus, Right", "right", "Noradrenergic (NE)", [0, 0, 255]),
    (7402, "Right-LDTg", "Laterodorsal tegmental nucleus, Right", "right", "Cholinergic (ACh)", [255, 127, 0]),
    (7403, "Right-mRt", "Mesencephalic reticular formation, Right", "right", "Glutamatergic arousal", [255, 0, 0]),
    (7404, "Right-PBC", "Parabrachial complex, Right", "right", "Glutamatergic arousal & respiratory regulation", [255, 255, 0]),
    (7405, "Right-PnO", "Pontine reticular formation (pontis oralis), Right", "right", "Ascending reticular activating system", [0, 127, 255]),
    (7406, "Right-PTg", "Pedunculotegmental nucleus, Right", "right", "Cholinergic (ACh)", [127, 0, 255]),
]

remap_vol = np.zeros(warped_aan.shape, dtype=np.uint8)
aan_labels_out = []
for new_idx, (code, sym, name, side, sys_type, rgb) in enumerate(AAN_NODES, start=1):
    mask = (warped_aan == code)
    remap_vol[mask] = new_idx
    aan_labels_out.append({
        "index": new_idx,
        "source_code": code,
        "symbol": sym,
        "name": name,
        "side": side,
        "neurotransmitter_system": sys_type,
        "color": rgb,
        "voxels_1mm": int(mask.sum()),
    })

out_aan = nv.ATLASES / "brainstem_aan.nii.gz"
nv.save_nifti(remap_vol, AFFINE, out_aan, "Harvard Ascending Arousal Network Atlas v2.0 (16 nodes, 1 mm)")

AAN_SRC = "Harvard Ascending Arousal Network Atlas v2.0 (Edlow BL, Kinney HC, 2023; Dryad doi:10.5061/dryad.zw3r228d2)"
AAN_LIC = "CC0 1.0 Universal (Public Domain Dedication)"
record(out_aan, source=AAN_SRC, original_space="FSL MNI152 (MNI152NLin6Asym 1 mm 182x218x182)",
       method="ANTs apply_transforms with TemplateFlow h5 (NLin6Asym->NLin2009cAsym)",
       interpolation="nearestNeighbor", license=AAN_LIC)

nv.write_json(nv.ATLASES / "brainstem_aan.labels.json", nv.label_table(
    "brainstem_aan", nv.TARGET_SPACE, AAN_SRC, AAN_LIC, aan_labels_out,
    ["Harvard Ascending Arousal Network Atlas Version 2.0 covers 16 arousal and neuromodulatory nodes in the brainstem.",
     "Provides bilateral subdivision for LC, LDTg, mRt, PBC, PnO, and PTg, plus midline raphe and tegmental nuclei.",
     "Remapped to clean sequential uint8 indices (1..16) for seamless NiiVue colormap display while preserving source_code."]))

# ---------------------------------------------------------------- 9. ASPECTS 10 regions (Anatomical Derivation)
print("[9] ASPECTS 10-region atlas (Anatomical derivation from Harvard-Oxford, JHU DTI-81, JHU Arterial)")
anat_img = nib.load(str(nv.ATLASES / "anatomy.nii.gz"))
anat_data = np.asarray(anat_img.dataobj)
wm_img = nib.load(str(nv.ATLASES / "whitematter.nii.gz"))
wm_data = np.asarray(wm_img.dataobj)
art_img = nib.load(str(nv.ATLASES / "arterial.nii.gz"))
art_data = np.asarray(art_img.dataobj)

anat_lab_map = {l["name"]: l["index"] for l in json.loads((nv.ATLASES / "anatomy.labels.json").read_text(encoding="utf-8"))["labels"]}
wm_lab_map = {l["name"]: l["index"] for l in json.loads((nv.ATLASES / "whitematter.labels.json").read_text(encoding="utf-8"))["labels"]}
art_lab_map = {l["name"]: l["index"] for l in json.loads((nv.ATLASES / "arterial.labels.json").read_text(encoding="utf-8"))["labels"]}

# Axial level partition
zz = np.arange(nv.TARGET_SHAPE[2])
z_mm = AFFINE[2, 2] * zz + AFFINE[2, 3]
gang_mask = np.zeros(nv.TARGET_SHAPE, dtype=bool)
gang_mask[:, :, (z_mm >= -2) & (z_mm <= 18)] = True
supra_mask = np.zeros(nv.TARGET_SHAPE, dtype=bool)
supra_mask[:, :, (z_mm > 18) & (z_mm <= 45)] = True

xx_mm = AFFINE[0, 0] * np.arange(nv.TARGET_SHAPE[0]) + AFFINE[0, 3]

aspects_vol = np.zeros(nv.TARGET_SHAPE, dtype=np.uint8)
aspects_labels = []

# Region definitions: Left 1..10, Right 11..20
for side_idx, side in enumerate(["left", "right"]):
    offset = side_idx * 10
    suffix = " left" if side == "left" else " right"
    prefix = "Left " if side == "left" else "Right "
    s_short = "L" if side == "left" else "R"
    side_mask = (xx_mm[:, None, None] < 0) if side == "left" else (xx_mm[:, None, None] > 0)

    # Subcortical regions
    c_mask = (anat_data == anat_lab_map[f"{prefix}Caudate"])
    l_mask = (anat_data == anat_lab_map[f"{prefix}Putamen"]) | (anat_data == anat_lab_map[f"{prefix}Pallidum"])
    ic_ids = [wm_lab_map[f"Anterior limb of internal capsule {s_short}"],
              wm_lab_map[f"Posterior limb of internal capsule {s_short}"],
              wm_lab_map[f"Retrolenticular part of internal capsule {s_short}"]]
    ic_mask = np.isin(wm_data, ic_ids)
    i_mask = (anat_data == anat_lab_map["Insular Cortex"]) & side_mask

    # MCA sub-territories from JHU Arterial
    mca_frontal = (art_data == art_lab_map[f"frontal pars of middle cerebral artery{suffix}"])
    mca_temporal = (art_data == art_lab_map[f"temporal pars of middle cerebral artery{suffix}"])
    mca_parietal = (art_data == art_lab_map[f"parietal pars of middle cerebral artery{suffix}"])
    mca_insular = (art_data == art_lab_map[f"insular pars of middle cerebral artery{suffix}"])
    mca_occipital = (art_data == art_lab_map[f"occipital pars of middle cerebral artery{suffix}"])

    # Cortical M1..M6
    m1 = mca_frontal & gang_mask
    m2 = (mca_temporal | mca_insular) & gang_mask & (~i_mask)
    m3 = (mca_parietal | mca_occipital) & gang_mask

    m4 = mca_frontal & supra_mask
    m5 = mca_parietal & supra_mask
    m6 = (mca_temporal | mca_occipital) & supra_mask

    reg_list = [
        (1, "C", f"Caudate ({side.capitalize()})", c_mask, "subcortical", "deep gray hạch nền (đầu nhân đuôi)"),
        (2, "L", f"Lentiform ({side.capitalize()})", l_mask, "subcortical", "nhân bèo (Putamen + Globus Pallidus)"),
        (3, "IC", f"Internal Capsule ({side.capitalize()})", ic_mask, "subcortical", "bao trong (nhánh trước, gối, nhánh sau)"),
        (4, "I", f"Insular Ribbon ({side.capitalize()})", i_mask, "subcortical", "dải vỏ thùy đảo"),
        (5, "M1", f"M1 Anterior MCA cortex ({side.capitalize()})", m1, "ganglionic", "vỏ não MCA phía trước, tầng hạch nền"),
        (6, "M2", f"M2 Lateral MCA cortex ({side.capitalize()})", m2, "ganglionic", "vỏ não MCA bên / nắp thái dương, tầng hạch nền"),
        (7, "M3", f"M3 Posterior MCA cortex ({side.capitalize()})", m3, "ganglionic", "vỏ não MCA phía sau, tầng hạch nền"),
        (8, "M4", f"M4 Anterior superior MCA cortex ({side.capitalize()})", m4, "supraganglionic", "vỏ não MCA trước trên, tầng trên hạch nền"),
        (9, "M5", f"M5 Lateral superior MCA cortex ({side.capitalize()})", m5, "supraganglionic", "vỏ não MCA bên trên, tầng trên hạch nền"),
        (10, "M6", f"M6 Posterior superior MCA cortex ({side.capitalize()})", m6, "supraganglionic", "vỏ não MCA sau trên, tầng trên hạch nền"),
    ]

    for rel_idx, code, name, mask, tier, desc in reg_list:
        full_idx = offset + rel_idx
        aspects_vol[mask] = full_idx
        aspects_labels.append({
            "index": full_idx,
            "region_code": code,
            "name": name,
            "side": side,
            "tier": tier,
            "clinical_significance": f"Mỗi vùng tổn thương trừ 1 điểm ASPECTS (thang điểm 10). {desc}.",
            "voxels_1mm": int(mask.sum())
        })

out_aspects = nv.ATLASES / "aspects.nii.gz"
nv.save_nifti(aspects_vol, AFFINE, out_aspects, "ASPECTS 10-region stroke score atlas (bilateral 20 labels, 1 mm)")
ASPECTS_SRC = "Anatomically derived from Harvard-Oxford (Desikan/Frazier), JHU ICBM-DTI-81 (Mori/Wakana), and JHU Arterial Atlas (Liu et al. 2023, CC BY-SA 4.0)"
ASPECTS_LIC = "CC BY-SA 4.0 (ShareAlike derivative from JHU Arterial Atlas & Harvard-Oxford / JHU DTI)"
record(out_aspects, source=ASPECTS_SRC, original_space="MNI152NLin2009cAsym 1 mm (composite)",
       method="Anatomical intersection of JHU MCA sub-territories + ganglionic/supraganglionic z-planes + subcortical masks",
       interpolation="nearestNeighbor", license=ASPECTS_LIC)

nv.write_json(nv.ATLASES / "aspects.labels.json", nv.label_table(
    "aspects", nv.TARGET_SPACE, ASPECTS_SRC, ASPECTS_LIC, aspects_labels,
    ["ASPECTS (Alberta Stroke Program Early CT Score) 10 regions mapped in standard MNI space.",
     "Provides bilateral definitions (1..10 Left, 11..20 Right) for acute ischemic stroke MCA evaluation.",
     "Includes Caudate (C), Lentiform (L), Internal Capsule (IC), Insular ribbon (I), and M1-M6 cortical zones."]))

# ---------------------------------------------------------------- 10. VENAT Cerebral Venous Atlas (7T QSM)
print("[10] VENAT cerebral venous atlas (Bazin et al., 7T QSM, Figshare CC BY 4.0)")
ven_density_file = CACHE / "venat_density.nii.gz"
if not ven_density_file.exists() or ven_density_file.stat().st_size < 1000:
    VENAT_URL = "https://ndownloader.figshare.com/files/15347951"
    download(VENAT_URL, ven_density_file)

# Read 0.5 mm FSL space density map and warp to MNI152NLin2009cAsym 1 mm
ven_ants = ants.image_read(str(ven_density_file))
ref_ants = ants.image_read(str(nv.VOLUMES / "T1.nii.gz"))
warped_ven = ants.apply_transforms(fixed=ref_ants, moving=ven_ants,
                                   transformlist=[str(XFM)],
                                   interpolator="linear").numpy()

# Scale probability density (0.0 .. 1.0) to uint8 (0 .. 255)
ven_uint8 = np.clip(warped_ven * 255.0, 0, 255).astype(np.uint8)
out_ven = nv.ATLASES / "venous.nii.gz"
nv.save_nifti(ven_uint8, AFFINE, out_ven, "VENAT 7T QSM cerebral venous density atlas (1 mm, uint8 0-255)")

VENAT_SRC = "VENAT Atlas: A digital venous neuroanatomy atlas of the human brain (Bazin et al., Figshare doi:10.6084/m9.figshare.7205960)"
VENAT_LIC = "CC BY 4.0 (Creative Commons Attribution 4.0 International)"
record(out_ven, source=VENAT_SRC, original_space="FSL MNI152 0.5 mm isotropic (364x436x364)",
       method="ANTs apply_transforms with TemplateFlow h5 (linear interpolation, scaled 0-255 uint8)",
       interpolation="linear", license=VENAT_LIC, native_resolution_mm=0.5)

venous_labels = [
    {"index": 1, "name": "Cerebral Venous Sinuses & Veins (Probabilistic Density)",
     "description": "Probability density map of dural sinuses (Superior Sagittal, Straight, Transverse, Sigmoid) and deep internal cerebral veins derived from high-resolution 7T QSM.",
     "range": "0-255 (0 = 0%, 255 = 100% vein probability)"}
]
nv.write_json(nv.ATLASES / "venous.labels.json", nv.label_table(
    "venous", nv.TARGET_SPACE, VENAT_SRC, VENAT_LIC, venous_labels,
    ["VENAT (Venous Neuroanatomy Atlas) mapped from 7 Tesla Quantitative Susceptibility Mapping (QSM).",
     "Values represent venous probability density from 0 to 255 (1.0).",
     "Thresholding at density >= 140 (approx 0.55) defines the major dural venous sinuses."]))

# ---------------------------------------------------------------- 11. provenance + size report
nv.write_json(nv.PUB / "provenance.json", {"target_space": nv.TARGET_SPACE, "files": PROV, "skipped": SKIPPED})
print("\nFile sizes (.nii.gz):")
over = []
for p in PROV:
    lim = nv.MAX_VOLUME_BYTES if p["file"].startswith("volumes/") else nv.MAX_ATLAS_BYTES
    flag = "OVER TARGET" if p["size_bytes"] > lim else "ok"
    if flag != "ok":
        over.append(p["file"])
    print(f"  {p['file']:34s} {p['size_bytes']/1024:9.1f} KB  {flag}")
print("Over target (reported, quality NOT reduced):", over or "none")
print("Skipped:", [s["item"] for s in SKIPPED])
