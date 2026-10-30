import os
import pytest
import pymupdf  # PyMuPDF
from pathlib import Path
from core.fetch.core import FetchCore, FetchInput
from core.fetch.storage_adapter import LocalFileStorageAdapter
from core.discovery.adapters import derive_direct_pdf_url


@pytest.fixture
def temp_storage(tmp_path):
    storage_dir = tmp_path / "raw_guidelines"
    return LocalFileStorageAdapter(base_dir=str(storage_dir))


@pytest.fixture
def sample_valid_pdf(tmp_path):
    """Tạo một file PDF 3 trang chuẩn lâm sàng để test."""
    pdf_path = tmp_path / "sample_guideline.pdf"
    doc = pymupdf.open()
    for i in range(3):
        page = doc.new_page()
        page.insert_text((50, 50), f"AHA/ASA Stroke Guideline 2026 - Page {i+1}")
        page.insert_text((50, 100), "COR 1 | LOE B-R | Recommendation for Acute Stroke")
    doc.save(str(pdf_path))
    doc.close()
    return str(pdf_path)


@pytest.fixture
def sample_invalid_file(tmp_path):
    """Tạo một file text HTML giả mạo PDF với kích thước > 100 bytes."""
    fake_path = tmp_path / "fake_paper.pdf"
    html_content = (
        "<!DOCTYPE html><html><head><title>403 Forbidden</title></head>"
        "<body><h1>Access Denied by Security Firewall</h1>"
        "<p>Your automated request has been blocked by Cloudflare security policy.</p>"
        "</body></html>"
    )
    fake_path.write_text(html_content, encoding="utf-8")
    return str(fake_path)


@pytest.fixture
def sample_paywalled_html(tmp_path):
    """Tạo một trang HTML giả lập tường thu phí (Paywall) của nhà xuất bản."""
    fake_path = tmp_path / "paywall_page.pdf"
    html_content = (
        "<!DOCTYPE html><html><head><title>Purchase Access - Clinical Journal</title></head>"
        "<body><h1>Institutional Access Required</h1>"
        "<p>You need a subscription or paywall purchase to read this full article. Sign in to access.</p>"
        "<button>Buy Article $39.95</button>"
        "</body></html>"
    )
    fake_path.write_text(html_content, encoding="utf-8")
    return str(fake_path)


def test_fetch_file_too_small(temp_storage, tmp_path):
    tiny_path = tmp_path / "tiny.pdf"
    tiny_path.write_bytes(b"%PDF-1.4 tiny")
    core = FetchCore(storage_adapter=temp_storage)
    result = core.run(FetchInput(local_path=str(tiny_path)))

    assert result.ok is False
    assert result.error.code == "FILE_TOO_SMALL"
    assert result.error.retryable is False


def test_fetch_valid_local_pdf(temp_storage, sample_valid_pdf):
    core = FetchCore(storage_adapter=temp_storage)
    input_data = FetchInput(
        local_path=sample_valid_pdf,
        society="AHA/ASA",
        title_hint="2026 Guidelines for the Early Management of Acute Ischemic Stroke",
        year_hint=2026,
    )

    result = core.run(input_data)

    assert result.ok is True
    assert result.data is not None
    assert result.data["page_count"] == 3
    assert result.data["society"] == "AHA/ASA"
    assert result.data["is_duplicate"] is False
    assert result.data["full_text_source"] == "LOCAL_UPLOAD"
    assert result.data["state"] == "FETCHED"
    assert len(result.data["sha256"]) == 64

    # Kiểm tra file đã được lưu vào storage
    saved_path = result.data["storage_path"]
    assert os.path.exists(saved_path)


def test_fetch_idempotency_duplicate_detection(temp_storage, sample_valid_pdf):
    core = FetchCore(storage_adapter=temp_storage)
    input_data = FetchInput(local_path=sample_valid_pdf, society="AHA/ASA")

    # Chạy lần 1
    res1 = core.run(input_data)
    assert res1.ok is True
    assert res1.data["is_duplicate"] is False

    # Chạy lần 2 với cùng file
    res2 = core.run(input_data)
    assert res2.ok is True
    assert res2.data["is_duplicate"] is True
    assert res2.data["sha256"] == res1.data["sha256"]


def test_fetch_invalid_magic_bytes(temp_storage, sample_invalid_file):
    core = FetchCore(storage_adapter=temp_storage)
    input_data = FetchInput(local_path=sample_invalid_file)

    result = core.run(input_data)

    assert result.ok is False
    assert result.error is not None
    assert result.error.code == "INVALID_PDF_HEADER"
    assert result.error.retryable is False
    assert "header_snippet" in result.error.details


def test_fetch_paywall_detection(temp_storage, sample_paywalled_html):
    """Kiểm tra: trang bị khóa tường phí sẽ báo lỗi PAYWALLED_MANUAL_REQUIRED với chỉ dẫn rõ ràng."""
    core = FetchCore(storage_adapter=temp_storage)
    input_data = FetchInput(local_path=sample_paywalled_html)

    result = core.run(input_data)

    assert result.ok is False
    assert result.error is not None
    assert result.error.code == "PAYWALLED_MANUAL_REQUIRED"
    assert "thủ công" in result.error.message


def test_derive_direct_pdf_urls():
    """Kiểm tra logic suy luận link PDF cho các nhà xuất bản lớn."""
    # AHA
    aha_url = "https://www.ahajournals.org/doi/10.1161/STR.0000000000000513"
    assert derive_direct_pdf_url(aha_url) == "https://www.ahajournals.org/doi/pdf/10.1161/STR.0000000000000513"

    # SAGE (ESO)
    sage_url = "https://journals.sagepub.com/doi/full/10.1177/23969873221147775"
    assert derive_direct_pdf_url(sage_url) == "https://journals.sagepub.com/doi/pdf/10.1177/23969873221147775"

    # PMC
    pmc_url = "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10512345/"
    assert derive_direct_pdf_url(pmc_url) == "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10512345/pdf/"

    # Direct PDF
    pdf_url = "https://example.org/guideline.pdf"
    assert derive_direct_pdf_url(pdf_url) == pdf_url


def test_fetch_missing_local_file(temp_storage):
    core = FetchCore(storage_adapter=temp_storage)
    input_data = FetchInput(local_path="d:/non_existent_folder/missing.pdf")

    result = core.run(input_data)

    assert result.ok is False
    assert result.error.code == "LOCAL_FILE_NOT_FOUND"
    assert result.error.retryable is False
