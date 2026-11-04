"""02 - Generate 3D meshes (GIFTI .gii) in the SAME mm coordinate system as the volumes.

Pipeline per structure
----------------------
label volume (already in MNI152NLin2009cAsym) -> binary mask -> Gaussian pre-smoothing (sigma 0.8 vox)
-> skimage.measure.marching_cubes (level 0.5, voxel coords) -> voxel->mm with the T1 affine
-> keep large components -> trimesh Taubin smoothing -> trimesh quadric decimation -> GIFTI (nibabel).

Sources are the atlases written by 01 (Harvard-Oxford, JHU Arterial). Not generated, no verified source:
Circle of Willis, venous sinuses, third/fourth ventricles (HO only labels the lateral ventricles).

Format: GIFTI (.gii). .mz3 is NOT written (nibabel cannot, and no trusted writer is installed).
Correctness checks: (1) GIFTI round trip with nibabel (vertices/faces equal), (2) vertex-to-mask
distance check, which also proves the mm alignment, is done in 04_validate.py.

Run:  python 02_generate_3d_meshes.py
"""
from __future__ import annotations

import json

import nv_common as nv  # noqa: F401

import nibabel as nib
import numpy as np
import trimesh
from nibabel.gifti import GiftiCoordSystem, GiftiDataArray, GiftiImage
from scipy import ndimage as ndi
from skimage import measure
from trimesh import smoothing

T1 = nib.load(str(nv.VOLUMES / "T1.nii.gz"))
AFF = T1.affine
assert T1.shape == nv.TARGET_SHAPE
DET_POSITIVE = np.linalg.det(AFF[:3, :3]) > 0

nv.MESHES.mkdir(parents=True, exist_ok=True)
MANIFEST: list[dict] = []
SRC_HO = "Harvard-Oxford (FSL) via 01_fetch_and_resample.py; see atlases/anatomy.labels.json"
SRC_ART = "JHU Arterial Atlas (Liu 2023, CC BY-SA 4.0) via 01_fetch_and_resample.py; see atlases/arterial.labels.json"


def load_atlas(name: str) -> np.ndarray:
    return np.asarray(nib.load(str(nv.ATLASES / f"{name}.nii.gz")).dataobj).astype(np.int32)


def labels_by_name(atlas: str) -> dict[str, int]:
    j = json.loads((nv.ATLASES / f"{atlas}.labels.json").read_text(encoding="utf-8"))
    return {lab["name"]: lab["index"] for lab in j["labels"]}


def largest_components(mask: np.ndarray, keep_frac: float = 0.02) -> np.ndarray:
    lab, n = ndi.label(mask)
    if n <= 1:
        return mask
    sizes = np.bincount(lab.ravel())[1:]
    keep = [i + 1 for i, s in enumerate(sizes) if s >= keep_frac * sizes.max()]
    return np.isin(lab, keep)


def mask_to_mesh(mask: np.ndarray, target_faces: int, closing: int = 0) -> tuple[trimesh.Trimesh, dict]:
    m = mask.astype(bool)
    if closing:
        m = ndi.binary_closing(m, structure=ndi.generate_binary_structure(3, 1), iterations=closing)
        m = ndi.binary_fill_holes(m)
    m = largest_components(m)
    pad = 3
    vol = np.pad(m.astype(np.float32), pad)
    vol = ndi.gaussian_filter(vol, 0.8)
    verts, faces, _, _ = measure.marching_cubes(vol, level=0.5, spacing=(1.0, 1.0, 1.0))
    verts = verts - pad  # back to voxel index coordinates of the volume
    verts_mm = nib.affines.apply_affine(AFF, verts)  # voxel -> mm (RAS+, same as volume)
    if not DET_POSITIVE:
        faces = faces[:, ::-1]
    mesh = trimesh.Trimesh(vertices=verts_mm, faces=faces, process=True)
    comps = mesh.split(only_watertight=False)
    if len(comps) > 1:
        mesh = max(comps, key=lambda c: len(c.faces))
    n0, vol0 = len(mesh.faces), abs(mesh.volume) if mesh.is_watertight else float("nan")
    smoothing.filter_taubin(mesh, lamb=0.5, nu=0.5, iterations=10)
    if len(mesh.faces) > target_faces:
        mesh = mesh.simplify_quadric_decimation(face_count=target_faces)
    vol1 = abs(mesh.volume) if mesh.is_watertight else float("nan")
    stats = {"faces_before": int(n0), "faces_after": int(len(mesh.faces)), "watertight": bool(mesh.is_watertight),
             "volume_mm3_before": None if np.isnan(vol0) else round(float(vol0), 1),
             "volume_mm3_after": None if np.isnan(vol1) else round(float(vol1), 1)}
    return mesh, stats


