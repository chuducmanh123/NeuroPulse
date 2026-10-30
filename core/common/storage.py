from abc import ABC, abstractmethod
from typing import Optional, BinaryIO


class StorageAdapter(ABC):
    """Giao diện trừu tượng cho mọi adapter lưu trữ file PDF (Local, S3, Google Drive, Vercel Blob)."""

    @abstractmethod
    def save(self, file_id: str, content: bytes, extension: str = "pdf") -> str:
        """
        Lưu content bytes theo file_id.
        Trả về: URI hoặc đường dẫn lưu trữ.
        """
        pass

    @abstractmethod
    def exists(self, file_id: str, extension: str = "pdf") -> bool:
        """Kiểm tra xem file đã tồn tại hay chưa."""
        pass

    @abstractmethod
    def get_path_or_url(self, file_id: str, extension: str = "pdf") -> str:
        """Lấy đường dẫn cục bộ hoặc URL có thể truy cập được."""
        pass

    @abstractmethod
    def read_bytes(self, file_id: str, extension: str = "pdf") -> bytes:
        """Đọc toàn bộ nội dung bytes của file."""
        pass
