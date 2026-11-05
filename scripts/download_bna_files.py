import urllib.request
from pathlib import Path

cache = Path("scripts/.cache")
cache.mkdir(parents=True, exist_ok=True)

urls = [
    ("BN_Atlas_246_1mm.nii.gz", "https://raw.githubusercontent.com/RosalindFok/Brainnetome4Depression/main/BN_Atlas/BN_Atlas_246_1mm.nii.gz"),
    ("BNA_subregions.xlsx", "https://raw.githubusercontent.com/RosalindFok/Brainnetome4Depression/main/BN_Atlas/BNA_subregions.xlsx"),
    ("BNA_matrix_binary_246x246.csv", "https://raw.githubusercontent.com/RosalindFok/Brainnetome4Depression/main/BN_Atlas/BNA_matrix_binary_246x246.csv"),
    ("subregions.json", "https://raw.githubusercontent.com/RosalindFok/Brainnetome4Depression/main/BN_Atlas/subregions.json"),
]

for name, url in urls:
    dest = cache / name
    print(f"Downloading {name} from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as f:
        f.write(r.read())
    print(f"Saved {dest} ({dest.stat().st_size} bytes)")
