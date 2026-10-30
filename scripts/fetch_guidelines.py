import html
import json
import os
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Ép buộc dùng IPv4 để tránh nghẽn DNS trên Windows
try:
    _orig_getaddrinfo = socket.getaddrinfo
    def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    socket.getaddrinfo = _ipv4_getaddrinfo
except Exception:
    pass

def load_env_key() -> str:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
        except Exception:
            pass
    return os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")

def create_ssl_context():
    c = ssl.create_default_context()
    c.check_hostname = True
    c.verify_mode = ssl.CERT_REQUIRED
    return c

ctx = create_ssl_context()

HEADERS = {
    "User-Agent": "NeuroGuide-AutonomousCrawler/3.0 (mailto:admin@neuroguide.org; Clinical Practice Guidelines Aggregator)"
}

GEMINI_API_KEY = load_env_key()

# Thác nước mô hình AI: Bắt đầu từ 3.8 Flash, tự động fallback nếu lỗi/hết quota
ACTIVE_GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
]

STORE_DIR = Path("data/guidelines_store")
CATALOG_PATH = STORE_DIR / "catalog.json"
MAX_NEW_GUIDELINES_PER_RUN = 2  # Giới hạn 2 guideline mỗi phiên để tiết kiệm quota AI

GUIDELINE_SEARCH_QUERIES = [
    '(("Stroke"[Journal] OR "Circulation"[Journal]) AND ("American Heart Association"[Corporate Author] OR "AHA/ASA"[All Fields]) AND ("practice guideline"[Publication Type] OR "guideline"[Title]))',
    '("European Stroke Organisation"[Corporate Author] OR "European Stroke Journal"[Journal]) AND ("guideline"[Title] OR "consensus"[Title])',
    '("Neurology"[Journal] OR "American Academy of Neurology"[Corporate Author]) AND ("practice guideline"[Publication Type] OR "practice advisory"[Title])',
    '("Neurocritical Care"[Journal] OR "Neurocritical Care Society"[Corporate Author]) AND ("guideline"[Title] OR "consensus statement"[Title])',
]


def call_gemini_json(prompt: str, system_instruction: str = "") -> dict:
    if not GEMINI_API_KEY:
        return {}

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
            "maxOutputTokens": 6000,
        },
    }
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    for model_name in ACTIVE_GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        for attempt in range(2):
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                )
                with urllib.request.urlopen(req, context=ctx, timeout=40) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    candidates = resp_data.get("candidates", [])
                    if not candidates:
                        continue
                    parts = candidates[0].get("content", {}).get("parts", [])
                    raw_text = "".join(p.get("text", "") for p in parts if "text" in p and not p.get("thought")).strip()
                    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                    raw_text = re.sub(r"\s*```$", "", raw_text)
                    parsed = json.loads(raw_text)
                    print(f"   [+] Gemini phản hồi thành công từ mô hình: {model_name}")
                    return parsed
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    time.sleep(2 * (attempt + 1))
                else:
                    break
            except Exception:
                time.sleep(1)
                continue
    return {}


def load_catalog() -> dict:
    if CATALOG_PATH.exists():
        try:
            return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_catalog(catalog: dict):
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")


def search_pubmed_pmids(term: str, max_results: int = 5) -> list:
    url = (
        f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        f"?db=pubmed&term={urllib.parse.quote(term)}&retmode=json&retmax={max_results}&sort=pub_date"
    )
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("esearchresult", {}).get("idlist", [])
    except Exception as e:
        print(f"[-] Lỗi tìm kiếm PubMed: {e}")
        return []


def fetch_pubmed_summary(pmid: str) -> dict:
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={pmid}&retmode=json"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            result = data.get("result", {}).get(pmid, {})
            title = result.get("title", "").strip().rstrip(".")
            doi = ""
            for article_id in result.get("articleids", []):
                if article_id.get("idtype") == "doi":
                    doi = article_id.get("value", "")
                    break
            pub_date = result.get("pubdate", "")
            year_match = re.search(r"\b(202[0-9])\b", pub_date)
            year = int(year_match.group(1)) if year_match else 2026
            source = result.get("source", "")
            return {
                "pmid": pmid,
                "title": title,
                "doi": doi,
                "year": year,
                "journal": source,
            }
    except Exception as e:
        print(f"[-] Lỗi đọc tóm tắt PMID {pmid}: {e}")
        return {}


