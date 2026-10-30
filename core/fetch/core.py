import hashlib
import re
from pathlib import Path
from typing import Optional, Dict, Any
import requests
from bs4 import BeautifulSoup
import pymupdf  # PyMuPDF: kiểm tra trang & tính toàn vẹn PDF tốc độ cao
from pydantic import BaseModel, Field

from core.common.base import BaseCore
from core.common.contracts import DocumentLifecycleState, CoreError, CoreException
from core.common.storage import StorageAdapter
from core.fetch.storage_adapter import LocalFileStorageAdapter
from core.discovery.adapters import derive_direct_pdf_url


class FetchInput(BaseModel):
    source_url: Optional[str] = None
    local_path: Optional[str] = None
    pmcid: Optional[str] = None
    doi: Optional[str] = None
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
    full_text_source: str = "DIRECT_DOWNLOAD" # DIRECT_DOWNLOAD, PMC_OPEN_ACCESS, HTML_META_RESOLVED, LOCAL_UPLOAD
    title_hint: Optional[str] = None
    society: str = "AHA"
    pdf_metadata: Dict[str, Any] = Field(default_factory=dict)
    state: DocumentLifecycleState = DocumentLifecycleState.FETCHED


class FetchCore(BaseCore):
    """
    Lõi Thu nạp & Tải tài liệu hướng dẫn lâm sàng (FetchCore).
    Đặc tính nâng cấp cho bài toàn văn:
    - Hỗ trợ tải trực tiếp từ PMC qua pmcid.
    - Tự động bóc tách link PDF từ thẻ meta HTML (citation_pdf_url).
    - Bộ nhận diện tường thu phí (Paywall Barrier Detector).
    - Kiểm tra magic bytes %PDF- và phân tích cấu trúc PyMuPDF.
    """

    name: str = "fetch"
    version: str = "2.0.0"

    def __init__(self, storage_adapter: Optional[StorageAdapter] = None):
        self.storage = storage_adapter or LocalFileStorageAdapter()
        self.default_user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36 NeuroGuide-Academic-Indexer/2.0"
        )

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, FetchInput):
            input_data = FetchInput(**input_data.model_dump())

        if not input_data.source_url and not input_data.local_path and not input_data.pmcid:
            raise CoreException(
                code="MISSING_INPUT_SOURCE",
                message="Cần cung cấp ít nhất một nguồn tài liệu: 'source_url', 'local_path', hoặc 'pmcid'.",
                retryable=False,
            )

        pdf_bytes: bytes = b""
        full_text_source = "DIRECT_DOWNLOAD"

        # 1. Thu thập dữ liệu byte
        if input_data.local_path:
            path_obj = Path(input_data.local_path)
            if not path_obj.exists():
                raise CoreException(
                    code="LOCAL_FILE_NOT_FOUND",
                    message=f"Tệp cục bộ không tồn tại: {input_data.local_path}",
                    retryable=False,
                )
            pdf_bytes = path_obj.read_bytes()
            full_text_source = "LOCAL_UPLOAD"

        elif input_data.pmcid:
            # Tải bài toàn văn mở từ NCBI PMC
            pmc_id_clean = input_data.pmcid.strip().upper()
            if not pmc_id_clean.startswith("PMC"):
                pmc_id_clean = f"PMC{pmc_id_clean}"
            pmc_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id_clean}/pdf/"
            pdf_bytes = self._download_url(pmc_url, input_data.timeout_seconds)
            full_text_source = "PMC_OPEN_ACCESS"

        elif input_data.source_url:
            target_url = input_data.source_url
            # Suy luận nhanh nếu có thể chuyển thẳng sang URL PDF
            derived_pdf = derive_direct_pdf_url(target_url, input_data.doi)
            if derived_pdf:
                target_url = derived_pdf

            pdf_bytes, detected_source = self._fetch_with_html_resolution(target_url, input_data.timeout_seconds)
            full_text_source = detected_source

        # 2. Kiểm tra kích thước tối thiểu
        if len(pdf_bytes) < 100:
            raise CoreException(
                code="FILE_TOO_SMALL",
                message=f"Kích thước file quá nhỏ ({len(pdf_bytes)} bytes), không thể là một guideline PDF hợp lệ.",
                retryable=False,
            )

        # 3. Kiểm tra Magic Bytes (%PDF-) và phát hiện Paywall
        if not pdf_bytes.startswith(b"%PDF-"):
            snippet = pdf_bytes[:800].decode("utf-8", errors="ignore").lower()

            # Kiểm tra xem có phải là trang chặn thanh toán hoặc đăng nhập không
            is_paywall = any(term in snippet for term in [
                "paywall", "purchase", "subscription", "sign in", "log in to access",
                "institutional access", "buy article", "access through your institution"
            ])

            if is_paywall:
                raise CoreException(
                    code="PAYWALLED_MANUAL_REQUIRED",
                    message="Bài báo bị khóa bởi tường thu phí của nhà xuất bản. Vui lòng tải tệp PDF lên thủ công để tiếp tục xử lý.",
                    retryable=False,
                    details={"header_snippet": snippet[:200]},
                )

            raise CoreException(
                code="INVALID_PDF_HEADER",
                message="Tệp tải về không có định dạng PDF hợp lệ (không chứa magic bytes '%PDF-').",
                retryable=False,
                details={"header_snippet": snippet[:200]},
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
            full_text_source=full_text_source,
            title_hint=input_data.title_hint,
            society=input_data.society,
            pdf_metadata=pdf_meta,
            state=DocumentLifecycleState.FETCHED,
        )

        return output.model_dump()

    def _fetch_with_html_resolution(self, url: str, timeout: int) -> tuple[bytes, str]:
        """
        Tải nội dung từ URL; nếu trả về trang đích HTML, bóc tách thẻ meta để tìm link tải PDF toàn văn.
        """
        raw_bytes = self._download_url(url, timeout)

        # Nếu đã là PDF trực tiếp
        if raw_bytes.startswith(b"%PDF-"):
            return raw_bytes, "DIRECT_DOWNLOAD"

        # Nếu là HTML, thử tìm link PDF trong meta tags
        try:
            html_text = raw_bytes.decode("utf-8", errors="ignore")
            soup = BeautifulSoup(html_text, "html.parser")

            # 1. Quét các thẻ meta học thuật chuẩn (Highwire, Dublin Core, Google Scholar)
            pdf_meta_tags = [
                {"name": "citation_pdf_url"},
                {"name": "dc.identifier", "scheme": "URI"},
                {"property": "citation_pdf_url"},
            ]
            pdf_link = None
            for tag_query in pdf_meta_tags:
                meta = soup.find("meta", tag_query)
                if meta and meta.get("content") and "pdf" in meta["content"].lower():
                    pdf_link = meta["content"]
                    break

            # 2. Quét thẻ link alternate
            if not pdf_link:
                link_tag = soup.find("link", rel="alternate", type="application/pdf")
                if link_tag and link_tag.get("href"):
                    pdf_link = link_tag["href"]

            # 3. Quét thẻ a có chứa pdf
            if not pdf_link:
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if href.lower().endswith(".pdf") or "/doi/pdf/" in href or "download-pdf" in href.lower():
                        pdf_link = href
                        break

            if pdf_link:
                # Xử lý đường dẫn tương đối
                if pdf_link.startswith("/"):
                    base_domain = re.match(r"^https?://[^/]+", url)
                    if base_domain:
                        pdf_link = base_domain.group(0) + pdf_link

                resolved_bytes = self._download_url(pdf_link, timeout)
                if resolved_bytes.startswith(b"%PDF-"):
                    return resolved_bytes, "HTML_META_RESOLVED"

        except Exception:
            pass

        return raw_bytes, "DIRECT_DOWNLOAD"

    def _download_url(self, url: str, timeout: int) -> bytes:
        headers = {
            "User-Agent": self.default_user_agent,
            "Accept": "application/pdf,application/octet-stream,text/html,*/*",
        }
        try:
            response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True, verify=False)
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
