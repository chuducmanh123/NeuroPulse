import json
import os
import re
import socket
import ssl
import time
import urllib.parse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Ép buộc dùng IPv4 (AF_INET) để tránh lỗi treo "The read operation timed out" trên Windows
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
    key = os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    return key

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "NeuroJournalTracker/2.3 (mailto:contact@journaltracker.org; Clinical Research Aggregator)"
}

GEMINI_API_KEY = load_env_key()
ACTIVE_GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-3.8-flash"]
GEMINI_MODEL = ACTIVE_GEMINI_MODELS[0]

DATA_FILE_PATH = "public/data/articles.json"
MAX_ARTICLES_STORED = 300
MAX_GEMINI_CALLS_PER_RUN = 30

JOURNAL_CONFIGS = [
    {
        "name": "The New England Journal of Medicine",
        "short_name": "NEJM",
        "issn": "0028-4793",
        "badge_bg": "#FEE2E2",
        "badge_text": "#991B1B",
        "specialty_journal": False,
        "scan_rows": 60
    },
    {
        "name": "The Lancet",
        "short_name": "The Lancet",
        "issn": "0140-6736",
        "badge_bg": "#DBEAFE",
        "badge_text": "#1E40AF",
        "specialty_journal": False,
        "scan_rows": 60
    },
    {
        "name": "The Lancet Neurology",
        "short_name": "Lancet Neurol",
        "issn": "1474-4422",
        "badge_bg": "#CFFAFE",
        "badge_text": "#0E7490",
        "specialty_journal": True,
        "scan_rows": 30
    },
    {
        "name": "JAMA",
        "short_name": "JAMA",
        "issn": "0098-7484",
        "badge_bg": "#FEE2E2",
        "badge_text": "#DC2626",
        "specialty_journal": False,
        "scan_rows": 60
    },
    {
        "name": "JAMA Neurology",
        "short_name": "JAMA Neurol",
        "issn": "2168-6149",
        "badge_bg": "#FFE4E6",
        "badge_text": "#E11D48",
        "specialty_journal": True,
        "scan_rows": 30
    },
    {
        "name": "Stroke (AHA)",
        "short_name": "Stroke",
        "issn": "0039-2499",
        "badge_bg": "#FFE4E6",
        "badge_text": "#991B1B",
        "specialty_journal": True,
        "scan_rows": 30
    },
    {
        "name": "Neurology (AAN)",
        "short_name": "Neurology",
        "issn": "0028-3878",
        "badge_bg": "#DCFCE7",
        "badge_text": "#166534",
        "specialty_journal": True,
        "scan_rows": 30
    },
    {
        "name": "Annals of Neurology",
        "short_name": "Ann Neurol",
        "issn": "0364-5134",
        "badge_bg": "#EDE9FE",
        "badge_text": "#5B21B6",
        "specialty_journal": True,
        "scan_rows": 30
    }
]

NEURO_KEYWORDS = [
    "stroke", "ischemic", "infarction", "thrombectomy", "thrombolysis",
    "tenecteplase", "alteplase", "hemorrhage", "intracranial", "aneurysm",
    "epilepsy", "seizure", "status epilepticus", "parkinson", "alzheimer", "dementia",
    "multiple sclerosis", "neuropathy", "myasthenia", "encephalitis",
    "meningitis", "glioblastoma", "glioma", "meningioma", "brain tumor", "astrocytoma",
    "neurovascular", "cerebral", "neurological", "neurology", "brain",
    "neurodegenerative", "ataxia", "spinal", "tremor", "subarachnoid", "carotid",
    "endovascular", "neurocritical", "migraine", "headache", "cluster headache",
    "trigeminal", "cgrp", "ubrogepant", "atogepant", "erenumab", "neuropathic pain",
    "myelitis", "guillain-barré", "amyloid", "tau", "lecanemab", "donanemab",
    "concussion", "traumatic brain injury", "tbi", "coma", "delirium", "encephalopathy",
    "dystonia", "chorea", "als", "amyotrophic lateral sclerosis", "huntington", "prion",
    "neuromyelitis", "cidp", "myopathy", "muscular dystrophy"
]

