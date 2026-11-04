"""01 - Fetch data and bring everything into MNI152NLin2009cAsym (193x229x193, 1 mm).

Anatomical correctness note
---------------------------
Atlases that live in another space (FSL's MNI152NLin6Asym) are NOT resampled with a
header-only resampler. They are warped with the official TemplateFlow transform
(tpl-MNI152NLin2009cAsym_from-MNI152NLin6Asym_mode-image_xfm.h5) through ANTs (antspyx),
nearest-neighbour for label images, linear for intensity images.

Not produced (no verified source/licence, see atlas_inventory.md): AAL3, ASPECTS, venous
territories, brainstem nuclei (Harvard AAN). Nothing is substituted for them.

Run:  python 01_fetch_and_resample.py
"""
from __future__ import annotations

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
    {"item": "AAL3", "reason": "Licence not read from the original source; space is SPM12 MNI 2 mm (unverified)."},
    {"item": "ASPECTS 10-region atlas", "reason": "ASPECTS-281 is split into BGL/SGL age-specific CT templates; relation to MNI unverified."},
    {"item": "Venous territory atlas", "reason": "No verified source. VENAT is a vessel density atlas, not territories."},
    {"item": "Brainstem nuclei (Harvard AAN v2)", "reason": "Files/space not checked yet (licence CC0 verified)."},
    {"item": "Circle of Willis / venous sinus meshes", "reason": "No verified vessel source in MNI."},
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

# ---------------------------------------------------------------- 7. provenance + size report
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
