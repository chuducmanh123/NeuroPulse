# Licences and required citations (NeuroVision data)

Verified 2026-11-04 by reading the source (API field, LICENSE file or licence page). Items marked **UNVERIFIED** were not read from the source.
This file is not legal advice. Items marked **ACTION** need a human decision before public release.

## Data currently shipped in `public/neurovision/`

### 1. MNI152NLin2009cAsym templates (T1w, T2w, brain mask) – `volumes/T1`, `T2`, `brainmask`
- Source: TemplateFlow `tpl-MNI152NLin2009cAsym` (res-01).
- Licence (verbatim from the TemplateFlow repo `LICENSE`): "Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is hereby granted, provided that the above copyright notice appear in all copies. The authors and McGill University make no representations about the suitability of this software for any purpose. It is provided "as is" without express or implied warranty. The authors are not responsible for any data loss, equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this software package."
- Cite: Fonov VS, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased average age-appropriate atlases for pediatric studies. NeuroImage 54(1):313–327 (2011). doi:10.1016/j.neuroimage.2010.07.033
- Cite: Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. NeuroImage 47(S1):S102 (2009). doi:10.1016/S1053-8119(09)70884-5
- Cite: Ciric R et al. TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models. Nature Methods 19:1568–1571 (2022).

### 2. Transform NLin6Asym → NLin2009cAsym (used, not redistributed)
- Source: TemplateFlow. Licence **UNVERIFIED**. Not copied into `public/`.

### 3. Harvard-Oxford (FSL) – `atlases/anatomy`, `atlases/hemispheres` and the Harvard-Oxford-based meshes
- Source: nilearn 0.14.1 `fetch_atlas_harvard_oxford`, data from FSL.
- Licence: **FSL licence – free for non-commercial use only**; "Use for which any financial return is received shall be defined as commercial use." Redistribution is allowed without permission only if done without financial return, the licence conditions are imposed on the receiver and all source is included (https://fsl.fmrib.ox.ac.uk/fsl/docs/license.html).
- **ACTION:** user decided on 2026-11-04 to use it. Keep the site non-commercial, show the licence/attribution in the UI, and re-check before any monetisation.
- Cite: Makris N et al. Schizophr Res 83:155–171 (2006); Frazier JA et al. Am J Psychiatry 162:1256–1265 (2005); Desikan RS et al. NeuroImage 31:968–980 (2006); Goldstein JM et al. Biol Psychiatry 61:935–945 (2007). (As listed by nilearn; check against the originals.)
- Also cite FSL: Jenkinson M et al. NeuroImage 62:782–790 (2012); Smith SM et al. NeuroImage 23:S208–S219 (2004).

### 4. JHU ICBM-DTI-81 white-matter labels – `atlases/whitematter`
- Source: FSL package `fsl-data_atlases` 2103.0 (fsl.fmrib.ox.ac.uk/fsldownloads/fslconda).
- Licence: FSL licence (as above). **ACTION:** same decision as #3.
- Cite: Mori S et al. MRI Atlas of Human White Matter. Elsevier (2005); Wakana S et al. NeuroImage 36:630–644 (2007); Hua K et al. NeuroImage 39:336–347 (2008). **UNVERIFIED** (taken from the atlas' usual citation, not read from the FSL package).

### 5. JHU Arterial Atlas – `atlases/arterial`, `arterial_level2` and the territory meshes
- Source: github.com/Chin-Fu-Liu/Arterial_Atlas (`data/Atlas_182`).
- Licence: **CC BY-SA 4.0** (GitHub LICENSE + README; label file: "© 2021 The Johns Hopkins University ... Creative Commons Attribution-ShareAlike 4.0"). NITRC page says "Attribution" and the paper is CC BY 4.0: the sources disagree and the user chose to follow GitHub.
- **ACTION:** share-alike. Derived files (our resampled atlases and meshes) must be released under CC BY-SA 4.0 with attribution and an indication that changes were made (resampled to MNI152NLin2009cAsym; meshes). Consider asking the authors to confirm.
- Cite: Liu CF, Hsu J, Xu X, et al. Digital 3D Brain MRI Arterial Territories Atlas. Scientific Data 10:74 (2023). doi:10.1038/s41597-022-01923-0

### 6. CT template – `volumes/CT`
- Source: Clinical Toolbox for SPM, `scct.nii` (github.com/neurolabusc/Clinical).
- Licence: BSD 2-Clause (repo LICENSE, © 2021 Chris Rorden). Whether the template data are covered by this repo licence is **UNVERIFIED**.
- Required notice (BSD-2): "Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer." / "Redistributions in binary form must reproduce the above copyright notice ... in the documentation and/or other materials provided with the distribution." The full text is at https://github.com/neurolabusc/Clinical/blob/master/LICENSE and must be reproduced in the application's legal page.
- Cite: Rorden C, Bonilha L, Fridriksson J, Bender B, Karnath HO. Age-specific CT and MRI templates for spatial normalization. NeuroImage 61(4):957–965 (2012).

## Not shipped (no verified source/licence; nothing substituted)
| Item | Reason |
|---|---|
| AAL3 | Licence not read from the original source (nilearn can fetch it; Rolls et al., NeuroImage 206:116189, 2020 would be the citation). |
| ASPECTS 10-region atlas | ASPECTS-281 (Figshare 26819290, CC BY 4.0; code MIT) is BGL/SGL CT templates by age; MNI relation unverified. |
| Venous territory atlas | None found. VENAT (CC BY 4.0) is a vessel density atlas, not territories. |
| Brainstem nuclei | Harvard AAN v2 is CC0 (Dryad API) but files/space not checked. Brainstem Navigator licence unverified. |
| Circle of Willis, venous sinuses (meshes) | No verified vessel source in MNI. |

## Software
nibabel (MIT), nilearn (BSD-3), templateflow (Apache-2.0), scikit-image (BSD-3), trimesh (MIT), antspyx (Apache-2.0), numpy/scipy/matplotlib (BSD-style). Licence strings for software are from memory and **UNVERIFIED**; they do not affect the shipped data.