NON_ARTICLE_PATTERNS = re.compile(
    r'^(correction|erratum|retraction|author.?s?\s+reply|correspondence|in\s+reply|issue\s+information|masthead|front\s+matter|calendar\s+of\s+events)',
    re.IGNORECASE
)

LEADING_SECTION_LABEL = re.compile(
    r'^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary|meaning)\s*[:.\-]?\s*',
    re.IGNORECASE
)

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if text.lower().startswith("nothing to report.") or text.lower().startswith("the data supporting the findings"):
        return ""
    return text

def clean_takeaway_text(text: str) -> str:
    if not text:
        return ""
    cleaned = clean_text(text)
    cleaned = LEADING_SECTION_LABEL.sub('', cleaned).strip()
    if cleaned.startswith("Published clinical evidence in") or "data may be available from the corresponding author" in cleaned.lower():
        return ""
    return cleaned

def normalize_iso_date(iso_str: str, fallback_iso: str = "") -> str:
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")
    if not iso_str:
        return fallback_iso or now_iso
    if iso_str > now_iso:
        if fallback_iso and fallback_iso <= now_iso:
            return fallback_iso
        return now_iso
    return iso_str

def extract_date_from_parts(parts_obj: dict) -> str:
    if not parts_obj:
        return ""
    date_parts = parts_obj.get("date-parts")
    if date_parts and len(date_parts[0]) >= 1:
        y = date_parts[0][0]
        m = str(date_parts[0][1] if len(date_parts[0]) >= 2 else 1).zfill(2)
        d = str(date_parts[0][2] if len(date_parts[0]) >= 3 else 1).zfill(2)
        return f"{y}-{m}-{d}T00:00:00Z"
    return ""

def classify_neurology_article(title: str, abstract: str = "", is_specialty: bool = False):
    text_corpus = f"{title} {abstract}".lower()
    matched = [kw for kw in NEURO_KEYWORDS if re.search(r'\b' + re.escape(kw.lower()) + r'\b', text_corpus)]

    if not matched and not is_specialty:
        return False, "Other", []

    subspecialty = "General Neurology"
    if any(k in matched for k in ["stroke", "ischemic", "infarction", "thrombectomy", "thrombolysis", "tenecteplase", "alteplase", "hemorrhage", "aneurysm", "subarachnoid", "carotid", "endovascular", "neurovascular"]) or re.search(r'\b(stroke|thrombectomy|thrombolysis|intracerebral hemorrhage|subarachnoid hemorrhage|carotid|ischemic stroke|atrial fibrillation)\b', text_corpus):
        subspecialty = "Vascular & Stroke"
    elif any(k in matched for k in ["alzheimer", "dementia", "amyloid", "tau", "lecanemab", "donanemab"]) or re.search(r'\b(cognitive decline|cognitive impairment|dementia|alzheimer|frontotemporal)\b', text_corpus):
        subspecialty = "Cognitive & Dementia"
    elif any(k in matched for k in ["multiple sclerosis", "neuropathy", "myasthenia", "encephalitis", "myelitis", "guillain-barré", "als", "amyotrophic lateral sclerosis", "neuromyelitis", "cidp", "myopathy", "muscular dystrophy"]) or re.search(r'\b(demyelinating|autoimmune encephalitis|myasthenia|multiple sclerosis|polyneuropathy|motor neuron)\b', text_corpus):
        subspecialty = "Neuroimmunology & Neuromuscular"
    elif any(k in matched for k in ["parkinson", "tremor", "ataxia", "dystonia", "chorea", "huntington"]) or re.search(r'\b(parkinson|movement disorder|dyskinesia|synuclein|deep brain stimulation)\b', text_corpus):
        subspecialty = "Movement Disorders"
    elif any(k in matched for k in ["epilepsy", "seizure", "status epilepticus"]) or re.search(r'\b(epilep|seizure|antiseizure|ictal)\b', text_corpus):
        subspecialty = "Epilepsy"
    elif any(k in matched for k in ["migraine", "headache", "cluster headache", "trigeminal", "cgrp", "ubrogepant", "atogepant", "erenumab", "neuropathic pain"]) or re.search(r'\b(migraine|headache|trigeminal|chronic pain|neuropathic pain)\b', text_corpus):
        subspecialty = "Headache & Pain"
    elif any(k in matched for k in ["glioblastoma", "glioma", "meningioma", "brain tumor", "astrocytoma"]) or re.search(r'\b(glioma|glioblastoma|brain metastasis|meningioma|medulloblastoma|neuro-oncology|central nervous system tumor)\b', text_corpus):
        subspecialty = "Neuro-Oncology"
    elif any(k in matched for k in ["concussion", "traumatic brain injury", "tbi", "coma", "delirium", "encephalopathy", "neurocritical", "meningitis"]) or re.search(r'\b(traumatic brain injury|concussion|neurocritical|intracranial pressure|coma|unresponsive wakefulness|meningitis|cardiac arrest|status epilepticus|intensive care)\b', text_corpus):
        subspecialty = "Neurocritical Care & TBI"

    formatted_topics = [t.capitalize() for t in (matched[:4] if matched else ["Neurology"])]
    return True, subspecialty, formatted_topics

