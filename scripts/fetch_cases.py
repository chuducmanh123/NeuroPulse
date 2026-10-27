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
from datetime import datetime, timezone, timedelta

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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
}

GEMINI_API_KEY = load_env_key()
ACTIVE_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"]

FIGURES_DIR = os.path.join("public", "data", "figures")
CASES_JSON_PATH = os.path.join("public", "data", "cases.json")
MAX_CASES_STORED = 90

# Danh sách tạp chí Thần kinh & Đột quỵ uy tín cao (loại trừ Cureus)
HIGH_IMPACT_JOURNAL_FILTER = " OR ".join([
    'JOURNAL:"J Neurol Neurosurg Psychiatry"',
    'JOURNAL:"Pract Neurol"',
    'JOURNAL:"Neurol Neuroimmunol Neuroinflamm"',
    'JOURNAL:"Neurol Clin Pract"',
    'JOURNAL:"Neurol Genet"',
    'JOURNAL:"Ann Clin Transl Neurol"',
    'JOURNAL:"Stroke"',
    'JOURNAL:"Stroke Vasc Interv Neurol"',
    'JOURNAL:"Eur Stroke J"',
    'JOURNAL:"J Neurointerv Surg"',
    'JOURNAL:"J Neurol"',
    'JOURNAL:"JAMA Netw Open"',
    'JOURNAL:"AJNR Am J Neuroradiol"',
    'JOURNAL:"BMJ Case Rep"',
    'JOURNAL:"Ther Adv Neurol Disord"',
    'JOURNAL:"Epilepsia Open"',
    'JOURNAL:"BMC Neurol"',
    'JOURNAL:"Front Neurol"',
])

EXCLUDED_JOURNALS_REGEX = re.compile(
    r"cureus|world j clin cases|medicine \(baltimore\)|int j surg case rep",
    re.IGNORECASE
)
EXCLUDED_TITLES_REGEX = re.compile(
    r"\b(systematic review|meta-analysis|randomized|retrospective cohort|prospective cohort|study protocol|registry|bibliometric|mendelian randomization|alluvial|mouse|mice|rat|in vitro)\b",
    re.IGNORECASE
)
EXCLUDED_CAPTIONS_REGEX = re.compile(
    r"\b(flow diagram|flowchart|prisma|forest plot|alluvial|schematic|study protocol|patient inclusion|eligibility|kaplan-meier|roc curve|bar graph|scatter plot|funnel plot|pedigree|timeline of the patient)\b",
    re.IGNORECASE
)
NEUROIMAGING_CAPTION_REGEX = re.compile(
    r"\b(MRI|FLAIR|DWI|diffusion-weighted|ADC|T1-weighted|T2-weighted|SWI|MRV|MRA|CTA|DSA|angiogram|angiography|hyperintense|hyperintensity|hypointense|infarction|occlusion|thrombosis|enhancement|gadolinium|EEG|electroencephalogram)\b",
    re.IGNORECASE
)

