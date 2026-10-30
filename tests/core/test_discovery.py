import pytest
from core.discovery.core import DiscoveryCore, DiscoveryInput
from core.discovery.adapters import HtmlDirectoryAdapter, PubmedSocietyAdapter
from core.store.manager import GuidelineStoreManager
from core.common.contracts import (
    DiscoveredGuideline,
    GuidelineDocumentRecord,
    GuidelineMetadata,
    FullTextAvailability,
)


class MockHtmlAdapter(HtmlDirectoryAdapter):
    """Giả lập HTML directory response để test logic parser không cần mạng."""

    def fetch_guidelines(self, source_key, config, limit=10, year_min=2018):
        return [
            DiscoveredGuideline(
                guideline_id_candidate="mock_eso_1",
                title="European Stroke Organisation (ESO) Guidelines on Blood Pressure (2023)",
                society="ESO",
                year=2023,
                source_url="https://journals.sagepub.com/doi/10.1177/23969873221147775",
                direct_pdf_url="https://journals.sagepub.com/doi/pdf/10.1177/23969873221147775",
                full_text_availability=FullTextAvailability.DIRECT_PDF_AVAILABLE,
                category="Stroke",
                adapter_used="HTML_DIRECTORY",
                is_new=True,
            )
        ]


class MockPubmedAdapter(PubmedSocietyAdapter):
    """Giả lập PubMed API response để test logic parser không cần mạng."""

    def fetch_guidelines(self, source_key, config, limit=10, year_min=2018):
        return [
            DiscoveredGuideline(
                guideline_id_candidate="pmid_99999",
                title="Diagnostic Criteria for Alzheimer Disease: 2024 Recommendations",
                society="Alzheimer's & Dementia",
                year=2024,
                source_url="https://pubmed.ncbi.nlm.nih.gov/99999/",
                doi="10.1002/alz.12345",
                pmcid="PMC9876543",
                direct_pdf_url="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9876543/pdf/",
                full_text_availability=FullTextAvailability.OPEN_ACCESS_PMC,
                category="Dementia",
                adapter_used="PUBMED_API",
                is_new=True,
            )
        ]


def test_discovery_core_with_mock_adapters(tmp_path):
    store_dir = tmp_path / "test_store"
    mgr = GuidelineStoreManager(base_dir=str(store_dir))

    core = DiscoveryCore(store_manager=mgr)
    core.html_adapter = MockHtmlAdapter()
    core.pubmed_adapter = MockPubmedAdapter()

    res = core.run(DiscoveryInput(societies=["ESO", "ALZ_WILEY"]))

    assert res.ok is True
    data = res.data
    assert data["total_discovered"] == 2
    assert data["new_discovered_count"] == 2
    assert data["fulltext_available_count"] == 2
    assert data["state"] == "DISCOVERED"

    items = data["items"]
    assert items[0]["society"] == "ESO"
    assert items[0]["is_new"] is True
    assert items[0]["full_text_availability"] == "DIRECT_PDF_AVAILABLE"
    assert items[0]["direct_pdf_url"] is not None

    assert items[1]["society"] == "Alzheimer's & Dementia"
    assert items[1]["is_new"] is True
    assert items[1]["full_text_availability"] == "OPEN_ACCESS_PMC"
    assert items[1]["pmcid"] == "PMC9876543"


def test_discovery_deduplication_against_catalog(tmp_path):
    """Kiểm tra: nếu một guideline URL đã có trong Catalog, hệ thống đánh dấu is_new = False."""
    store_dir = tmp_path / "test_store"
    mgr = GuidelineStoreManager(base_dir=str(store_dir))

    # Giả lập đã lưu 1 bài ESO vào catalog trước đó
    existing_url = "https://journals.sagepub.com/doi/10.1177/23969873221147775"
    rec = GuidelineDocumentRecord(
        guideline_id="doc_existing_123",
        version=1,
        metadata=GuidelineMetadata(
            guideline_id="doc_existing_123",
            title="European Stroke Organisation (ESO) Guidelines on Blood Pressure (2023)",
            society="ESO",
            source_url=existing_url,
        ),
        total_recommendations=5,
        pending_count=0,
        approved_count=5,
        rejected_count=0,
        recommendations=[],
        created_at="2026-10-30T00:00:00Z",
        updated_at="2026-10-30T00:00:00Z",
    )
    mgr.save_record(rec)

    # Chạy Discovery
    core = DiscoveryCore(store_manager=mgr)
    core.html_adapter = MockHtmlAdapter()
    core.pubmed_adapter = MockPubmedAdapter()

    res = core.run(DiscoveryInput(societies=["ESO"]))

    assert res.ok is True
    items = res.data["items"]
    assert len(items) == 1
    assert items[0]["is_new"] is False  # Đã có trong catalog
    assert res.data["new_discovered_count"] == 0
