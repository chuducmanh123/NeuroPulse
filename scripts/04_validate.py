"""04 - Validate the NeuroVision static data.

Checks
------
1. Every .nii.gz under volumes/ and atlases/ has the same shape/affine/1 mm voxels as the reference T1.
2. LEFT/RIGHT sanity (asymmetric, unlike a brain-mask Dice test): labels that carry a side in their
   name must have their centroid on the correct side of the MNI midline (patient left = negative x).
3. MNI (0,0,0) vs the Anterior Commissure on T1 (heuristic + crosshair PNG; the visual check is the real test).
4. PNG overlays (3 planes) of every atlas on T1 in scripts/validation/, plus CT/T2 vs T1 brain-mask contour.
5. Meshes: GIFTI readable, vertices inside the volume box, and vertex-to-mask distance (mm alignment).
6. File size table.

Exit code 1 if a hard check fails.   Run: python 04_validate.py
"""
from __future__ import annotations

import json
import sys

import nv_common as nv  # noqa: F401

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import nibabel as nib
import numpy as np
from matplotlib.colors import ListedColormap
from scipy import ndimage as ndi

FAILS: list[str] = []


def check(cond: bool, msg: str) -> None:
    print(("  PASS  " if cond else "  FAIL  ") + msg)
    if not cond:
        FAILS.append(msg)


t1_img = nib.load(str(nv.VOLUMES / "T1.nii.gz"))
T1 = np.asarray(t1_img.dataobj).astype(np.float32)
AFF = t1_img.affine
INV = np.linalg.inv(AFF)
MASK = np.asarray(nib.load(str(nv.VOLUMES / "brainmask.nii.gz")).dataobj) > 0
nv.VALIDATION.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- 1. grid
print("[1] shape / affine / voxel size vs reference T1")
check(t1_img.shape == nv.TARGET_SHAPE, f"T1 shape {t1_img.shape} == {nv.TARGET_SHAPE}")
files = sorted(list(nv.VOLUMES.glob("*.nii.gz")) + list(nv.ATLASES.glob("*.nii.gz")))
for p in files:
    im = nib.load(str(p))
    ok = im.shape == t1_img.shape and np.allclose(im.affine, AFF, atol=1e-4) and np.allclose(im.header.get_zooms()[:3], 1.0)
    check(ok, f"{p.parent.name}/{p.name}: shape {im.shape}, zooms {tuple(np.round(im.header.get_zooms()[:3], 3))}, dtype {im.get_data_dtype()}")

# ---------------------------------------------------------------- 2. left / right
print("[2] left/right orientation (centroid x of side-labelled structures; left must be x<0)")


def centroid_x(arr: np.ndarray, ids) -> float:
    idx = np.argwhere(np.isin(arr, ids))
    return float(nib.affines.apply_affine(AFF, idx).mean(0)[0]) if len(idx) else float("nan")


def load(name: str) -> np.ndarray:
    return np.asarray(nib.load(str(nv.ATLASES / f"{name}.nii.gz")).dataobj).astype(np.int32)


def labels(name: str) -> list[dict]:
    return json.loads((nv.ATLASES / f"{name}.labels.json").read_text(encoding="utf-8"))["labels"]


hemi = load("hemispheres")
xl, xr = centroid_x(hemi, [1]), centroid_x(hemi, [2])
check(xl < -10 and xr > 10, f"hemispheres: left centroid x={xl:.1f}, right x={xr:.1f}")

anat = load("anatomy")
for lab in labels("anatomy"):
    n = lab["name"]
    if n.startswith(("Left ", "Right ")) and (anat == lab["index"]).sum() > 50:
        x = centroid_x(anat, [lab["index"]])
        check((x < 0) if n.startswith("Left ") else (x > 0), f"anatomy '{n}': x={x:.1f}")

art = load("arterial")
bad = 0
for lab in labels("arterial"):
    nm = lab["name"].lower().rstrip()
    side = "left" if nm.endswith("left") else "right" if nm.endswith("right") else None
    if side and (art == lab["index"]).sum() > 50:
        x = centroid_x(art, [lab["index"]])
        ok = (x < 0) if side == "left" else (x > 0)
        bad += (not ok)
        if not ok:
            print(f"        wrong side: arterial label {lab['index']} '{lab['name']}' x={x:.1f}")
check(bad == 0, f"arterial: all side-named labels on the correct side ({bad} wrong)")

