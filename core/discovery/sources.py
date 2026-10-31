from typing import Dict, Any, List

# Danh mục các nguồn mở (Open Access) có thể tự động tải bài toàn văn / guideline PDF và phân tích
# Đã loại bỏ các hiệp hội bị tường lửa chống bot (Cloudflare / WAF 403) hoặc paywall đòi hỏi người dùng tải tay (NICE, Wiley, AHA/ASA, AAN, ILAE, NCS, EAN, PNS).
DISCOVERY_SOURCES: Dict[str, Dict[str, Any]] = {
    "ESO": {
        "name": "European Stroke Organisation",
        "category": "Stroke",
        "adapter": "HTML_DIRECTORY",
        "url": "https://eso-stroke.org/guidelines/eso-guideline-directory",
        "link_patterns": [r"guideline", r"eso.*guidelines", r"uploads.*\.pdf"],
        "direct_pdf_allowed": True,
        "notes": "Hỗ trợ tải trực tiếp Slide Deck và hướng dẫn lâm sàng đầy đủ từ máy chủ eso-stroke.org (không bị chặn WAF)",
    },
    "AHS": {
        "name": "American Headache Society",
        "category": "Headache",
        "adapter": "HTML_DIRECTORY",
        "url": "https://americanheadachesociety.org/resources/clinicians/guidelines",
        "link_patterns": [r"guidelines", r"consensus", r"headache", r"\.pdf"],
        "direct_pdf_allowed": True,
        "notes": "Hỗ trợ tải tài liệu hướng dẫn thực hành lâm sàng toàn văn từ CDN CloudFront mở",
    },
}
