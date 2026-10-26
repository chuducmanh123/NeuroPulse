import html
import json
import os
import re
import socket
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Ép buộc dùng IPv4 (AF_INET) để tránh lỗi treo kết nối trên Windows
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_getaddrinfo

def load_env_key() -> str:
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
        except Exception:
            pass
    return os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeuroPulseCaseFetcher/3.0 (mailto:contact@journaltracker.org)"
}

GEMINI_API_KEY = load_env_key()
ACTIVE_GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-3.8-flash"]

FIGURES_DIR = os.path.join("public", "data", "figures")
CASES_JSON_PATH = os.path.join("public", "data", "cases.json")
MAX_CASES_STORED = 90

# Ngân hàng chủ đề ca lâm sàng Thần kinh & Đột quỵ kinh điển (luân phiên tự động theo ngày)
CLINICAL_CASE_TOPIC_BANK = [
    {
        "subspecialty": "Vascular & Stroke",
        "query": 'TITLE:"artery of Percheron" AND "thalamic" AND MRI AND "case report"',
        "keywords": ["thalamus", "percheron", "stroke", "ischemic", "midbrain"]
    },
    {
        "subspecialty": "Vascular & Stroke",
        "query": 'TITLE:"cerebral venous thrombosis" AND ("magnetic resonance" OR MRI OR MRV) AND "case report"',
        "keywords": ["venous sinus thrombosis", "anticoagulation", "stroke", "intracranial"]
    },
    {
        "subspecialty": "Neuroimmunology",
        "query": 'TITLE:"MOG" AND ("optic neuritis" OR "encephalomyelitis") AND MRI AND "case report"',
        "keywords": ["mogad", "demyelinating", "optic neuritis", "myelitis"]
    },
    {
        "subspecialty": "Epilepsy",
        "query": 'TITLE:"LGI1" AND ("seizures" OR "encephalitis") AND MRI AND "case report"',
        "keywords": ["autoimmune encephalitis", "seizure", "epilepsy", "limbic"]
    },
    {
        "subspecialty": "Neurocritical Care",
        "query": 'TITLE:"osmotic demyelination syndrome" AND "pontine" AND MRI AND "case report"',
        "keywords": ["pontine", "neurocritical", "hyponatremia", "myelinolysis"]
    },
    {
        "subspecialty": "Cognitive & Dementia",
        "query": 'TITLE:"Creutzfeldt-Jakob" AND ("cortical ribboning" OR "diffusion" OR DWI) AND MRI AND "case report"',
        "keywords": ["prion", "dementia", "cognitive", "diffusion"]
    },
    {
        "subspecialty": "Vascular & Stroke",
        "query": 'TITLE:"CADASIL" AND ("temporal pole" OR "NOTCH3") AND MRI AND "case report"',
        "keywords": ["small vessel disease", "white matter hyperintensities", "stroke", "cadasil"]
    },
    {
        "subspecialty": "Neuroimmunology",
        "query": 'TITLE:"neuromyelitis optica" AND ("area postrema" OR "aquaporin-4") AND MRI AND "case report"',
        "keywords": ["nmosd", "aquaporin-4", "myelitis", "neuroimmunology"]
    },
    {
        "subspecialty": "Movement Disorders",
        "query": 'TITLE:"progressive supranuclear palsy" AND ("hummingbird" OR "midbrain") AND MRI AND "case report"',
        "keywords": ["progressive supranuclear palsy", "parkinson", "movement", "midbrain"]
    },
    {
        "subspecialty": "Headache & Pain",
        "query": 'TITLE:"spontaneous intracranial hypotension" AND ("pachymeningeal" OR "blood patch") AND MRI AND "case report"',
        "keywords": ["headache", "intracranial hypotension", "dural", "pain"]
    },
    {
        "subspecialty": "Neuromuscular",
        "query": 'TITLE:"Bickerstaff brainstem encephalitis" AND ("GQ1b" OR MRI) AND "case report"',
        "keywords": ["guillain-barre", "neuromuscular", "neuropathy", "brainstem"]
    },
    {
        "subspecialty": "Neuro-Oncology",
        "query": 'TITLE:"primary central nervous system lymphoma" AND MRI AND "case report"',
        "keywords": ["cns lymphoma", "brain tumor", "neuro-oncology", "glioma"]
    },
]

NEUROIMAGING_CAPTION_REGEX = re.compile(
    r'\b(MRI|FLAIR|DWI|diffusion|T1|T2|SWI|GRE|CT|CTA|MRA|MRV|DSA|angiograph|hyperintens|hypointens|lesion|infarct|hemorrhage|thrombosis|enhancement|atrophy|EEG|ictal|wave)\b',
    re.IGNORECASE
)


