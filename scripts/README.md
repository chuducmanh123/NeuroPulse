# NeuroVision data pipeline (Phase 1A)

Builds the static assets in `public/neurovision/` in **MNI152NLin2009cAsym, 1 mm, 193×229×193**
(TemplateFlow `res-01`; origin −96, −132, −78; RAS+). Licences: see [LICENSES.md](LICENSES.md). Source inventory: [atlas_inventory.md](atlas_inventory.md).

## Setup (Windows, tested)
```powershell
# Python 3.13 (3.15 does not work: no PyYAML wheel -> templateflow cannot be installed)
py -3.13 -m venv scripts\.venv    # or the full path to python.exe 3.13
scripts\.venv\Scripts\python.exe -m pip install -r scripts\requirements.txt
```
`antspyx` is **required in practice**: it applies the TemplateFlow `.h5` transform that moves FSL-space atlases
(Harvard-Oxford, JHU, Arterial, CT) into NLin2009cAsym. `truststore` makes Python use the Windows certificate store
(TemplateFlow S3 failed certificate verification with the bundled certifi CA; verification is NOT disabled).

## Run
```powershell
scripts\.venv\Scripts\python.exe scripts\01_fetch_and_resample.py   # downloads (~250 MB cache in scripts\.cache) + resample
scripts\.venv\Scripts\python.exe scripts\02_generate_3d_meshes.py   # GIFTI meshes
scripts\.venv\Scripts\python.exe scripts\04_validate.py             # checks + PNGs in scripts\validation\
```
(`03` is reserved for Session 1B: `public/neurovision/data/`.)

## What 01 does
| Output | Source | How it reaches the target space | Interpolation |
|---|---|---|---|
| `volumes/T1`, `T2` (uint8) | TemplateFlow NLin2009cAsym | native grid; percentile 1–99.5 → 0–255 | n/a |
| `volumes/brainmask` | TemplateFlow | native grid | n/a |
| `volumes/CT` (uint8) | Clinical Toolbox `scct.nii` (2 mm, **Cormack units**) | ANTs + TemplateFlow h5 (see CT) | linear |
| `atlases/anatomy` (uint8) | Harvard-Oxford cortical (1–48) + subcortical/WM/ventricle (49+) | ANTs + h5 | nearestNeighbor |
| `atlases/hemispheres` | Harvard-Oxford sub atlas Left*/Right* labels (1 = left, 2 = right) | ANTs + h5 | nearestNeighbor |
| `atlases/whitematter` | JHU ICBM-DTI-81 (FSL) | ANTs + h5 | nearestNeighbor |
| `atlases/arterial`, `arterial_level2` | JHU Arterial Atlas (`Atlas_182`) | affine assigned (see below), then ANTs + h5 | nearestNeighbor |
| `atlases/*.labels.json` | the sources' own label tables | – | – |
| `provenance.json` | per file: source, original space, method, interpolation, licence, `review_status` | – | – |

`resample_to_img` is **not** used for anything: FSL-space files are warped with the official transform, not just re-gridded.
Every label table and provenance entry carries `source` and `review_status: "unreviewed"`; only a human changes it.

### CT window (parameters)
`scct.nii` is stored in **Cormack units**, not Hounsfield. The pipeline warps it in Cormack units, converts to HU with a port of
`clinical_c2h.m` (`kUninterestingDarkUnits = 900`, `kInterestingMidUnits = 200`, `kScaleRatio = 10`), then applies a **brain window
level 40 HU / width 80 HU (0 … 80 HU)** and scales to uint8 0–255. HU percentiles inside the brain mask (1/25/50/75/99 %): 4.5 / 24.2 / 29.3 / 36.0 / 82.1.
The template is a smooth average at 2 mm: native resolution is 2 mm, so the 1 mm volume is interpolated.

### Arterial Atlas orientation (important)
The NIfTI header has no MNI origin (`diag(−1,1,1)`, origin 0). The authors call the grid "FSL compatible". The pipeline therefore assigns the FSL MNI152
1 mm affine **only after** testing six orientation hypotheses against the NLin6Asym brain mask. This test cannot tell left from right (the brain is nearly symmetric:
0.946 vs 0.934), so left/right is verified separately in `04_validate.py` from side-named labels (all consistent).

## What 02 does
`marching_cubes` (level 0.5 on a Gaussian-smoothed mask, σ = 0.8 voxel) → voxel→mm with the T1 affine → largest components → trimesh Taubin smoothing
(λ = 0.5, ν = 0.5, 10 iterations) → trimesh quadric decimation (`fast-simplification`) → GIFTI via nibabel (+ round-trip check).
27 meshes: 2 hemisphere envelopes, 2 lateral ventricles, brainstem, 14 deep grey structures, 8 arterial territories (ACA/MCA/PCA/VB × L/R).
`.mz3` is not written (nibabel cannot; no trusted writer). Not generated: Circle of Willis, venous sinuses, 3rd/4th ventricles.
`meshes/manifest.json` lists each mesh with source, bounds, and `review_status`.
Hemisphere meshes are **morphological envelopes of Harvard-Oxford labels, not pial surfaces**.

## What 04 checks
Grid equality for every `.nii.gz`; left/right centroid sanity; MNI (0,0,0) vs AC (heuristic + `validation/crosshair_ac.png`);
atlas overlays on T1 (`validation/overlay_*.png`, cyan = brain-mask outline); mesh vs source-mask distance; file sizes.

## Known limits
- `T1`/`T2` are ≈5.6 / 5.0 MB (> 3 MB target). Reported, not degraded.
- Harvard-Oxford has no cerebellum; arterial territories extend slightly beyond the brain mask at the lower edge.
- Harvard-Oxford cortical labels are not split left/right in the source.
- Mesh coordinate frame vs NiiVue has NOT been tested (NiiVue is not installed yet): to be verified in Phase 2 from the installed version's typings.