def load_existing_cache() -> dict:
    if not os.path.exists(DATA_FILE_PATH):
        return {}
    try:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            cache = {}
            for item in data:
                if "id" in item:
                    item["pub_date"] = normalize_iso_date(item.get("pub_date", ""))
                    if "ai_takeaways" in item and isinstance(item["ai_takeaways"], dict):
                        item["ai_takeaways"]["conclusion_vi"] = clean_takeaway_text(
                            item["ai_takeaways"].get("conclusion_vi", "")
                        )
                    # Cập nhật lại phân khoa chi tiết hơn nếu đang ở General Neurology
                    _, new_sub, new_topics = classify_neurology_article(
                        item.get("title", ""), item.get("abstract", ""), is_specialty=True
                    )
                    if item.get("neurology_classification", {}).get("subspecialty") == "General Neurology" and new_sub != "General Neurology":
                        item["neurology_classification"]["subspecialty"] = new_sub
                        if new_topics:
                            item["neurology_classification"]["topics"] = new_topics
                    cache[item["id"]] = item
            return cache
    except Exception:
        return {}

def analyze_abstract_with_gemini(title: str, abstract: str) -> str:
    if not GEMINI_API_KEY or not abstract or len(abstract) < 80:
        return ""

    prompt = f"""You are an expert clinical neurologist and stroke methodologist.
Read this study abstract from a top-tier medical journal:
Title: {title}
Abstract: {abstract}

Provide a concise, high-yield clinical takeaway (1-2 sentences maximum, under 55 words) for practicing neurologists. Preserve exact statistical outcomes if present (e.g., OR, HR, RR, 95% CI, p-value, mRS). Do not include introductory filler or section headers."""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.15,
            "maxOutputTokens": 450
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
                with urllib.request.urlopen(req, context=ctx, timeout=18) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text_chunks = [p.get("text", "") for p in parts if "text" in p and not p.get("thought")]
                        summary = clean_takeaway_text(" ".join(text_chunks))
                        if summary:
                            time.sleep(1.2)
                            return summary
            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504):
                    time.sleep(2 * (attempt + 1))
                else:
                    break
            except Exception:
                time.sleep(1)
                continue

    return ""