def clean_xml_text(elem) -> str:
    if elem is None:
        return ""
    raw = "".join(elem.itertext())
    raw = html.unescape(raw)
    return re.sub(r"\s+", " ", raw).strip()


def strip_html_tags(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def fetch_url_bytes(url: str, timeout: int = 18) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return resp.read()


def load_existing_cases() -> list:
    if not os.path.exists(CASES_JSON_PATH):
        return []
    try:
        with open(CASES_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[!] Lỗi đọc {CASES_JSON_PATH}: {e}")
        return []


def save_cases_to_disk(cases_list: list):
    os.makedirs(os.path.dirname(CASES_JSON_PATH), exist_ok=True)
    with open(CASES_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(cases_list[:MAX_CASES_STORED], f, ensure_ascii=False, indent=2)


def extract_figures_and_text_from_pmc(pmcid: str, doi: str, pmid: str, title: str, journal_title: str, pub_year: str, abstract_text: str):
    """Tải nội dung ca bệnh và trích xuất 1-2 hình ảnh thật từ PMC CDN hoặc EuropePMC."""
    os.makedirs(FIGURES_DIR, exist_ok=True)
    case_body_text = abstract_text or ""
    extracted_figs = []

    # 1. Thử lấy Full-Text XML từ EuropePMC để lấy nội dung Case Presentation
    try:
        xml_url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"
        xml_bytes = fetch_url_bytes(xml_url, timeout=15)
        root = ET.fromstring(xml_bytes)

        body_paragraphs = []
        for sec in root.findall(".//body//sec"):
            sec_title = clean_xml_text(sec.find("title")).lower()
            if any(k in sec_title for k in ("case", "presentation", "patient", "history", "discussion", "clinical")):
                sec_txt = clean_xml_text(sec)
                if len(sec_txt) > 80:
                    body_paragraphs.append(sec_txt)
        if body_paragraphs:
            case_body_text = " ".join(body_paragraphs)[:4500]
        elif not case_body_text:
            all_body = clean_xml_text(root.find(".//body"))
            if all_body:
                case_body_text = all_body[:4500]
    except Exception:
        pass

    # 2. Quét trang bài viết PMC để lấy URL ảnh trực tiếp từ CDN (cdn.ncbi.nlm.nih.gov)
    try:
        pmc_page_url = f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/"
        html_str = fetch_url_bytes(pmc_page_url, timeout=15).decode("utf-8", errors="ignore")
        fig_blocks = re.findall(r"<figure\b[^>]*>([\s\S]*?)</figure>", html_str, flags=re.IGNORECASE)

        for block in fig_blocks:
            img_match = re.search(
                r'<img\b[^>]*src=["\'](https://cdn\.ncbi\.nlm\.nih\.gov/pmc/blobs/[^"\']+)["\']',
                block,
                flags=re.IGNORECASE
            )
            if not img_match:
                continue
            cdn_url = img_match.group(1)

            cap_match = re.search(r"<figcaption[^>]*>([\s\S]*?)</figcaption>", block, flags=re.IGNORECASE)
            caption = strip_html_tags(cap_match.group(1) if cap_match else "")
            if len(caption) < 30 or not NEUROIMAGING_CAPTION_REGEX.search(caption):
                continue

            try:
                img_bytes = fetch_url_bytes(cdn_url, timeout=15)
                if len(img_bytes) > 5000:
                    ext = os.path.splitext(urllib.parse.urlparse(cdn_url).path)[1] or ".jpg"
                    if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                        ext = ".jpg"
                    fig_idx = len(extracted_figs) + 1
                    file_name = f"{pmcid}_fig{fig_idx}{ext}"
                    local_fs_path = os.path.join(FIGURES_DIR, file_name)
                    with open(local_fs_path, "wb") as f:
                        f.write(img_bytes)

                    extracted_figs.append({
                        "figure_label": f"Figure {fig_idx}",
                        "caption": caption[:550],
                        "image_url": f"/data/figures/{file_name}",
                        "pmcid": pmcid,
                        "doi_url": f"https://doi.org/{doi}" if doi else f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/"
                    })
            except Exception:
                continue

            if len(extracted_figs) >= 2:
                break
    except Exception:
        pass

    if not extracted_figs or len(case_body_text) < 150:
        return None

    return {
        "pmcid": pmcid,
        "pmid": pmid,
        "doi": doi,
        "doi_url": f"https://doi.org/{doi}" if doi else f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/",
        "article_title": title,
        "journal_title": journal_title,
        "pub_year": pub_year,
        "case_body_text": case_body_text,
        "figures": extracted_figs
    }


def find_new_pmc_candidate(used_pmcids: set, day_index: int):
    """Duyệt qua ngân hàng chủ đề lâm sàng để tìm 1 ca bệnh PMC mới có hình ảnh thần kinh."""
    total_topics = len(CLINICAL_CASE_TOPIC_BANK)
    for offset in range(total_topics):
        topic_cfg = CLINICAL_CASE_TOPIC_BANK[(day_index + offset) % total_topics]
        query = topic_cfg["query"]
        encoded = urllib.parse.quote(f"{query} AND OPEN_ACCESS:y")
        search_url = (
            f"https://www.ebi.ac.uk/europepmc/webservices/rest/search"
            f"?query={encoded}&format=json&pageSize=8&resultType=core"
        )
        try:
            raw_bytes = fetch_url_bytes(search_url, timeout=15)
            data = json.loads(raw_bytes.decode("utf-8"))
            results = data.get("resultList", {}).get("result", [])
        except Exception as e:
            print(f"   [!] Lỗi truy vấn EuropePMC ({topic_cfg['subspecialty']}): {e}")
            continue

        for item in results:
            pmcid = item.get("pmcid", "").strip()
            if not pmcid or pmcid in used_pmcids:
                continue

            doi = item.get("doi", "").strip()
            pmid = item.get("pmid", "").strip()
            title = strip_html_tags(item.get("title", "")).rstrip(".")
            journal_title = item.get("journalInfo", {}).get("journal", {}).get("title", "PubMed Central")
            pub_year = str(item.get("pubYear", "2025"))
            abstract_text = strip_html_tags(item.get("abstractText", ""))

            candidate = extract_figures_and_text_from_pmc(
                pmcid, doi, pmid, title, journal_title, pub_year, abstract_text
            )
            if candidate:
                candidate["default_subspecialty"] = topic_cfg["subspecialty"]
                candidate["default_keywords"] = topic_cfg["keywords"]
                return candidate

    return None


def generate_clinical_case_with_gemini(candidate: dict, next_case_num: int, today_str: str):
    """Gửi dữ liệu ca bệnh PMC + chú thích hình ảnh sang Gemini để tạo cấu trúc ClinicalCase JSON."""
    if not GEMINI_API_KEY:
        return None

    figures_desc = "\n".join(
        f"- {fig['figure_label']}: {fig['caption']}"
        for fig in candidate["figures"]
    )

    # Luân chuyển đáp án đúng (A, B, C, D) để người học không đoán mò theo vị trí cố định
    target_correct_opt = ["A", "B", "C", "D"][next_case_num % 4]

    prompt = f"""You are a Senior Neurology & Stroke Board Examination Director.
Convert the following real Open Access PubMed Central neurological case report into an interactive board-style Clinical Case vignette in strict JSON format.

SOURCE ARTICLE METADATA:
- Original Title: {candidate['article_title']}
- PMCID: {candidate['pmcid']} ({candidate['journal_title']}, {candidate['pub_year']})
- Case Text / Abstract: {candidate['case_body_text']}
- Extracted Neuroimaging Figures:
{figures_desc}

CRITICAL DESIGN RULES:
1. BLINDED TITLE: Write a compelling clinical presentation title (`title`) based on symptoms/signs/anatomy WITHOUT giving away the final diagnosis name in the title.
2. DIFFICULTY: Choose one of `"Resident"`, `"Fellow"`, or `"Attending"`.
3. IMAGING: Return an `imaging_metadata` array matching the {len(candidate['figures'])} figure(s) above in exact order, specifying `"modality"` (e.g. "Brain MRI (Axial DWI & FLAIR)") and `"findings_summary"` (1 concise sentence summarizing key radiological findings).
4. 4-OPTION MCQ CHALLENGE:
   - `"question_type"` must be one of `"Diagnosis"`, `"Acute Management"`, `"Next Best Step"`, or `"Localization"`.
   - Provide 4 options (`"A"`, `"B"`, `"C"`, `"D"`).
   - Set `"correct_option"` to `"{target_correct_opt}"` and make option `"{target_correct_opt}"` the unambiguously correct choice.
   - `"peer_percentage"` across A, B, C, D must be integers summing to 100 (with the correct option having 68-85).
   - `"rationale"` for the correct option must start with `"Correct! "` and explain the neuroanatomical/clinical reasoning. `"rationale"` for incorrect options must start with `"Incorrect. "` and explain why that mimic is ruled out.
5. Output ONLY valid JSON (no markdown code fences, no extra commentary) matching this exact structure:
{{
  "title": "string",
  "subspecialty": "{candidate['default_subspecialty']}",
  "subspecialties": ["{candidate['default_subspecialty']}"],
  "difficulty": "Fellow",
  "estimated_time_sec": 110,
  "presentation": {{
    "demographics": "string (e.g., '54-year-old female')",
    "chief_complaint": "string",
    "history_of_present_illness": "string (3-4 detailed clinical sentences)",
    "past_medical_history": "string",
    "vitals": {{
      "bp": "string (e.g. '138/84 mmHg')",
      "hr": "string (e.g. '78 bpm')",
      "rr": "string (e.g. '16 /min')",
      "temp": "string (e.g. '36.8 °C')",
      "spo2": "string (e.g. '98%')"
    }},
    "neuro_exam": "string (detailed cranial nerve, motor, sensory, cerebellar, or GCS/NIHSS findings)",
    "key_labs_csf": "string (relevant CSF, serum antibody, genetic, or coagulation findings)",
    "imaging_metadata": [
      {{
        "modality": "string",
        "findings_summary": "string"
      }}
    ]
  }},
  "challenge": {{
    "question": "string",
    "question_type": "Diagnosis",
    "correct_option": "{target_correct_opt}",
    "options": [
      {{ "id": "A", "text": "string", "peer_percentage": 20, "rationale": "string" }},
      {{ "id": "B", "text": "string", "peer_percentage": 65, "rationale": "string" }},
      {{ "id": "C", "text": "string", "peer_percentage": 10, "rationale": "string" }},
      {{ "id": "D", "text": "string", "peer_percentage": 5, "rationale": "string" }}
    ]
  }},
  "resolution": {{
    "final_diagnosis": "string",
    "clinical_discussion": "string (2 paragraphs separated by \\n\\n)",
    "teaching_points": ["string", "string", "string"],
    "clinical_pitfalls": ["string", "string"],
    "related_keywords": ["string", "string", "string", "string", "string"]
  }}
}}"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2400,
            "responseMimeType": "application/json"
        }
    }

    for model_name in ACTIVE_GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        for attempt in range(2):
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if not candidates:
                        continue
                    parts = candidates[0].get("content", {}).get("parts", [])
                    raw_json_str = "".join(p.get("text", "") for p in parts if "text" in p and not p.get("thought")).strip()
                    raw_json_str = re.sub(r"^```(?:json)?\s*", "", raw_json_str)
                    raw_json_str = re.sub(r"\s*```$", "", raw_json_str)
                    parsed = json.loads(raw_json_str)

                    case_id = f"nc-2026-{str(next_case_num).zfill(3)}"
                    case_code = f"NC-2026-{str(next_case_num).zfill(3)}"

                    img_meta_list = parsed.get("presentation", {}).get("imaging_metadata", [])
                    imaging_items = []
                    for idx, fig in enumerate(candidate["figures"]):
                        meta = img_meta_list[idx] if idx < len(img_meta_list) else {}
                        imaging_items.append({
                            "modality": meta.get("modality") or "Neuroimaging (MRI / CT)",
                            "sequence_badge": f"{fig['figure_label']} • {candidate['pmcid']}",
                            "figure_label": fig["figure_label"],
                            "image_url": fig["image_url"],
                            "pmcid": candidate["pmcid"],
                            "doi_url": candidate["doi_url"],
                            "caption": fig["caption"],
                            "findings_summary": meta.get("findings_summary") or fig["caption"][:180]
                        })

                    pres = parsed.get("presentation", {})
                    return {
                        "id": case_id,
                        "case_code": case_code,
                        "title": parsed.get("title") or candidate["article_title"],
                        "subspecialty": parsed.get("subspecialty") or candidate["default_subspecialty"],
                        "subspecialties": parsed.get("subspecialties") or [candidate["default_subspecialty"]],
                        "difficulty": parsed.get("difficulty") if parsed.get("difficulty") in ("Resident", "Fellow", "Attending") else "Fellow",
                        "estimated_time_sec": int(parsed.get("estimated_time_sec") or 110),
                        "is_daily_challenge": True,
                        "published_date": today_str,
                        "status": "approved",
                        "author_credit": f"PMC Open Access Case Report • {candidate['pmcid']}",
                        "source_journal": {
                            "name": candidate["journal_title"],
                            "short_name": candidate["pmcid"],
                            "doi_url": candidate["doi_url"],
                            "pmcid": candidate["pmcid"],
                            "pmid": candidate["pmid"],
                            "pub_year": candidate["pub_year"]
                        },
                        "presentation": {
                            "demographics": pres.get("demographics", "Adult patient"),
                            "chief_complaint": pres.get("chief_complaint", ""),
                            "history_of_present_illness": pres.get("history_of_present_illness", ""),
                            "past_medical_history": pres.get("past_medical_history", "Unremarkable"),
                            "vitals": pres.get("vitals", {
                                "bp": "128/80 mmHg",
                                "hr": "78 bpm",
                                "rr": "16 /min",
                                "temp": "36.8 °C",
                                "spo2": "98%"
                            }),
                            "neuro_exam": pres.get("neuro_exam", ""),
                            "key_labs_csf": pres.get("key_labs_csf", ""),
                            "imaging": imaging_items
                        },
                        "challenge": parsed.get("challenge"),
                        "resolution": parsed.get("resolution")
                    }
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    time.sleep(2 * (attempt + 1))
                else:
                    break
            except Exception as e:
                print(f"   [!] Lỗi phân tích Gemini ({model_name}): {e}")
                time.sleep(1)
                continue

    return None


def rotate_daily_challenge_fallback(cases_list: list, day_index: int):
    """Nếu không tạo ca mới, tự động xoay vòng ca Daily Challenge theo ngày để mỗi ngày đều có ca mới."""
    if not cases_list:
        return False
    target_idx = day_index % len(cases_list)
    changed = False
    for idx, c in enumerate(cases_list):
        should_be_daily = (idx == target_idx)
        if bool(c.get("is_daily_challenge")) != should_be_daily:
            c["is_daily_challenge"] = should_be_daily
            changed = True
    return changed


def run():
    print("[NeuroCase 1/3] Đang kiểm tra kho dữ liệu ca lâm sàng tại public/data/cases.json...")
    existing_cases = load_existing_cases()
    today_dt = datetime.now(timezone.utc)
    today_str = today_dt.strftime("%Y-%m-%d")
    day_index = today_dt.timetuple().tm_yday

    used_pmcids = set()
    max_num = 0
    already_updated_today = False

    for c in existing_cases:
        pmcid = c.get("source_journal", {}).get("pmcid")
        if pmcid:
            used_pmcids.add(pmcid.strip())
        cid = c.get("id", "")
        m = re.search(r"nc-\d{4}-(\d+)", cid)
        if m:
            max_num = max(max_num, int(m.group(1)))
        if c.get("published_date") == today_str and c.get("is_daily_challenge"):
            already_updated_today = True

    print(f"-> Hiện có {len(existing_cases)} ca lâm sàng ({len(used_pmcids)} PMCID đã sử dụng).")

    if GEMINI_API_KEY and not already_updated_today:
        print("[NeuroCase 2/3] Đang tìm ca bệnh Open Access có hình ảnh thật từ EuropePMC / PubMed Central...")
        candidate = find_new_pmc_candidate(used_pmcids, day_index)
        if candidate:
            print(f"   -> Tìm thấy ứng viên mới: {candidate['pmcid']} ({candidate['journal_title']}) với {len(candidate['figures'])} hình ảnh.")
            print("   -> Đang gọi Gemini AI biên soạn bệnh án & câu hỏi trắc nghiệm chuẩn hội đồng...")
            new_case = generate_clinical_case_with_gemini(candidate, max_num + 1, today_str)
            if new_case and new_case.get("challenge") and new_case.get("resolution"):
                for c in existing_cases:
                    c["is_daily_challenge"] = False
                updated_cases = [new_case] + existing_cases
                save_cases_to_disk(updated_cases)
                print(f"[NeuroCase 3/3] ✨ Đã tạo thành công Daily Case mới [{new_case['case_code']}]: {new_case['title']}")
                return
        else:
            print("   -> Không tìm thấy ứng viên PMC mới trong lượt quét này.")
    elif already_updated_today:
        print(f"[NeuroCase 2/3] Đã có Daily Case xuất bản cho ngày hôm nay ({today_str}).")
    else:
        print("[NeuroCase 2/3] Không có GEMINI_API_KEY. Chuyển sang chế độ xoay vòng Daily Challenge tự động.")

    if rotate_daily_challenge_fallback(existing_cases, day_index):
        save_cases_to_disk(existing_cases)
        print("[NeuroCase 3/3] Đã xoay vòng Daily Challenge cho ngày mới.")
    else:
        print("[NeuroCase 3/3] Giữ nguyên trạng thái Daily Challenge hiện tại.")


if __name__ == "__main__":
    run()