def fetch_pubmed_abstract(pmid: str) -> str:
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={pmid}&retmode=xml"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            xml_str = resp.read().decode("utf-8", errors="ignore")
            import xml.etree.ElementTree as ET
            root = ET.fromstring(xml_str)
            abs_texts = []
            for node in root.findall(".//AbstractText"):
                label = node.attrib.get("Label")
                text = "".join(node.itertext()).strip()
                if text:
                    if label:
                        abs_texts.append(f"{label}: {text}")
                    else:
                        abs_texts.append(text)
            return "\n\n".join(abs_texts)
    except Exception as e:
        print(f"[-] Lỗi đọc abstract PMID {pmid}: {e}")
        return ""


def detect_society(title: str, journal: str) -> str:
    norm = f"{title} {journal}".upper()
    if "AMERICAN HEART" in norm or "AHA" in norm or "ASA" in norm or "STROKE" in journal.upper():
        return "AHA/ASA"
    if "EUROPEAN STROKE" in norm or "ESO" in norm:
        return "ESO"
    if "AMERICAN ACADEMY OF NEUROLOGY" in norm or "AAN" in norm or "NEUROLOGY" in journal.upper():
        return "AAN"
    if "NEUROCRITICAL" in norm or "NCS" in norm:
        return "NCS"
    if "EPILEPSY" in norm or "ILAE" in norm or "AES" in norm:
        return "ILAE"
    return "Clinical Society"


def analyze_guideline_with_gemini(item: dict, abstract: str) -> dict:
    sys_inst = (
        "You are an expert Senior Neurologist and Medical Guideline Methodologist. "
        "Extract structured clinical practice recommendations from the provided medical guideline abstract. "
        "Each recommendation must have: statement, cor (1, 2a, 2b, 3: Harm, 3: No Benefit, or Strong/Weak), "
        "loe (A, B-R, B-NR, C-LD, C-EO or High/Moderate/Low), grading_system (AHA_ACC or GRADE_ESO), topic, and target_population. "
        "Include top 3 key takeaways. Return strictly valid JSON matching the schema."
    )
    prompt = f"""Guideline Title: {item['title']}
Journal: {item.get('journal', '')} ({item.get('year', 2026)})
DOI: {item.get('doi', '')}
Abstract:
\"\"\"
{abstract}
\"\"\"

Extract and format in strict JSON:
{{
  "top_takeaways": [
    "Takeaway 1...",
    "Takeaway 2..."
  ],
  "grading_system": "AHA_ACC",
  "recommendations": [
    {{
      "rec_index": 1,
      "topic": "Acute Medical Management",
      "statement": "Clinical recommendation statement...",
      "cor": "1",
      "cor_label": "Strong recommendation (Benefit >>> Risk)",
      "loe": "A",
      "loe_label": "High-quality evidence from multiple RCTs",
      "target_population": "Adults with acute ischemic stroke",
      "driving_trials": ["Trial-1", "Trial-2"]
    }}
  ]
}}"""
    return call_gemini_json(prompt, sys_inst)


