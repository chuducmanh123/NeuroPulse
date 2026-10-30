import hashlib
from pathlib import Path
from typing import Optional, Dict, Any
import requests
import pymupdf  # PyMuPDF: kiểm tra trang & tính toàn vẹn PDF tốc độ cao
from pydantic import BaseModel, Field

from core.common.base import BaseCore
from core.common.contracts import DocumentLifecycleState, CoreError, CoreException
from core.common.storage import StorageAdapter
from core.fetch.storage_adapter import LocalFileStorageAdapter


class FetchInput(BaseModel):
    source_url: Optional[str] = None
    local_path: Optional[str] = None
    society: str = "AHA"
    title_hint: Optional[str] = None
    year_hint: Optional[int] = None
    timeout_seconds: int = 45


class FetchOutput(BaseModel):
    file_id: str                      # Mã băm SHA-256
    storage_path: str                 # Đường dẫn vật lý của file đã lưu
    sha256: str
    size_bytes: int
    page_count: int
    is_duplicate: bool                # True nếu file này đã có sẵn trong kho
    title_hint: Optional[str] = None
    society: str = "AHA"
    pdf_metadata: Dict[str, Any] = Field(default_factory=dict)
    state: DocumentLifecycleState = DocumentLifecycleState.FETCHED


class FetchCore(BaseCore):
    """
    Lõi Thu nạp & Tải tài liệu hướng dẫn lâm sàng (FetchCore).
    Nhiệm vụ:
    - Tải PDF từ URL hoặc đọc từ file tải lên cục bộ.
    - Kiểm tra tính xác thực (Magic bytes %PDF-).
    - Tính mã băm SHA-256 chống trùng lặp dữ liệu (Idempotency).
    - Phân tích sơ bộ bằng PyMuPDF (đếm trang chính xác, metadata nội tại).
    - Lưu trữ an toàn qua StorageAdapter.
    """

    name: str = "fetch"
    version: str = "1.0.0"

    def __init__(self, storage_adapter: Optional[StorageAdapter] = None):
        self.storage = storage_adapter or LocalFileStorageAdapter()
        self.default_user_agent = (
            "NeuroGuide-Academic-Indexer/1.0 (+https://neuroguide.neuropulse.org; "
            "clinical-guideline-automation; contact@neuropulse.org)"
        )

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, FetchInput):
            input_data = FetchInput(**input_data.model_dump())

        if not input_data.source_url and not input_data.local_path:
            raise CoreException(
                code="MISSING_INPUT_SOURCE",
                message="Cần cung cấp ít nhất một nguồn tài liệu: 'source_url' hoặc 'local_path'.",
                retryable=False,
            )

        # 1. Thu thập dữ liệu byte
        pdf_bytes: bytes = b""
        if input_data.local_path:
            path_obj = Path(input_data.local_path)
            if not path_obj.exists():
                raise CoreException(
                    code="LOCAL_FILE_NOT_FOUND",
                    message=f"Tệp cục bộ không tồn tại: {input_data.local_path}",
                    retryable=False,
                )
            pdf_bytes = path_obj.read_bytes()
        elif input_data.source_url:
            pdf_bytes = self._download_url(input_data.source_url, input_data.timeout_seconds)

        # 2. Kiểm tra kích thước tối thiểu
        if len(pdf_bytes) < 100:
            raise CoreException(
                code="FILE_TOO_SMALL",
                message=f"Kích thước file quá nhỏ ({len(pdf_bytes)} bytes), không thể là một guideline PDF hợp lệ.",
                retryable=False,
            )

        # 3. Kiểm tra Magic Bytes (%PDF-)
        if not pdf_bytes.startswith(b"%PDF-"):
            # Có thể trang web trả về HTML thông báo lỗi 403 hoặc Captcha
            snippet = pdf_bytes[:200].decode("utf-8", errors="ignore")
            raise CoreException(
                code="INVALID_PDF_HEADER",
                message="Tệp tải về không có định dạng PDF hợp lệ (không chứa magic bytes '%PDF-').",
                retryable=False,
                details={"header_snippet": snippet},
            )

        # 4. Tính toán mã băm SHA-256
        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()

        # 5. Kiểm tra tính Idempotent (Đã tồn tại trong kho hay chưa)
        is_duplicate = self.storage.exists(sha256_hash, extension="pdf")

        # 6. Kiểm tra & phân tích cấu trúc PDF chuyên sâu bằng PyMuPDF
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
            page_count = doc.page_count
            pdf_meta = {
                "format": doc.metadata.get("format", ""),
                "title": doc.metadata.get("title", ""),
                "author": doc.metadata.get("author", ""),
                "creationDate": doc.metadata.get("creationDate", ""),
            }
            doc.close()
        except Exception as e:
            raise CoreException(
                code="CORRUPTED_PDF",
                message=f"Tệp PDF bị hỏng hoặc không thể đọc cấu trúc: {str(e)}",
                retryable=False,
            )

        if page_count < 1:
            raise CoreException(
                code="EMPTY_PDF_DOCUMENT",
                message="Tài liệu PDF không chứa trang nào.",
                retryable=False,
            )

        # 7. Lưu vào kho lưu trữ
        saved_path = self.storage.save(sha256_hash, pdf_bytes, extension="pdf")

        # 8. Đóng gói kết quả
        output = FetchOutput(
            file_id=sha256_hash,
            storage_path=saved_path,
            sha256=sha256_hash,
            size_bytes=len(pdf_bytes),
            page_count=page_count,
            is_duplicate=is_duplicate,
            title_hint=input_data.title_hint,
            society=input_data.society,
            pdf_metadata=pdf_meta,
            state=DocumentLifecycleState.FETCHED,
        )

        return output.model_dump()

    def _download_url(self, url: str, timeout: int) -> bytes:
        headers = {
            "User-Agent": self.default_user_agent,
            "Accept": "application/pdf,application/octet-stream,*/*",
        }
        try:
            response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            if response.status_code == 404:
                raise CoreException(
                    code="HTTP_404_NOT_FOUND",
                    message=f"Không tìm thấy tài liệu tại URL: {url}",
                    retryable=False,
                )
            elif response.status_code in (429, 500, 502, 503, 504):
                raise CoreException(
                    code=f"HTTP_{response.status_code}_TEMPORARY_ERROR",
                    message=f"Máy chủ đích trả về lỗi tạm thời ({response.status_code}) khi tải {url}",
                    retryable=True,
                )
            response.raise_for_status()
            return response.content
        except requests.exceptions.Timeout:
            raise CoreException(
                code="DOWNLOAD_TIMEOUT",
                message=f"Hết thời gian chờ ({timeout}s) khi tải {url}",
                retryable=True,
            )
        except requests.exceptions.RequestException as e:
            raise CoreException(
                code="NETWORK_REQUEST_FAILED",
                message=f"Lỗi mạng khi tải PDF: {str(e)}",
                retryable=True,
            )