# Ngân hàng chủ đề ca lâm sàng Thần kinh & Đột quỵ đa dạng (mở rộng truy vấn toàn bài thay vì chỉ TITLE)
CLINICAL_CASE_TOPIC_BANK = [
    {
        "subspecialty": "Vascular & Stroke",
        "query": '("basilar artery occlusion" OR "posterior cerebral artery" OR "thalamic infarction" OR "pontine infarction") AND "case report" AND (MRI OR DWI OR DSA)',
        "keywords": ["posterior circulation", "stroke", "thrombectomy", "mri", "dwi"],
        "distractors": [
            "Acute middle cerebral artery M1 cardioembolic occlusion",
            "Hypertensive thalamic intracerebral hemorrhage",
            "Non-convulsive status epilepticus"
        ]
    },
    {
        "subspecialty": "Neuroimmunology",
        "query": '("autoimmune encephalitis" OR "NMDA receptor" OR "LGI1" OR "CASPR2" OR "MOG antibody" OR "aquaporin-4") AND "case report" AND MRI',
        "keywords": ["autoimmune encephalitis", "neuroimmunology", "mri", "flair", "immunotherapy"],
        "distractors": [
            "Acute ischemic middle cerebral artery stroke",
            "High-grade infiltrative glioblastoma (WHO Grade 4)",
            "Idiopathic intracranial hypertension"
        ]
    },
    {
        "subspecialty": "Vascular & Stroke",
        "query": '("reversible cerebral vasoconstriction" OR "CNS vasculitis" OR "moyamoya" OR "carotid dissection" OR "vertebral artery dissection") AND "case report" AND (MRI OR CTA OR MRA OR DSA)',
        "keywords": ["vasculopathy", "dissection", "stroke", "angiography", "mri"],
        "distractors": [
            "Ruptured saccular anterior communicating artery aneurysm",
            "Cerebral amyloid angiopathy",
            "Metabolic toxic encephalopathy"
        ]
    },
    {
        "subspecialty": "Epilepsy",
        "query": '("status epilepticus" OR "NORSE" OR "epilepsia partialis continua" OR "Rasmussen encephalitis" OR "limbic encephalitis") AND "case report" AND (MRI OR EEG)',
        "keywords": ["epilepsy", "status epilepticus", "eeg", "mri", "seizure"],
        "distractors": [
            "Psychogenic non-epileptic spells (PNES)",
            "Transient global amnesia (TGA)",
            "Acute basilar artery thrombosis"
        ]
    },
    {
        "subspecialty": "Neurocritical Care",
        "query": '("posterior reversible encephalopathy" OR "PRES" OR "osmotic demyelination" OR "central pontine myelinolysis" OR "cerebral venous thrombosis") AND "case report" AND MRI',
        "keywords": ["neurocritical care", "encephalopathy", "mri", "flair", "edema"],
        "distractors": [
            "Bilateral middle cerebral artery watershed infarction",
            "Herpes simplex virus type 1 (HSV-1) encephalitis",
            "Primary CNS diffuse large B-cell lymphoma"
        ]
    },
    {
        "subspecialty": "Cognitive & Dementia",
        "query": '("Creutzfeldt-Jakob" OR "cerebral amyloid angiopathy-related inflammation" OR "frontotemporal dementia" OR "Hashimoto encephalopathy") AND "case report" AND MRI',
        "keywords": ["rapidly progressive dementia", "cognitive", "cortical ribboning", "mri"],
        "distractors": [
            "Normal pressure hydrocephalus (NPH)",
            "Chronic subdural hematoma",
            "Early-onset familial Alzheimer disease"
        ]
    },
    {
        "subspecialty": "Neuromuscular",
        "query": '("Guillain-Barre" OR "Miller Fisher" OR "Bickerstaff" OR "hirayama disease" OR "radiculoplexus neuropathy" OR "CIDP") AND "case report" AND MRI',
        "keywords": ["neuromuscular", "neuropathy", "brainstem", "mri", "ivig"],
        "distractors": [
            "Cervical spondylotic myelopathy",
            "Myasthenia gravis with MuSK antibodies",
            "Amyotrophic lateral sclerosis (ALS)"
        ]
    },
    {
        "subspecialty": "Movement Disorders",
        "query": '("Wilson disease" OR "progressive supranuclear palsy" OR "multiple system atrophy" OR "chorea" OR "hemiballismus") AND "case report" AND MRI',
        "keywords": ["movement disorders", "basal ganglia", "midbrain", "mri"],
        "distractors": [
            "Idiopathic Parkinson disease",
            "Essential tremor",
            "Drug-induced tardive dyskinesia"
        ]
    },
    {
        "subspecialty": "Headache & Pain",
        "query": '("spontaneous intracranial hypotension" OR "pituitary apoplexy" OR "Tolosa-Hunt syndrome" OR "thunderclap headache") AND "case report" AND MRI',
        "keywords": ["headache", "cavernous sinus", "dural enhancement", "mri"],
        "distractors": [
            "Episodic migraine with visual aura",
            "Primary trigeminal neuralgia",
            "Tension-type headache"
        ]
    },
    {
        "subspecialty": "Neuro-Oncology",
        "query": '("primary central nervous system lymphoma" OR "leptomeningeal carcinomatosis" OR "tumefactive demyelinating" OR "paraneoplastic cerebellar") AND "case report" AND MRI',
        "keywords": ["neuro-oncology", "ring-enhancing lesion", "mri", "biopsy"],
        "distractors": [
            "Subacute ischemic cortical infarction",
            "Pyogenic cerebral abscess",
            "Cavernous malformation"
        ]
    },
]


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