def fetch_pubmed_abstract(doi: str, title: str = "") -> str:
    try:
        clean_doi = doi.strip()
        search_term = f"{clean_doi}[DOI]"
        esearch_url = (
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            f"?db=pubmed&term={urllib.parse.quote(search_term)}&retmode=json"
        )
        req = urllib.request.Request(esearch_url, headers=HEADERS)
        pmid = None
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            id_list = data.get("esearchresult", {}).get("idlist", [])
            if id_list:
                pmid = id_list[0]

        if not pmid and title and len(title) > 20:
            esearch_title_url = (
                f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
                f"?db=pubmed&term={urllib.parse.quote(title + '[Title]')}&retmode=json"
            )
            req_t = urllib.request.Request(esearch_title_url, headers=HEADERS)
            with urllib.request.urlopen(req_t, context=ctx, timeout=8) as resp_t:
                data_t = json.loads(resp_t.read().decode("utf-8"))
                id_list_t = data_t.get("esearchresult", {}).get("idlist", [])
                if id_list_t:
                    pmid = id_list_t[0]

        if not pmid:
            return ""

        efetch_url = (
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
            f"?db=pubmed&id={pmid}&retmode=xml"
        )
        req_f = urllib.request.Request(efetch_url, headers=HEADERS)
        with urllib.request.urlopen(req_f, context=ctx, timeout=10) as resp_f:
            xml_bytes = resp_f.read()
            root = ET.fromstring(xml_bytes)
            sections = []
            for abs_text in root.findall(".//AbstractText"):
                label = abs_text.attrib.get("Label") or abs_text.attrib.get("NlmCategory")
                txt = "".join(abs_text.itertext()).strip()
                if txt:
                    if label and label.upper() != "UNLABELLED":
                        sections.append(f"{label.upper()}: {txt}")
                    else:
                        sections.append(txt)
            combined = clean_text(" ".join(sections))
            if len(combined) > 80:
                return combined
    except Exception:
        pass
    return ""

def fetch_abstract_from_apis(doi: str, title: str = "") -> str:
    pubmed_abs = fetch_pubmed_abstract(doi, title)
    if pubmed_abs:
        return pubmed_abs

    try:
        url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%22{urllib.parse.quote(doi)}%22&format=json&resultType=core"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("resultList", {}).get("result", [])
            if results and results[0].get("abstractText"):
                clean = clean_text(results[0]["abstractText"])
                if len(clean) > 80:
                    return clean
    except Exception:
        pass

    try:
        clean_doi = doi.strip()
        url = f"https://api.openalex.org/works/https://doi.org/{urllib.parse.quote(clean_doi)}"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            inv_index = data.get("abstract_inverted_index")
            if inv_index:
                word_positions = []
                for word, positions in inv_index.items():
                    for pos in positions:
                        word_positions.append((pos, word))
                word_positions.sort(key=lambda x: x[0])
                words = [w[1] for w in word_positions]
                clean = clean_text(" ".join(words))
                if len(clean) > 80:
                    return clean
    except Exception:
        pass

    return ""

def detect_article_type(title: str, abstract: str, crossref_type: str) -> str:
    combined = f"{title} {abstract}".lower()
    if any(k in combined for k in ["randomized", "randomised", "phase 3", "phase 2", "clinical trial", "double-blind", "placebo-controlled"]):
        return "Clinical Trial"
    if any(k in combined for k in ["meta-analysis", "systematic review"]):
        return "Meta-Analysis / Review"
    if "guideline" in combined or "consensus" in combined or "scientific statement" in combined:
        return "Guideline"
    if "review" in crossref_type.lower() or "review" in title.lower():
        return "Review"
    return "Original Article"

def extract_fallback_takeaway(clean_abs: str) -> str:
    if not clean_abs or clean_abs.startswith("Original abstract"):
        return ""
    match_concl = re.search(
        r'(?:CONCLUSIONS?\s+AND\s+RELEVANCE|CONCLUSIONS?|INTERPRETATION|FINDINGS|DISCUSSION)\s*[:.]?\s*([^\n]+)',
        clean_abs,
        re.IGNORECASE
    )
    if match_concl:
        candidate = clean_takeaway_text(match_concl.group(1))
        if len(candidate) > 25:
            sents = [s.strip() for s in candidate.split(". ") if len(s.strip()) > 25]
            if sents:
                first_two = ". ".join(sents[:2])
                return first_two if first_two.endswith(".") else (first_two + ".")
            return candidate

    sents = [clean_takeaway_text(s) for s in clean_abs.split(". ") if len(s.strip()) > 30]
    sents = [s for s in sents if s]
    if sents:
        last_sent = sents[-1]
        return last_sent if last_sent.endswith(".") else (last_sent + ".")
    return ""

