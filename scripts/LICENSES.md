# Licences and required citations (NeuroVision data)

Verified 2026-11-04 by reading the source (API field, LICENSE file or licence page). Items marked **UNVERIFIED** were not read from the source.
This file is not legal advice. Items marked **ACTION** need a human decision before public release.

## Data currently shipped in `public/neurovision/`

### 1. Human Connectome Project (HCP) 3 Tesla High-Resolution Templates (T1w, T2w) & Brain Mask – `volumes/T1`, `T2`, `brainmask`
- Source: Human Connectome Project (HCP S1200 Release, Washington University – University of Minnesota Consortium, BALSA / ConnectomeDB).
  - T1w: Siemens 3T Prisma/Skyra 3D MPRAGE 0.7mm isotropic (`S1200_AverageT1w_restore.nii.gz`), resampled to MNI152 1mm grid.
  - T2w: Siemens 3T Prisma/Skyra 3D SPACE 0.7mm isotropic (`S1200_AverageT2w_restore.nii.gz`), resampled to MNI152 1mm grid.
  - Brain mask: Derived from TemplateFlow MNI152NLin2009cAsym.
- Licence: **WU-Minn HCP Consortium Open Access Data Use Terms** (Free for educational, academic, and non-commercial neuroimaging applications). Redistribution permitted with retention of data terms; no re-identification attempts.
- Required Acknowledgement: "Data were provided [in part] by the Human Connectome Project, WU-Minn Consortium (Principal Investigators: David Van Essen and Kamil Ugurbil; 1U54MH091657) funded by the 16 NIH Institutes and Centers that support the NIH Blueprint for Neuroscience Research; and by the McDonnell Center for Systems Neuroscience at Washington University."
- Cite: Van Essen DC, Smith SM, Barch DM, Behrens TE, Yacoub E, Ugurbil K; WU-Minn HCP Consortium. The WU-Minn Human Connectome Project: An overview. NeuroImage 80:62–79 (2013). doi:10.1016/j.neuroimage.2013.05.041.
- Cite: Glasser MF, Sotiropoulos SN, Wilson JA, et al. The minimal preprocessing pipelines for the Human Connectome Project. NeuroImage 80:105–124 (2013). doi:10.1016/j.neuroimage.2013.04.127.

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

### 7. AAL3 (Automated Anatomical Labeling Atlas 3) – `atlases/aal3`
- Source: GIN-IMN (CNRS / CEA / Université de Bordeaux) & Oxford Centre for Computational Neuroscience (`oxcns.org/aal3.html`, `gin.cnrs.fr/en/tools/aal`).
- Licence: **GNU General Public License (GPL)** (verified from GIN-IMN distribution portal). Free for academic, educational and non-commercial research; redistribution subject to GPL conditions.
- Cite: Rolls ET, Huang CC, Lin CP, Feng J, Joliot M. Automated anatomical labelling atlas 3. NeuroImage 206:116189 (2020). doi:10.1016/j.neuroimage.2019.116189.
- Features: 167 regions including detailed thalamic sub-nuclei (AV, LP, VA, VL, VPL, VPM, Pulvinar, etc.), anterior cingulate sub-divisions, substantia nigra, red nucleus, locus coeruleus, raphe nuclei, and cerebellar lobules.

### 8. Harvard Ascending Arousal Network Atlas v2.0 – `atlases/brainstem_aan`
- Source: Dryad Digital Repository (`doi:10.5061/dryad.zw3r228d2`), Massachusetts General Hospital & Boston Children's Hospital.
- Licence: **CC0 1.0 Universal (Public Domain Dedication)** – verified from Dryad metadata and dataset README.
- Cite: Edlow, B. L., & Kinney, H. C. (2023). Harvard Ascending Arousal Network Atlas – Version 2.0. Dryad, Dataset, https://doi.org/10.5061/dryad.zw3r228d2
- Also cite: Edlow BL, Olchanyi M, Freeman HJ, et al. Sustaining wakefulness: Brainstem connectivity in human consciousness. bioRxiv (2023). doi:10.1101/2023.07.13.548265.
- Features: 16 arousal nodes across the midbrain, pons, and medulla: Dorsal Raphe (DR), Median Raphe (MnR), Periaqueductal Gray (PAG), Ventral Tegmental Area (VTA), and bilateral Locus Coeruleus (LC), Laterodorsal Tegmental Nucleus (LDTg), Mesencephalic Reticular Formation (mRt), Parabrachial Complex (PBC), Pontine Reticular Formation (PnO), and Pedunculotegmental Nucleus (PTg).