wm = load("whitematter")
for lab in labels("whitematter"):
    nm = lab["name"].strip()
    side = "right" if nm.endswith(" R") else "left" if nm.endswith(" L") else None
    if side and (wm == lab["index"]).sum() > 50:
        x = centroid_x(wm, [lab["index"]])
        check((x > 0) if side == "right" else (x < 0), f"whitematter '{nm}': x={x:.1f}")

# ---------------------------------------------------------------- 3. anterior commissure
print("[3] MNI (0,0,0) vs anterior commissure (heuristic; verify the PNG by eye)")
v = np.rint(nib.affines.apply_affine(INV, [0, 0, 0])).astype(int)
print(f"   voxel of MNI (0,0,0): {v.tolist()}, T1 value {T1[tuple(v)]:.1f}; brain p50/p90 {np.percentile(T1[MASK], [50, 90]).round(1).tolist()}")
sm = ndi.gaussian_filter(T1, 0.7)
zz, yy, xx = np.meshgrid(np.arange(-12, 13), np.arange(-12, 13), np.arange(-12, 13), indexing="ij")
rr = np.sqrt(xx ** 2 + yy ** 2 + zz ** 2)
sl = tuple(slice(c - 12, c + 13) for c in v)
box = sm[sl]
inner, ring = rr <= 3, (rr >= 6) & (rr <= 10)
contrast = float(box[inner].max() - np.median(box[ring]))
off = np.unravel_index(np.argmax(np.where(inner, box, -1)), box.shape)
print(f"   brightest voxel within 3 mm is {np.round(np.array(off[::-1]) - 12, 1).tolist()} mm (x,y,z offset); contrast to 6-10 mm ring: {contrast:.1f}")
check(contrast > 0, "bright (white-matter-like) structure within 3 mm of MNI origin (HEURISTIC, not proof)")

# ---------------------------------------------------------------- 4. overlays
print("[4] overlays -> scripts/validation/")


def planes(c):  # c = voxel index
    return [("sagittal", T1[c[0], :, :].T, (c[1], c[2])), ("coronal", T1[:, c[1], :].T, (c[0], c[2])), ("axial", T1[:, :, c[2]].T, (c[0], c[1]))]


def grab(arr, kind, c):
    return {"sagittal": arr[c[0], :, :], "coronal": arr[:, c[1], :], "axial": arr[:, :, c[2]]}[kind].T


def vox(mm):
    return np.clip(np.rint(nib.affines.apply_affine(INV, mm)).astype(int), 0, np.array(nv.TARGET_SHAPE) - 1)


def cmap_for(n: int) -> ListedColormap:
    rng = np.random.default_rng(7)
    cols = rng.uniform(0.15, 1.0, (n + 1, 4))
    cols[:, 3] = 0.55
    cols[0] = (0, 0, 0, 0)
    return ListedColormap(cols)


def overlay_png(name: str, over: np.ndarray | None, kind: str) -> None:
    pts = [("centre of mass", None), ("MNI (-30,-20,10)", vox([-30, -20, 10])), ("MNI (0,0,0)", vox([0, 0, 0]))]
    if over is not None and (over > 0).any():
        pts[0] = ("centre of mass", np.rint(ndi.center_of_mass(over > 0)).astype(int))
    else:
        pts[0] = ("MNI (0,-20,10)", vox([0, -20, 10]))
    fig, axes = plt.subplots(len(pts), 3, figsize=(12, 4 * len(pts)))
    cm = cmap_for(int(over.max())) if (over is not None and kind == "label") else None
    for r, (title, c) in enumerate(pts):
        for k, (pl, img, _) in enumerate(planes(c)):
            ax = axes[r, k]
            if kind == "volume":
                ax.imshow(grab(over, pl, c), cmap="gray", origin="lower", vmin=0, vmax=255)
            else:
                ax.imshow(img, cmap="gray", origin="lower")
                if over is not None:
                    ax.imshow(grab(over, pl, c), cmap=cm, origin="lower", interpolation="nearest", vmin=0, vmax=cm.N - 1)
            ax.contour(grab(MASK.astype(float), pl, c), levels=[0.5], colors="cyan", linewidths=0.6)
            ax.set_title(f"{name} - {pl} @ {title}", fontsize=8)
            ax.set_xticks([]); ax.set_yticks([])
            if pl != "sagittal":
                ax.text(0.01, 0.5, "L", transform=ax.transAxes, color="yellow"); ax.text(0.96, 0.5, "R", transform=ax.transAxes, color="yellow")
    fig.suptitle(f"{name} over T1 (cyan = T1 brain mask outline). Check boundaries by eye.", fontsize=9)
    fig.tight_layout()
    out = nv.VALIDATION / f"overlay_{name}.png"
    fig.savefig(out, dpi=70)
    plt.close(fig)
    print("   ", out.name)