def extract_figures_and_text_from_pmc(pmcid: str, doi: str, pmid: str, title: str, journal_title: str, journal_short: str, pub_year: str, abstract_text: str):
    """Tải nội dung ca bệnh và trích xuất 1-2 hình ảnh thật từ PMC CDN."""
    os.makedirs(FIGURES_DIR, exist_ok=True)
    case_body_text = abstract_text or ""
    extracted_figs = []

    try:
        pmc_page_url = f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/"
        html_str = fetch_url_bytes(pmc_page_url, timeout=18).decode("utf-8", errors="ignore")

        # Trích xuất các đoạn văn mô tả ca lâm sàng từ HTML bài báo
        paragraphs = []
        for m in re.finditer(r"<p\b[^>]*>([\s\S]*?)</p>", html_str, flags=re.IGNORECASE):
            txt = strip_html_tags(m.group(1))
            if len(txt) > 100 and re.search(
                r"\b(year-old|years old|man|woman|patient|presented with|admitted|history of|neurological examination|examination revealed|MRI|CT|CSF|treated with)\b",
                txt,
                flags=re.IGNORECASE
            ):
                paragraphs.append(txt)
                if len(paragraphs) >= 6:
                    break
        if paragraphs:
            case_body_text = "\n\n".join(paragraphs)[:4200]

        # Quét các thẻ <figure> lấy ảnh thật từ cdn.ncbi.nlm.nih.gov
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
            if len(caption) < 40:
                continue
            if EXCLUDED_CAPTIONS_REGEX.search(caption):
                continue
            if not NEUROIMAGING_CAPTION_REGEX.search(caption):
                continue

            try:
                img_bytes = fetch_url_bytes(cdn_url, timeout=15)
                if len(img_bytes) > 8500:
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
                        "caption": caption[:600],
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
        "journal_short": journal_short,
        "pub_year": pub_year,
        "abstract_text": abstract_text,
        "case_body_text": case_body_text,
        "figures": extracted_figs
    }


def find_new_pmc_candidate(used_pmcids: set, day_index: int):
    """Duyệt qua ngân hàng chủ đề lâm sàng trên các tạp chí uy tín để tìm 1 ca bệnh PMC mới có hình ảnh thần kinh."""
    total_topics = len(CLINICAL_CASE_TOPIC_BANK)
    for offset in range(total_topics):
        topic_cfg = CLINICAL_CASE_TOPIC_BANK[(day_index + offset) % total_topics]
        full_query = f"({topic_cfg['query']}) AND ({HIGH_IMPACT_JOURNAL_FILTER}) AND OPEN_ACCESS:y"
        encoded = urllib.parse.quote(full_query)
        search_url = (
            f"https://www.ebi.ac.uk/europepmc/webservices/rest/search"
            f"?query={encoded}&format=json&pageSize=25&resultType=core"
        )
        try:
            raw_bytes = fetch_url_bytes(search_url, timeout=18)
            data = json.loads(raw_bytes.decode("utf-8"))
            results = data.get("resultList", {}).get("result", [])
        except Exception as e:
            print(f"   [!] Lỗi truy vấn EuropePMC ({topic_cfg['subspecialty']}): {e}")
            continue

        for item in results:
            pmcid = item.get("pmcid", "").strip()
            doi = item.get("doi", "").strip()
            if not pmcid or not doi or pmcid in used_pmcids:
                continue

            pmid = item.get("pmid", "").strip()
            title = strip_html_tags(item.get("title", "")).rstrip(".")
            journal_info = item.get("journalInfo", {}).get("journal", {})
            journal_title = journal_info.get("title") or journal_info.get("medlineAbbreviation") or "Neurology Journal"
            journal_short = journal_info.get("isoAbbreviation") or journal_title
            pub_year = str(item.get("pubYear", "2025"))
            abstract_text = strip_html_tags(item.get("abstractText", ""))

            if EXCLUDED_JOURNALS_REGEX.search(journal_title):
                continue
            if EXCLUDED_TITLES_REGEX.search(title):
                continue

            candidate = extract_figures_and_text_from_pmc(
                pmcid, doi, pmid, title, journal_title, journal_short, pub_year, abstract_text
            )
            if candidate:
                candidate["default_subspecialty"] = topic_cfg["subspecialty"]
                candidate["default_keywords"] = topic_cfg["keywords"]
                candidate["default_distractors"] = topic_cfg.get("distractors", [
                    "Acute middle cerebral artery cardioembolic infarction",
                    "Herpes simplex virus type 1 (HSV-1) meningoencephalitis",
                    "High-grade infiltrative glial neoplasm"
                ])
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
   - `"peer_percentage"` across A, B, C, D must be integers summing to 100 (with the correct option having 64-82).
   - `"rationale"` for the correct option must start with `"Correct! "` and explain the neuroanatomical/clinical reasoning. `"rationale"` for incorrect options must start with `"Incorrect. "` and explain why that mimic is ruled out.
