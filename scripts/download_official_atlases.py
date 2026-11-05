import os
import urllib.request
import ssl
import zipfile
from pathlib import Path

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

cache_dir = Path("scripts/.cache")
cache_dir.mkdir(parents=True, exist_ok=True)

# 1. Glasser 360 MNI
glasser_url = "https://raw.githubusercontent.com/brainspaces/glasser360/master/glasser360MNI.nii.gz"
glasser_dest = cache_dir / "glasser360MNI.nii.gz"
glasser_names_url = "https://raw.githubusercontent.com/brainspaces/glasser360/master/glasser360NodeNames.txt"
glasser_names_dest = cache_dir / "glasser360NodeNames.txt"

# 2. Brainnetome Atlas FSL (official release on NITRC)
bna_fsl_url = "https://www.nitrc.org/frs/download.php/9200/Brainnetome_Atlas_FSL.zip"
bna_fsl_dest = cache_dir / "Brainnetome_Atlas_FSL.zip"

def download_file(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        print(f"Already exists: {dest} ({dest.stat().st_size} bytes)")
        return
    print(f"Downloading {url} -> {dest}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, context=ctx, timeout=120) as r, open(dest, "wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
    print(f"Downloaded: {dest} ({dest.stat().st_size} bytes)")

download_file(glasser_url, glasser_dest)
download_file(glasser_names_url, glasser_names_dest)
download_file(bna_fsl_url, bna_fsl_dest)

# Unzip Brainnetome_Atlas_FSL if downloaded
bna_extracted = cache_dir / "bna_fsl_extracted"
if bna_fsl_dest.exists() and not bna_extracted.exists():
    print(f"Extracting {bna_fsl_dest}...")
    with zipfile.ZipFile(bna_fsl_dest, "r") as z:
        z.extractall(bna_extracted)
    print("Extracted Brainnetome FSL files:")
    for p in bna_extracted.rglob("*"):
        if p.is_file():
            print(f"  {p.relative_to(bna_extracted)} ({p.stat().st_size} bytes)")