for p in sorted(nv.ATLASES.glob("*.nii.gz")):
    overlay_png(p.name.replace(".nii.gz", ""), load(p.name.replace(".nii.gz", "")), "label")
for nm in ("CT", "T2"):
    overlay_png(nm, np.asarray(nib.load(str(nv.VOLUMES / f"{nm}.nii.gz")).dataobj), "volume")

# crosshair at MNI origin
fig, axes = plt.subplots(1, 3, figsize=(12, 4))
for ax, (pl, img, (a, b)) in zip(axes, planes(v)):
    ax.imshow(img, cmap="gray", origin="lower"); ax.axvline(a, color="r", lw=0.4); ax.axhline(b, color="r", lw=0.4)
    ax.set_xlim(a - 30, a + 30); ax.set_ylim(b - 30, b + 30); ax.set_title(f"T1 {pl} at MNI (0,0,0)", fontsize=8); ax.set_xticks([]); ax.set_yticks([])
fig.tight_layout(); fig.savefig(nv.VALIDATION / "crosshair_ac.png", dpi=80); plt.close(fig)
print("    crosshair_ac.png")

# ---------------------------------------------------------------- 5. meshes
print("[5] meshes")
man = nv.MESHES / "manifest.json"
if man.exists():
    box_lo = nib.affines.apply_affine(AFF, [0, 0, 0]); box_hi = nib.affines.apply_affine(AFF, np.array(nv.TARGET_SHAPE) - 1)
    lo, hi = np.minimum(box_lo, box_hi), np.maximum(box_lo, box_hi)
    src = {"hemisphere": ("hemispheres", None), "ventricle": ("anatomy", None), "brainstem": ("anatomy", None)}
    for m in json.loads(man.read_text(encoding="utf-8"))["meshes"]:
        g = nib.load(str(nv.MESHES / m["file"]))
        verts = g.darrays[0].data.astype(float)
        inside = bool((verts >= lo - 1).all() and (verts <= hi + 1).all())
        # distance from every vertex to the nearest voxel of the mask the mesh was built from
        mask = None
        a_name = None
        if m["group"] == "cortex":
            a_name, mask = "hemispheres", load("hemispheres") == (1 if m["side"] == "left" else 2)
        elif m["group"] in ("ventricles", "brainstem", "deep_grey"):
            a_name = "anatomy"; lab = m["description"].split("'")[1]
            mask = anat == {l["name"]: l["index"] for l in labels("anatomy")}[lab]
        elif m["group"] == "arterial_territory":
            a_name = "arterial"; terr = m["file"].split("_")[1].upper()
            ids = [r["index"] for r in labels("arterial") if r["bilateral_group"] == terr and r["name"].lower().rstrip().endswith(m["side"])]
            mask = np.isin(art, ids)
        dt = ndi.distance_transform_edt(~mask)
        vv = np.rint(nib.affines.apply_affine(INV, verts)).astype(int)
        vv = np.clip(vv, 0, np.array(nv.TARGET_SHAPE) - 1)
        d = dt[vv[:, 0], vv[:, 1], vv[:, 2]]
        # Hemisphere envelopes are closed/filled, so they may lie a little outside the raw mask.
        tol = 4.0 if m["group"] == "cortex" else 2.5
        check(inside and np.percentile(d, 99) <= tol, f"{m['file']}: inside box={inside}, vertex distance to source mask p50={np.median(d):.2f} p99={np.percentile(d, 99):.2f} mm (tol {tol})")
else:
    print("   no meshes/manifest.json (run 02 first)")

# ---------------------------------------------------------------- 6. sizes
print("[6] file sizes")
print(f"   {'file':44s} {'KB':>10s}  target")
for p in sorted(nv.PUB.rglob("*")):
    if p.is_file() and p.suffix in (".gz", ".gii", ".json") :
        kb = p.stat().st_size / 1024
        rel = str(p.relative_to(nv.PUB)).replace("\\", "/")
        tgt = ""
        if p.name.endswith(".nii.gz"):
            lim = nv.MAX_VOLUME_BYTES if rel.startswith("volumes/") else nv.MAX_ATLAS_BYTES
            tgt = "OVER" if p.stat().st_size > lim else "ok"
        print(f"   {rel:44s} {kb:10.1f}  {tgt}")

print("\nRESULT:", "ALL HARD CHECKS PASSED" if not FAILS else f"{len(FAILS)} FAILED")
for f in FAILS:
    print("  -", f)
sys.exit(1 if FAILS else 0)
