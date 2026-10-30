from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from core.common.base import BaseCore
from core.common.contracts import (
    DocumentLifecycleState,
    DiscoveredGuideline,
    DiscoveryInput,
    DiscoveryOutput,
)
from core.discovery.sources import DISCOVERY_SOURCES
from core.discovery.adapters import HtmlDirectoryAdapter, PubmedSocietyAdapter
from core.store.manager import GuidelineStoreManager


class DiscoveryCore(BaseCore):
    """
    Lõi Tự động Phát hiện Hướng dẫn Lâm sàng Mới (DiscoveryCore).
    Đặc điểm:
    - Quét đa nguồn: 12 hội chuyên khoa và tạp chí thần kinh hàng đầu.
    - Cơ chế Dual Adapter: HTML Scraper trực tiếp + PubMed/PMC fallback khi gặp WAF.
    - Tự động khử trùng lặp và phát hiện bản mới so với Catalog hiện tại.
    """

    name: str = "discovery"
    version: str = "1.0.0"

    def __init__(self, store_manager: Optional[GuidelineStoreManager] = None):
        self.html_adapter = HtmlDirectoryAdapter()
        self.pubmed_adapter = PubmedSocietyAdapter()
        self.store_manager = store_manager or GuidelineStoreManager()

    def _execute(self, input_data: BaseModel) -> Dict[str, Any]:
        if not isinstance(input_data, DiscoveryInput):
            input_data = DiscoveryInput(**input_data.model_dump())

        # 1. Đọc danh sách đã có trong Catalog để khử trùng lặp
        existing_urls = set()
        existing_titles = set()
        if self.store_manager.catalog_path.exists():
            try:
                import json
                cat_data = json.loads(self.store_manager.catalog_path.read_text(encoding="utf-8"))
                for entry in cat_data.values():
                    if entry.get("source_url"):
                        existing_urls.add(entry["source_url"].lower().strip())
                    if entry.get("title"):
                        existing_titles.add(entry["title"].lower().strip())
            except Exception:
                pass

        all_items: List[DiscoveredGuideline] = []
        new_count = 0

        # 2. Quét qua các nguồn mục tiêu
        for source_key, config in DISCOVERY_SOURCES.items():
            if input_data.societies and source_key not in input_data.societies:
                # Nếu lọc theo hội cụ thể và không khớp
                continue

            adapter_type = config.get("adapter", "HTML_DIRECTORY")
            discovered: List[DiscoveredGuideline] = []

            if adapter_type == "HTML_DIRECTORY":
                discovered = self.html_adapter.fetch_guidelines(
                    source_key=source_key,
                    config=config,
                    limit=input_data.limit_per_source,
                    year_min=input_data.year_min,
                )
            elif adapter_type == "PUBMED_API":
                discovered = self.pubmed_adapter.fetch_guidelines(
                    source_key=source_key,
                    config=config,
                    limit=input_data.limit_per_source,
                    year_min=input_data.year_min,
                )

            # 3. Đánh giá tính mới (is_new)
            for item in discovered:
                url_clean = item.source_url.lower().strip()
                title_clean = item.title.lower().strip()

                if url_clean in existing_urls or title_clean in existing_titles:
                    item.is_new = False
                else:
                    item.is_new = True
                    new_count += 1

                all_items.append(item)

        output = DiscoveryOutput(
            total_discovered=len(all_items),
            new_discovered_count=new_count,
            items=all_items,
            state=DocumentLifecycleState.DISCOVERED,
        )

        return output.model_dump()