def fetch_journal_articles(journal_cfg: dict, cache: dict):
    issn = journal_cfg["issn"]
    rows = journal_cfg.get("scan_rows", 30)
    url = f"https://api.crossref.org/journals/{issn}/works?sort=published&order=desc&rows={rows}"
    req = urllib.request.Request(url, headers=HEADERS)
    articles = []

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=18) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("message", {}).get("items", [])
            print(f"   -> {journal_cfg['short_name']}: quét {len(items)} ấn phẩm.")

            for item in items:
                try:
                    title_list = item.get("title", [])
                    if not title_list:
                        continue
                    title = clean_text(title_list[0])
                    if not title or NON_ARTICLE_PATTERNS.search(title):
                        continue

                    doi = item.get("DOI", "").strip()
                    if not doi:
                        continue

                    online_iso = extract_date_from_parts(item.get("published-online", {}))
                    print_iso = extract_date_from_parts(item.get("published-print", {}))
                    created_iso = extract_date_from_parts(item.get("created", {}))
                    primary_iso = online_iso or print_iso or created_iso
                    pub_iso = normalize_iso_date(primary_iso, fallback_iso=created_iso)

                    if doi in cache:
                        cached_art = cache[doi]
                        cached_art["pub_date"] = normalize_iso_date(cached_art.get("pub_date", ""), fallback_iso=created_iso)
                        cached_abs = cached_art.get("abstract", "")
                        if cached_abs and not cached_abs.startswith("Original abstract and full manuscript"):
                            articles.append(cached_art)
                            continue

                    doi_url = item.get("URL", f"https://doi.org/{doi}")
                    raw_abs = item.get("abstract", "")
                    clean_abs = clean_text(raw_abs)

                    if not clean_abs or len(clean_abs) < 80:
                        real_abs = fetch_abstract_from_apis(doi, title)
                        if real_abs:
                            clean_abs = real_abs

                    is_neuro, subspecialty, topics = classify_neurology_article(
                        title, clean_abs, is_specialty=journal_cfg["specialty_journal"]
                    )
                    if not is_neuro:
                        continue

                    if not clean_abs or len(clean_abs) < 80:
                        clean_abs = f"Original abstract and full manuscript available at {journal_cfg['short_name']} via DOI."

                    authors = []
                    for a in item.get("author", []):
                        family = a.get("family", "")
                        given = a.get("given", "")
                        if family:
                            authors.append(f"{family} {given}".strip())

                    article_type = detect_article_type(title, clean_abs, item.get("type", ""))

                    # Trích xuất tạm kết luận fallback trước (Gemini sẽ chạy tập trung ở bước sau theo thứ tự bài mới nhất)
                    key_takeaway = ""
                    if clean_abs and not clean_abs.startswith("Original abstract"):
                        key_takeaway = extract_fallback_takeaway(clean_abs)

                    articles.append({
                        "id": doi,
                        "title": title,
                        "journal": {
                            "name": journal_cfg["name"],
                            "short_name": journal_cfg["short_name"],
                            "badge_bg": journal_cfg["badge_bg"],
                            "badge_text": journal_cfg["badge_text"]
                        },
                        "pub_date": pub_iso,
                        "article_type": article_type,
                        "authors": authors,
                        "doi_url": doi_url,
                        "neurology_classification": {
                            "subspecialty": subspecialty,
                            "topics": topics
                        },
                        "abstract": clean_abs,
                        "ai_takeaways": {
                            "conclusion_vi": key_takeaway,
                            "clinical_significance": f"Clinical significance for {subspecialty} practice.",
                            "ai_verified": False
                        }
                    })
                except Exception:
                    continue
    except Exception as e:
        print(f"   [!] Lỗi khi quét {journal_cfg['short_name']}: {e}")

    return articles

