import os
from pathlib import Path
from core.common.storage import StorageAdapter


class LocalFileStorageAdapter(StorageAdapter):
    """Lưu trữ file PDF thô trên ổ đĩa cục bộ theo mã băm {sha256}.pdf."""

    def __init__(self, base_dir: str = "data/guidelines_raw"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, file_id: str, extension: str = "pdf") -> Path:
        clean_ext = extension.lstrip(".")
        return self.base_dir / f"{file_id}.{clean_ext}"

    def save(self, file_id: str, content: bytes, extension: str = "pdf") -> str:
        target_path = self._get_file_path(file_id, extension)
        if not target_path.exists():
            target_path.write_bytes(content)
        return str(target_path.resolve())

    def exists(self, file_id: str, extension: str = "pdf") -> bool:
        return self._get_file_path(file_id, extension).exists()

    def get_path_or_url(self, file_id: str, extension: str = "pdf") -> str:
        target_path = self._get_file_path(file_id, extension)
        if not target_path.exists():
            raise FileNotFoundError(f"File không tồn tại trong kho lưu trữ: {target_path}")
        return str(target_path.resolve())

    def read_bytes(self, file_id: str, extension: str = "pdf") -> bytes:
        target_path = self._get_file_path(file_id, extension)
        if not target_path.exists():
            raise FileNotFoundError(f"File không tồn tại: {target_path}")
        return target_path.read_bytes()