5. Output ONLY valid JSON matching this exact structure:
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
    "neuro_exam": "string",
    "key_labs_csf": "string",
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
    "related_keywords": ["string", "string", "string", "string"]
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
                            "modality": meta.get("modality") or "Brain MRI / Neuroimaging",
                            "sequence_badge": f"{fig['figure_label']} • {candidate['journal_short']} ({candidate['pmcid']})",
                            "figure_label": fig["figure_label"],
                            "image_url": fig["image_url"],
                            "pmcid": candidate["pmcid"],
                            "doi_url": candidate["doi_url"],
                            "caption": fig["caption"],
                            "findings_summary": meta.get("findings_summary") or fig["caption"][:200]
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
                        "author_credit": f"{candidate['journal_title']} • {candidate['pmcid']}",
                        "source_journal": {
                            "name": candidate["journal_title"],
                            "short_name": candidate["journal_short"],
                            "doi_url": candidate["doi_url"],
                            "pmcid": candidate["pmcid"],
                            "pmid": candidate["pmid"],
                            "pub_year": candidate["pub_year"]
                        },
                        "presentation": {
                            "demographics": pres.get("demographics", "Adult patient"),
                            "chief_complaint": pres.get("chief_complaint", ""),
                            "history_of_present_illness": pres.get("history_of_present_illness", ""),
                            "past_medical_history": pres.get("past_medical_history", "As documented in clinical presentation"),
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


def build_structured_clinical_case_deterministic(candidate: dict, next_case_num: int, today_str: str) -> dict:
    """
    Bộ biên soạn bệnh án & câu hỏi trắc nghiệm tự động không phụ thuộc API Key (Deterministic NLP Fallback).
    Đảm bảo 100% mỗi ngày đều tạo được ca lâm sàng mới từ bài báo PMC ngay cả khi không có GEMINI_API_KEY hoặc hết hạn mức.
    """
    case_id = f"nc-2026-{str(next_case_num).zfill(3)}"
    case_code = f"NC-2026-{str(next_case_num).zfill(3)}"
    body = candidate["case_body_text"]
    article_title = candidate["article_title"]

    # Trích xuất nhân khẩu học (tuổi / giới)
    demo_match = re.search(
        r"\b(\d{1,2}-year-old\s+(?:right-handed\s+|left-handed\s+)?(?:man|woman|male|female|boy|girl|patient))\b",
        body,
        flags=re.IGNORECASE
    )
    demographics = demo_match.group(1) if demo_match else "Adult Neurology Patient"

    sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", body)
        if len(s.strip()) > 35
    ]

    hpi_sents = [
        s for s in sentences
        if re.search(r"\b(presented|admitted|history|developed|onset|complained|awoke|experienced)\b", s, re.I)
    ]
    exam_sents = [
        s for s in sentences
        if re.search(r"\b(examination|neurological|pupils|cranial|NIHSS|GCS|reflex|weakness|hemiparesis|ataxia|aphasia|nystagmus|sensory|Babinski)\b", s, re.I)
    ]
    lab_sents = [
        s for s in sentences
        if re.search(r"\b(CSF|cerebrospinal|pleocytosis|protein|oligoclonal|antibody|autoantibodies|serum|D-dimer|EEG|titer|normal|negative|positive)\b", s, re.I)
    ]

    clean_diagnosis = re.sub(r"\s*[:—–-]\s*a?\s*case report.*$", "", article_title, flags=re.I).strip()
    blinded_title = f"Acute {candidate['default_subspecialty']} Syndrome & Characteristic Neuroimaging in a {demographics}"

    imaging_items = []
    for fig in candidate["figures"]:
        cap = fig["caption"]
        modality = "Brain MRI (Multiplanar Sequences)"
        if re.search(r"\bDSA|angiogram|angiography\b", cap, re.I):
            modality = "Cerebral Digital Subtraction Angiography (DSA)"
        elif re.search(r"\bCTA|CT angiography\b", cap, re.I):
            modality = "CT Angiography (CTA)"
        elif re.search(r"\bMRV|venography\b", cap, re.I):
            modality = "Brain MRI & MR Venography (MRV)"
        elif re.search(r"\bDWI|diffusion\b", cap, re.I):
            modality = "Brain MRI (Axial DWI & FLAIR)"

        imaging_items.append({
            "modality": modality,
            "sequence_badge": f"{fig['figure_label']} • {candidate['journal_short']} ({candidate['pmcid']})",
            "figure_label": fig["figure_label"],
            "image_url": fig["image_url"],
            "pmcid": candidate["pmcid"],
            "doi_url": candidate["doi_url"],
            "caption": cap,
            "findings_summary": cap[:220]
        })

    target_correct_opt = ["A", "B", "C", "D"][next_case_num % 4]
    distractors = candidate.get("default_distractors", [
        "Acute cardioembolic middle cerebral artery M1 occlusion",
        "Herpes simplex virus type 1 (HSV-1) meningoencephalitis",
        "High-grade infiltrative glial neoplasm"
    ])

    option_ids = ["A", "B", "C", "D"]
    options = []
    d_idx = 0
    peer_map = {0: 14, 1: 10, 2: 8}
    for oid in option_ids:
        if oid == target_correct_opt:
            options.append({
                "id": oid,
                "text": clean_diagnosis,
                "peer_percentage": 68,
                "rationale": f"Correct! The clinical presentation, neurological examination, and neuroimaging findings ({candidate['pmcid']}) establish {clean_diagnosis}."
            })
        else:
            d_text = distractors[d_idx % len(distractors)]
            peer_val = peer_map.get(d_idx, 8)
            d_idx += 1
            options.append({
                "id": oid,
                "text": d_text,
                "peer_percentage": peer_val,
                "rationale": f"Incorrect. Ruled out by the specific neuroanatomical distribution on neuroimaging and diagnostic workup."
            })

    return {
        "id": case_id,
        "case_code": case_code,
        "title": blinded_title,
        "subspecialty": candidate["default_subspecialty"],
        "subspecialties": [candidate["default_subspecialty"]],
        "difficulty": "Fellow",
        "estimated_time_sec": 110,
        "is_daily_challenge": True,
        "published_date": today_str,
        "status": "approved",
        "author_credit": f"{candidate['journal_title']} • {candidate['pmcid']}",
        "source_journal": {
            "name": candidate["journal_title"],
            "short_name": candidate["journal_short"],
            "doi_url": candidate["doi_url"],
            "pmcid": candidate["pmcid"],
            "pmid": candidate["pmid"],
            "pub_year": candidate["pub_year"]
        },
        "presentation": {
            "demographics": demographics,
            "chief_complaint": hpi_sents[0][:180] if hpi_sents else sentences[0][:180],
            "history_of_present_illness": " ".join(hpi_sents[:4]) if hpi_sents else " ".join(sentences[:3]),
            "past_medical_history": "As documented in clinical presentation.",
            "vitals": {
                "bp": "134/82 mmHg",
                "hr": "78 bpm",
                "rr": "16 /min",
                "temp": "36.8 °C",
                "spo2": "98% on room air"
            },
            "neuro_exam": " ".join(exam_sents[:3]) if exam_sents else "Focal neurological findings correlating with the neuroimaging localization.",
            "key_labs_csf": " ".join(lab_sents[:2]) if lab_sents else "Diagnostic serum, CSF, and neurovascular workup performed as detailed in the case report.",
            "imaging": imaging_items
        },
        "challenge": {
            "question": "Based on the clinical presentation, neurological examination, and neuroimaging findings, which of the following is the most likely diagnosis?",
            "question_type": "Diagnosis",
            "correct_option": target_correct_opt,
            "options": options
        },
        "resolution": {
            "final_diagnosis": clean_diagnosis,
            "clinical_discussion": candidate.get("abstract_text") or " ".join(sentences[-4:]),
            "teaching_points": [
                f"Correlate acute/subacute neurological deficits with multiplanar neuroimaging sequences ({imaging_items[0]['modality']}).",
                f"Reference source: {candidate['journal_title']} ({candidate['pub_year']}) • {candidate['pmcid']}."
            ],
            "clinical_pitfalls": [
                "Delaying targeted neuroimaging or definitive workup when initial non-contrast CT is unremarkable."
            ],
            "related_keywords": candidate.get("default_keywords", ["neurology", "stroke", "mri"])
        }
    }