def save_articles_to_disk(all_articles: list):
    os.makedirs("public/data", exist_ok=True)
    with open(DATA_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)

def run():
    print("[1/4] Khởi động quét và cập nhật bài báo từ 8 tạp chí y khoa...")
    existing_cache = load_existing_cache()
    print(f"-> Đã tải {len(existing_cache)} bài báo từ bộ nhớ đệm.")

    merged_articles = dict(existing_cache)
    for cfg in JOURNAL_CONFIGS:
        print(f"+ Đang kết nối tạp chí: {cfg['name']} ({cfg['short_name']})...")
        arts = fetch_journal_articles(cfg, existing_cache)
        print(f"  => Thu thập được {len(arts)} bài thần kinh.")
        for art in arts:
            merged_articles[art["id"]] = art

    journal_order = [c["short_name"] for c in JOURNAL_CONFIGS]
    all_articles = list(merged_articles.values())
    all_articles.sort(
        key=lambda x: (
            x.get("pub_date", "")[:10],
            -(journal_order.index(x.get("journal", {}).get("short_name", "")) if x.get("journal", {}).get("short_name", "") in journal_order else 99)
        ),
        reverse=True
    )
    all_articles = all_articles[:MAX_ARTICLES_STORED]

    print(f"\n[2/4] Đã gộp và sắp xếp {len(all_articles)} bài báo (mới nhất lên đầu).")
    if all_articles:
        save_articles_to_disk(all_articles)
        print(f"-> Đã lưu bản cập nhật danh sách bài báo vào {DATA_FILE_PATH}.")

    if GEMINI_API_KEY and all_articles:
        print(f"\n[3/4] [AI Mode] Ưu tiên chạy {GEMINI_MODEL} cho các bài MỚI NHẤT trước (Tối đa {MAX_GEMINI_CALLS_PER_RUN} lượt/lần chạy)...")
        remaining_quota = MAX_GEMINI_CALLS_PER_RUN
        analyzed_count = 0

        for art in all_articles:
            if remaining_quota <= 0:
                break
            abs_text = art.get("abstract", "")
            has_real_abs = bool(abs_text) and not abs_text.startswith("Original abstract")
            already_verified = bool(art.get("ai_takeaways", {}).get("ai_verified"))

            if has_real_abs and not already_verified:
                pub_day = art.get("pub_date", "")[:10]
                j_short = art.get("journal", {}).get("short_name", "")
                ai_res = analyze_abstract_with_gemini(art.get("title", ""), abs_text)
                remaining_quota -= 1
                if ai_res:
                    if "ai_takeaways" not in art or not isinstance(art["ai_takeaways"], dict):
                        art["ai_takeaways"] = {}
                    art["ai_takeaways"]["conclusion_vi"] = ai_res
                    art["ai_takeaways"]["ai_verified"] = True
                    analyzed_count += 1
                    print(f"   [✨ Gemini AI #{analyzed_count} | {pub_day} | {j_short}] {art.get('title', '')[:55]}...")

        print(f"-> Hoàn tất phân tích AI cho {analyzed_count} bài báo (Còn dư {remaining_quota}/{MAX_GEMINI_CALLS_PER_RUN} lượt trong phiên).")
        if analyzed_count > 0:
            save_articles_to_disk(all_articles)
    else:
        print("\n[3/4] [Standard Mode] Không có GEMINI_API_KEY. Bỏ qua bước phân tích AI.")

    print(f"\n[4/4] Hoàn tất toàn bộ quy trình! Dữ liệu đã sẵn sàng tại {DATA_FILE_PATH}.")

if __name__ == "__main__":
    run()
