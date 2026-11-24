import hashlib
import os
import shutil
import ssl
import stat
import urllib.request
import zipfile
from pathlib import Path

try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

ctx = ssl.create_default_context()
ctx.check_hostname = True
ctx.verify_mode = ssl.CERT_REQUIRED

MAX_DOWNLOAD_BYTES = 1024 * 1024 * 1024  # 1 GiB
MAX_EXTRACT_BYTES = 1024 * 1024 * 1024   # 1 GiB
MAX_EXTRACT_FILES = 2000

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


def download_file(url, dest, expected_sha256: str | None = None, max_bytes: int = MAX_DOWNLOAD_BYTES):
    if dest.exists() and dest.stat().st_size > 0:
        print(f"Already exists: {dest} ({dest.stat().st_size} bytes)")
        return
    print(f"Downloading {url} -> {dest}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    tmp_dest = dest.with_suffix(dest.suffix + ".tmp")
    hasher = hashlib.sha256()
    total = 0
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=120) as r, open(tmp_dest, "wb") as f:
            while True:
                chunk = r.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise ValueError(f"Download exceeded {max_bytes} bytes limit for {url}")
                hasher.update(chunk)
                f.write(chunk)
        digest = hasher.hexdigest()
        if expected_sha256 and digest.lower() != expected_sha256.lower():
            raise ValueError(f"SHA-256 mismatch for {url}: got {digest}, expected {expected_sha256}")
        os.replace(tmp_dest, dest)
        print(f"Downloaded: {dest} ({dest.stat().st_size} bytes, sha256={digest})")
    except Exception:
        if tmp_dest.exists():
            tmp_dest.unlink()
        raise


def safe_extract_zip(
    zip_path: Path,
    dest_dir: Path,
    max_files: int = MAX_EXTRACT_FILES,
    max_total_bytes: int = MAX_EXTRACT_BYTES,
) -> None:
    dest_resolved = dest_dir.resolve()
    dest_resolved.mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    with zipfile.ZipFile(zip_path, "r") as z:
        infos = z.infolist()
        if len(infos) > max_files:
            raise ValueError(f"Archive contains too many entries ({len(infos)} > {max_files})")
        for info in infos:
            mode = (info.external_attr >> 16) & 0o170000
            if stat.S_ISLNK(mode):
                raise ValueError(f"Refusing symlink in archive: {info.filename}")
            target = (dest_resolved / info.filename).resolve()
            if not target.is_relative_to(dest_resolved):
                raise ValueError(f"Blocked path traversal in archive: {info.filename}")
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with z.open(info, "r") as src, open(target, "wb") as dst:
                while True:
                    chunk = src.read(1024 * 1024)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > max_total_bytes:
                        raise ValueError(f"Archive exceeded decompressed limit ({max_total_bytes} bytes)")
                    dst.write(chunk)


if __name__ == "__main__":
    download_file(glasser_url, glasser_dest)
    download_file(glasser_names_url, glasser_names_dest)
    download_file(bna_fsl_url, bna_fsl_dest)

    # Unzip Brainnetome_Atlas_FSL safely if downloaded
    bna_extracted = cache_dir / "bna_fsl_extracted"
    if bna_fsl_dest.exists() and not bna_extracted.exists():
        print(f"Extracting {bna_fsl_dest}...")
        safe_extract_zip(bna_fsl_dest, bna_extracted)
        print("Extracted Brainnetome FSL files:")
        for p in bna_extracted.rglob("*"):
            if p.is_file():
                print(f"  {p.relative_to(bna_extracted)} ({p.stat().st_size} bytes)")