def main():
    print("=" * 65)
    print("🚀 NEUROGUIDE AUTONOMOUS GUIDELINE RADAR (GITHUB ACTIONS / CLI)")
    print("=" * 65)

    if not GEMINI_API_KEY:
        print("[!] Không tìm thấy GEMINI_API_KEY. Vui lòng thiết lập biến môi trường.")
        sys.exit(0)

    catalog = load_catalog()
    existing_titles = {
        re.sub(r"[^a-z0-9]", "", entry.get("title", "").lower())
        for entry in catalog.values()
    }
    existing_dois = {
        entry.get("doi", "").lower().strip()
        for entry in catalog.values() if entry.get("doi")
    }

    discovered_candidates = []
    print("[*] Đang quét các hiệp hội Thần kinh & Đột quỵ hàng đầu trên PubMed...")

    for query in GUIDELINE_SEARCH_QUERIES:
        pmids = search_pubmed_pmids(query, max_results=4)
        for pmid in pmids:
            summary = fetch_pubmed_summary(pmid)
            if not summary or not summary.get("title"):
                continue

            clean_t = re.sub(r"[^a-z0-9]", "", summary["title"].lower())
            clean_doi = summary.get("doi", "").lower().strip()

            if clean_t in existing_titles or (clean_doi and clean_doi in existing_dois):
                continue

            # Kiểm tra xem có phải guideline/consensus thật không
            if not re.search(r"\b(guideline|recommendation|consensus|advisory|statement)\b", summary["title"], re.I):
                continue

            discovered_candidates.append(summary)
            existing_titles.add(clean_t)
            if clean_doi:
                existing_dois.add(clean_doi)

            if len(discovered_candidates) >= MAX_NEW_GUIDELINES_PER_RUN:
                break
        if len(discovered_candidates) >= MAX_NEW_GUIDELINES_PER_RUN:
            break

    print(f"[+] Tìm thấy {len(discovered_candidates)} guideline mới cần phân tích & đưa vào Review Queue.")

    if not discovered_candidates:
        print("[+] Không có guideline mới nào cần cập nhật. Catalog đã ở trạng thái mới nhất.")
        return

    STORE_DIR.mkdir(parents=True, exist_ok=True)
    processed_count = 0

    for idx, item in enumerate(discovered_candidates, 1):
        print(f"\n[*] [{idx}/{len(discovered_candidates)}] Đang xử lý: {item['title'][:65]}...")
        abstract = fetch_pubmed_abstract(item["pmid"])
        if not abstract or len(abstract) < 120:
            print("   [-] Bỏ qua vì không có abstract đầy đủ.")
            continue

        print("   [*] Đang phân tích bằng Gemini AI (Thác nước ưu tiên 3.8 Flash)...")
        ai_res = analyze_guideline_with_gemini(item, abstract)
        recs_raw = ai_res.get("recommendations", [])
        if not recs_raw:
            print("   [-] Không trích xuất được khuyến cáo nào từ abstract.")
            continue

        society = detect_society(item["title"], item.get("journal", ""))
        guideline_id = f"guide-pmid-{item['pmid']}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Chuẩn hóa danh sách khuyến cáo VỚI TRẠNG THÁI PENDING (REVIEW QUEUE)
        stored_recs = []
        for r_idx, r in enumerate(recs_raw, 1):
            stored_recs.append({
                "rec_id": f"{guideline_id}-rec-{r_idx:02d}",
                "guideline_id": guideline_id,
                "grading_system": ai_res.get("grading_system", "AHA_ACC"),
                "page_num": 1,
                "section": r.get("topic", "Clinical Guidance"),
                "topic": r.get("topic", "Clinical Guidance"),
                "pico_id": None,
                "statement": r.get("statement", ""),
                "cor": str(r.get("cor", "1")),
                "cor_label": r.get("cor_label", "Strong recommendation"),
                "loe": str(r.get("loe", "B-R")),
                "loe_label": r.get("loe_label", "Evidence from trials"),
                "quality_of_evidence": None,
                "strength_of_recommendation": None,
                "consensus_statement": None,
                "voting": None,
                "is_high_impact_change": False,
                "change_type": "NEW",
                "previous_grade": None,
                "target_population": r.get("target_population"),
                "driving_trials": r.get("driving_trials", []),
                "verbatim_quote": r.get("statement", "")[:150],
                "confidence_score": 0.95,
                # QUAN TRỌNG: Mặc định luôn là pending để nằm trong Hàng đợi duyệt
                "approval_status": "pending",
                "reviewed_by": None,
                "reviewed_at": None,
                "review_notes": None,
            })

        guideline_record = {
            "guideline_id": guideline_id,
            "version": 1,
            "metadata": {
                "guideline_id": guideline_id,
                "title": item["title"],
                "society": society,
                "year": item["year"],
                "source_url": f"https://pubmed.ncbi.nlm.nih.gov/{item['pmid']}/",
                "doi": item.get("doi") or None,
                # QUAN TRỌNG: Lưu ở trạng thái PENDING_REVIEW
                "state": "PENDING_REVIEW",
                "top_takeaways": ai_res.get("top_takeaways", []),
            },
            "total_recommendations": len(stored_recs),
            "pending_count": len(stored_recs),
            "approved_count": 0,
            "rejected_count": 0,
            "recommendations": stored_recs,
            "updated_at": now_iso,
        }

        # Lưu file version 1 & latest vào guidelines_store
        v1_path = STORE_DIR / f"{guideline_id}_v1.json"
        latest_path = STORE_DIR / f"{guideline_id}_latest.json"
        json_content = json.dumps(guideline_record, indent=2, ensure_ascii=False)
        v1_path.write_text(json_content, encoding="utf-8")
        latest_path.write_text(json_content, encoding="utf-8")

        # Cập nhật Catalog
        catalog[guideline_id] = {
            "guideline_id": guideline_id,
            "title": item["title"],
            "society": society,
            "year": item["year"],
            "latest_version": 1,
            "total_recommendations": len(stored_recs),
            "pending_count": len(stored_recs),
            "approved_count": 0,
            "rejected_count": 0,
            "grading_system": ai_res.get("grading_system", "AHA_ACC"),
            "updated_at": now_iso,
        }

        processed_count += 1
        print(f"   [✓] Đã tạo thành công {guideline_id} ({len(stored_recs)} khuyến cáo) -> ĐÃ LƯU VÀO REVIEW QUEUE.")

    save_catalog(catalog)
    print("\n" + "=" * 65)
    print(f"✨ HOÀN TẤT: Đã bóc tách tự động {processed_count} guideline mới vào Hàng đợi kiểm duyệt.")
    print("=" * 65)


if __name__ == "__main__":
    main()