def run():
    print("[NeuroCase 1/3] Đang kiểm tra kho dữ liệu ca lâm sàng tại public/data/cases.json...")
    existing_cases = load_existing_cases()

    # Sử dụng múi giờ Việt Nam (UTC+7) để đồng bộ ngày Daily Challenge với người dùng
    vn_tz = timezone(timedelta(hours=7))
    today_dt = datetime.now(vn_tz)
    today_str = today_dt.strftime("%Y-%m-%d")
    day_index = today_dt.timetuple().tm_yday

    used_pmcids = set()
    max_num = 0
    already_scheduled_today = False

    # Đảm bảo tất cả các ca Daily lịch sử (nc-2026-...) luôn giữ is_daily_challenge = True
    for c in existing_cases:
        if str(c.get("id", "")).startswith("nc-2026-") and not c.get("archive_only"):
            c["is_daily_challenge"] = True

        pmcid = c.get("source_journal", {}).get("pmcid")
        if pmcid:
            used_pmcids.add(pmcid.strip())
        cid = c.get("id", "")
        m = re.search(r"nc-\d{4}-(\d+)", cid)
        if m:
            max_num = max(max_num, int(m.group(1)))
        if (
            c.get("published_date") == today_str
            and c.get("is_daily_challenge") is True
            and c.get("status", "approved") == "approved"
        ):
            already_scheduled_today = True

    print(f"-> Ngày hiện tại (UTC+7): {today_str} | Hiện có {len(existing_cases)} ca ({len(used_pmcids)} PMCID đã dùng).")

    if already_scheduled_today:
        save_cases_to_disk(existing_cases)
        print(f"[NeuroCase 2/3] ✅ Đã có ca Daily Challenge cho ngày {today_str}. Không cần tìm ca mới.")
        return

    print(f"[NeuroCase 2/3] Đang tìm ca bệnh Open Access mới cho ngày {today_str} từ các tạp chí Thần kinh uy tín...")
    candidate = find_new_pmc_candidate(used_pmcids, day_index)
    if candidate:
        print(f"   -> Tìm thấy ứng viên mới: {candidate['pmcid']} ({candidate['journal_title']}) với {len(candidate['figures'])} hình ảnh.")
        new_case = None
        if GEMINI_API_KEY:
            print("   -> Đang gọi Gemini AI biên soạn bệnh án & câu hỏi trắc nghiệm...")
            new_case = generate_clinical_case_with_gemini(candidate, max_num + 1, today_str)

        if not new_case or not new_case.get("challenge") or not new_case.get("resolution"):
            print("   -> Sử dụng bộ biên soạn cấu trúc lâm sàng tự động (Deterministic Clinical Builder)...")
            new_case = build_structured_clinical_case_deterministic(candidate, max_num + 1, today_str)

        # QUAN TRỌNG: Giữ nguyên is_daily_challenge = True cho các ca Daily của các ngày trước để hiển thị lịch sử ngày bên cạnh nút ⭐ Daily!
        updated_cases = [new_case] + existing_cases
        save_cases_to_disk(updated_cases)
        print(f"[NeuroCase 3/3] ✨ Đã xuất bản Daily Case mới cho ngày {today_str} [{new_case['case_code']}]: {new_case['title']}")
    else:
        save_cases_to_disk(existing_cases)
        print("[NeuroCase 3/3] Không tìm thấy ứng viên mới trong lượt quét này. Giữ nguyên danh sách Daily Challenge.")


if __name__ == "__main__":
    run()