### 9. ASPECTS 10-Region Atlas – `atlases/aspects`
- Source: Anatomical derivation from Harvard-Oxford (Desikan/Frazier), JHU ICBM-DTI-81 (Mori/Wakana), and JHU Arterial Atlas (Liu et al. 2023).
- Licence: **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0 International).
- Cite: Barber PA, Demchuk AM, Zhang J, Buchan AM. Validity and reliability of a quantitative computed tomography score in predicting outcome of hyperacute stroke patients (ASPECTS). Lancet 355(9216):1670–1674 (2000). doi:10.1016/S0140-6736(00)02237-6.
- Also cite: Liu CF et al. Digital 3D Brain MRI Arterial Territories Atlas. Sci Data 10:74 (2023).
- Features: 20 labels (10 Left, 10 Right) mapping Caudate (C), Lentiform (L), Internal Capsule (IC), Insular ribbon (I), and M1–M6 MCA cortical sectors across ganglionic and supraganglionic tiers.

### 10. VENAT Cerebral Venous Atlas – `atlases/venous` & `meshes/venous_sinuses.gii`
- Source: Figshare repository (`doi:10.6084/m9.figshare.7205960`), Max Planck Institute for Human Cognitive and Brain Sciences.
- Licence: **CC BY 4.0** (Creative Commons Attribution 4.0 International) – verified from Figshare API metadata.
- Cite: Bazin PL, Weiss M, Dinse J, et al. VENAT: A digital venous neuroanatomy atlas of the human brain. (2018). Figshare dataset, doi:10.6084/m9.figshare.7205960.
- Features: Continuous probability density map derived from high-field 7 Tesla Quantitative Susceptibility Mapping (QSM), with 3D reconstruction of the Superior Sagittal Sinus, Straight Sinus, Transverse Sinuses, and Sigmoid Sinuses.

### 11. Human Connectome Project Multi-Modal Parcellation (HCP-MMP1.0 / Glasser 2016) – `atlases/glasser`
- Source: Washington University in St. Louis & Human Connectome Project (HCP), WU-Minn Consortium; BALSA database (`balsa.wustl.edu/study/show/RVVG`).
- Licence: **HCP Open Access Data Use Terms** (Open access data may be freely used for research and educational applications). Redistribution permitted with attribution and retention of data terms; no re-identification attempts. Commercial use is permitted under HCP terms provided that NIH/HCP endorsement is not implied.
- Cite: Glasser, M. F., Coalson, T. S., Robinson, E. C., Hacker, C. D., Harwell, J., Yacoub, E., Ugurbil, K., Andersson, J., Beckmann, C. F., Jenkinson, M., Smith, S. M., & Van Essen, D. C. (2016). *A multi-modal parcellation of human cerebral cortex*. Nature, 536(7615), 171–178. doi:10.1038/nature18933.
- Required Acknowledgement: "Data were provided [in part] by the Human Connectome Project, WU-Minn Consortium (Principal Investigators: David Van Essen and Kamil Ugurbil; 1U54MH091657) funded by the 16 NIH Institutes and Centers that support the NIH Blueprint for Neuroscience Research; and by the McDonnell Center for Systems Neuroscience at Washington University."
- Features: 360 cortical areas (180 per hemisphere) parcellated using multi-modal alignment (cortical myelin maps, cortical thickness, resting-state fMRI, and 7 task-fMRI functional protocols across 22 macro-regions).

### 12. Human Brainnetome Atlas (BNA) – `atlases/brainnetome`
- Source: Brainnetome Center, Institute of Automation, Chinese Academy of Sciences (CASIA) (`atlas.brainnetome.org`).
- Licence: **Brainnetome Terms of Use (Free for Non-Commercial Academic & Educational Use)**. Any commercial deployment, inclusion in proprietary diagnostic software, or redistribution for direct financial return requires prior formal written agreement from the Brainnetome Center, CASIA.
- Cite: Fan, L., Li, H., Zhuo, J., Zhang, Y., Wang, M., Chen, L., Yang, Z., Chu, C., Xie, S., Yuan, L., Zou, Y., Shen, S., Caspers, S., Amunts, K., Zilles, K., & Jiang, T. (2016). *The Human Brainnetome Atlas: A New Brain Atlas Based on Connectional Architecture*. Cerebral Cortex, 26(8), 3508–3526. doi:10.1093/cercor/bhw157.
- Also cite Yeo 7/17 Networks (for functional mapping): Yeo, B. T., et al. (2011). *The organization of the human cerebral cortex estimated by intrinsic functional connectivity*. Journal of Neurophysiology, 106(3), 1125–1165. doi:10.1152/jn.00338.2011.
- Features: 246 subregions (210 cortical, 36 subcortical) with cross-validation in tractography connectional architecture, BrainMap behavioral domain probability distributions, and canonical resting-state network mapping.

## Not shipped (no verified source/licence; nothing substituted)
| Item | Reason |
|---|---|
| Circle of Willis micro-arterial mesh | Requires specialized high-resolution micro-TOF MRA segmentation not bundled in stereotaxic atlases. |

## Software
nibabel (MIT), nilearn (BSD-3), templateflow (Apache-2.0), scikit-image (BSD-3), trimesh (MIT), antspyx (Apache-2.0), numpy/scipy/matplotlib (BSD-style). Licence strings for software are from memory and **UNVERIFIED**; they do not affect the shipped data.
