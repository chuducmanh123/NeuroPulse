import urllib.request
from pathlib import Path

cache = Path("scripts/.cache")
cache.mkdir(parents=True, exist_ok=True)

urls = [
    ("Yeo2011_7Networks_1mm.nii.gz", "https://raw.githubusercontent.com/ThomasYeoLab/CBIG/master/stable_projects/brain_parcellation/Yeo2011_fcMRI_clustering/1000subjects_reference/Yeo_JNeurophysiol11_SplitLabels/MNI152/Yeo2011_7Networks_N1000.split_components.FSL_MNI152_1mm.nii.gz"),
    ("Yeo2011_7Networks_glossary.csv", "https://raw.githubusercontent.com/ThomasYeoLab/CBIG/master/stable_projects/brain_parcellation/Yeo2011_fcMRI_clustering/1000subjects_reference/Yeo_JNeurophysiol11_SplitLabels/Yeo2011_7networks_N1000.split_components.glossary.csv"),
    ("Yeo2011_7Networks_ColorLUT.txt", "https://raw.githubusercontent.com/ThomasYeoLab/CBIG/master/stable_projects/brain_parcellation/Yeo2011_fcMRI_clustering/1000subjects_reference/Yeo_JNeurophysiol11_SplitLabels/MNI152/7Networks_ColorLUT_freeview.txt"),
]

for name, url in urls:
    dest = cache / name
    print(f"Downloading {name}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as f:
        f.write(r.read())
    print(f"Saved {dest} ({dest.stat().st_size} bytes)")