def write_gifti(mesh: trimesh.Trimesh, path) -> None:
    cs = GiftiCoordSystem(dataspace="NIFTI_XFORM_MNI_152", xformspace="NIFTI_XFORM_MNI_152", xform=np.eye(4))
    v = GiftiDataArray(np.asarray(mesh.vertices, np.float32), intent="NIFTI_INTENT_POINTSET", datatype="NIFTI_TYPE_FLOAT32", coordsys=cs)
    f = GiftiDataArray(np.asarray(mesh.faces, np.int32), intent="NIFTI_INTENT_TRIANGLE", datatype="NIFTI_TYPE_INT32")
    nib.save(GiftiImage(darrays=[v, f]), str(path))
    back = nib.load(str(path))  # round-trip check
    bv, bf = back.darrays[0].data, back.darrays[1].data
    assert np.allclose(bv, np.asarray(mesh.vertices, np.float32)) and np.array_equal(bf, np.asarray(mesh.faces, np.int32)), f"GIFTI round trip failed: {path.name}"


def emit(name: str, mask: np.ndarray, target_faces: int, group: str, source: str, what: str, closing: int = 0, side: str | None = None) -> None:
    if mask.sum() < 50:
        print(f"  SKIP {name}: mask too small ({int(mask.sum())} voxels)")
        return
    mesh, st = mask_to_mesh(mask, target_faces, closing)
    path = nv.MESHES / f"{name}.gii"
    write_gifti(mesh, path)
    b = mesh.bounds
    MANIFEST.append({"file": path.name, "group": group, "side": side, "description": what, "source": source,
                     "review_status": "unreviewed", "mask_voxels": int(mask.sum()),
                     "bounds_mm": [np.round(b[0], 1).tolist(), np.round(b[1], 1).tolist()], **st,
                     "size_bytes": path.stat().st_size})
    print(f"  {name:38s} faces {st['faces_after']:6d}  watertight={st['watertight']}  {path.stat().st_size/1024:7.1f} KB")


# ------------------------------------------------------------------ hemispheres (translucent shell)
print("[hemispheres]")
hemi = load_atlas("hemispheres")
for val, nm in ((1, "left"), (2, "right")):
    emit(f"hemisphere_{nm}", hemi == val, 60000, "cortex", SRC_HO,
         f"{nm.capitalize()} hemisphere envelope = union of Harvard-Oxford {nm}-side labels, morphologically closed (2 iterations) and hole-filled; "
         "NOT a pial surface", closing=2, side=nm)

# ------------------------------------------------------------------ ventricles + deep grey + brainstem
print("[anatomy: ventricles, deep grey, brainstem]")
anat, names = load_atlas("anatomy"), labels_by_name("anatomy")
wanted = [("Left Lateral Ventricle", "ventricle_lateral_left", "ventricles", "left"),
          ("Right Lateral Ventricle", "ventricle_lateral_right", "ventricles", "right"),
          ("Brain-Stem", "brainstem", "brainstem", None)]
for st in ("Thalamus", "Caudate", "Putamen", "Pallidum", "Hippocampus", "Amygdala", "Accumbens"):
    for side in ("Left", "Right"):
        wanted.append((f"{side} {st}", f"{st.lower()}_{side.lower()}", "deep_grey", side.lower()))
for label, fname, group, side in wanted:
    if label not in names:
        print(f"  SKIP {fname}: label '{label}' not found")
        continue
    emit(fname, anat == names[label], 20000, group, SRC_HO, f"Harvard-Oxford label '{label}' (maxprob thr25)", side=side)

# ------------------------------------------------------------------ arterial territories
print("[arterial territories]")
art = load_atlas("arterial")
rows = json.loads((nv.ATLASES / "arterial.labels.json").read_text(encoding="utf-8"))["labels"]
for terr in ("ACA", "MCA", "PCA", "VB"):
    for side in ("left", "right"):
        ids = [r["index"] for r in rows if r["bilateral_group"] == terr and r["name"].lower().rstrip().endswith(side)]
        if not ids:
            print(f"  SKIP {terr} {side}: no rows")
            continue
        emit(f"territory_{terr.lower()}_{side}", np.isin(art, ids), 30000, "arterial_territory", SRC_ART,
             f"{terr} {side} territory = union of JHU Arterial Atlas level-1 labels {ids} grouped by the source 'level2_bilateral' column and the side word in the label name",
             side=side)

nv.write_json(nv.MESHES / "manifest.json", {"coordinate_system": "MNI152NLin2009cAsym, mm, RAS+ (same as volumes)", "format": "GIFTI .gii (nibabel)",
                                             "not_generated": ["Circle of Willis", "venous sinuses", "third/fourth ventricles", ".mz3 export"],
                                             "meshes": MANIFEST})
print(f"\n{len(MANIFEST)} meshes written to {nv.MESHES}")
print("Not generated (no verified source): Circle of Willis, venous sinuses, 3rd/4th ventricles.")
