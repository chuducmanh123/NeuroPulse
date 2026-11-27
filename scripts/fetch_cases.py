import html
import json
import os
import re
import socket
import ssl
import sys
import time
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

# Ép buộc dùng IPv4 (AF_INET) để tránh lỗi treo kết nối trên Windows
if os.name == "nt":
    try:
        _orig_getaddrinfo = socket.getaddrinfo
        def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        socket.getaddrinfo = _ipv4_getaddrinfo
    except Exception:
        pass

def load_env_key() -> str:
    env_val = os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    if env_val:
        return env_val
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for filename in (".env.local", ".env"):
        env_path = os.path.join(repo_root, filename)
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
    return ""

def create_ssl_context():
    c = ssl.create_default_context()
    c.check_hostname = True
    c.verify_mode = ssl.CERT_REQUIRED
    return c

ctx = create_ssl_context()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
}

GEMINI_API_KEY = load_env_key()
# Thác nước mô hình AI ưu tiên từ cao xuống thấp (đọc từ Single Source of Truth config/gemini-models.json)
_REPO_ROOT = str(Path(__file__).resolve().parent.parent)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)
from core.gemini_models import get_gemini_waterfall
ACTIVE_GEMINI_MODELS = get_gemini_waterfall()

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
    r"\b("
    r"systematic review|meta-analysis|meta-regression|scoping review|narrative review|literature review|umbrella review|pooled analysis|"
    r"randomized|randomised|rct|clinical trial|controlled trial|double-blind|single-blind|open-label|placebo-controlled|phase\s+(?:i|ii|iii|iv|1|2|3|4)|trial protocol|study protocol|post-hoc|sub-analysis|"
    r"retrospective|prospective|cohort|case-control|cross-sectional|observational|multicenter|multi-center|nationwide|population-based|registry|epidemiolog(?:y|ical)|comparative study|validation study|diagnostic accuracy|real-world|longitudinal study|propensity score|"
    r"machine learning|deep learning|artificial intelligence|radiomics|nomogram|prediction model|predictive model|convolutional neural|neural network|random forest|xgboost|decision curve|feature extraction|"
    r"bibliometric|mendelian randomization|genome-wide|gwas|in vitro|mouse|mice|rat|rats|animal model|alluvial|"
    r"case series|case-series|series of (?:cases|patients)|multiple cases|mini-series|"
    r"(?:two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:cases|patients|subjects|individuals)"
    r")\b",
    re.IGNORECASE
)

EXCLUDED_PUB_TYPES = {
    "review",
    "review-article",
    "systematic review",
    "systematic-review",
    "meta-analysis",
    "clinical trial",
    "clinical-trial",
    "randomized controlled trial",
    "randomized-controlled-trial",
    "controlled clinical trial",
    "pragmatic clinical trial",
    "observational study",
    "observational-study",
    "multicenter study",
    "multicenter-study",
    "comparative study",
    "comparative-study",
    "evaluation study",
    "validation study",
    "clinical study",
    "editorial",
    "letter",
    "comment",
    "erratum",
    "retraction",
    "study protocol",
    "protocol",
    "methods",
    "data-paper",
}

CASE_REPORT_TITLE_HINT_REGEX = re.compile(
    r"\b(case report|clinical reasoning|teaching neuroimages|mystery case|clinical image|images in neurology)\b",
    re.IGNORECASE,
)

CASE_SERIES_ABSTRACT_REGEX = re.compile(
    r"\b(case series|a series of (?:\d+|two|three|four|five|six|several) (?:cases|patients)|we (?:present|report|describe) (?:\d+|two|three|four|five|six|several) (?:cases|patients)|(?:case|patient)\s*1\b[\s\S]{0,600}\b(?:case|patient)\s*2\b)\b",
    re.IGNORECASE
)

NON_CASE_STUDY_ABSTRACT_REGEX = re.compile(
    r"\b("
    r"(?:retrospective(?:ly)?|prospective(?:ly)?)\s+(?:study|analysis|cohort|review|evaluation|investigation|collected|enrolled|included|data|multicenter|single-center)|"
    r"randomi[sz]ed\s+(?:controlled\s+)?trial|"
    r"(?:case-control|cross-sectional|observational|multicenter|multi-center|cohort)\s+(?:study|analysis|trial|design)|"
    r"(?:systematic\s+review|meta-analysis|scoping\s+review|bibliometric\s+analysis)|"
    r"(?:a\s+total\s+of|total\s+of|we\s+(?:enrolled|included|recruited|analyzed|evaluated|reviewed|screened|identified)|enrolled|included|recruited)\s+\d{2,}\s+(?:consecutive\s+)?(?:patients|cases|subjects|participants|individuals)|"
    r"\d{2,}\s+(?:consecutive\s+)?(?:patients|cases|subjects|participants|individuals)\s+(?:were\s+(?:enrolled|included|recruited|analyzed|evaluated|divided|randomi[sz]ed|retrospectively|prospectively)|with\b)|"
    r"(?:training|validation|test(?:ing)?)\s+(?:set|cohort|dataset|subset)|"
    r"(?:machine\s+learning|deep\s+learning|radiomics|decision\s+curve\s+analysis|convolutional\s+neural\s+network|random\s+forest|logistic\s+regression|cox\s+(?:proportional|regression)|kaplan-meier|receiver\s+operating\s+characteristic|area\s+under\s+the\s+(?:roc\s+)?curve)|"
    r"n\s*=\s*\d{2,}|interquartile\s+range|baseline\s+characteristics\s+of\s+(?:the\s+)?patients"
    r")\b",
    re.IGNORECASE,
)

PMC_NON_CASE_HTML_TYPE_REGEX = re.compile(
    r"\b(original research|research-article|research article|systematic review|meta-analysis|clinical trial|study protocol|brief research report|mini review|review article|methods)\b",
    re.IGNORECASE,
)

SINGLE_PATIENT_EVIDENCE_REGEX = re.compile(
    r"\b(?:"
    r"(?:\d{1,2}\s*[-–]?\s*(?:year|month|week|day)\s*[-–]?\s*old)\s+(?:right-handed\s+|left-handed\s+|previously\s+healthy\s+|pregnant\s+|hispanic\s+|caucasian\s+|asian\s+|african\s+|elderly\s+|young\s+)?(?:man|woman|male|female|boy|girl|infant|child|neonate|patient|gentleman|lady|adolescent)"
    r"|(?:a|an)\s+\d{1,2}\s*[-–]?\s*(?:year|month)\s*[-–]?\s*old"
    r")\b",
    re.IGNORECASE,
)

CASE_SERIES_CAPTION_REGEX = re.compile(
    r"\b(?:(?:case|patient)\s*[2-9]\b|(?:cases|patients)\s*\d+\s*[-–&,]\s*\d+)\b",
    re.IGNORECASE
)

CASE_REPORT_QUERY_CONSTRAINT = (
    '(PUB_TYPE:"Case Reports" OR PUB_TYPE:"case-report" '
    'OR TITLE:"case report" OR TITLE:"clinical reasoning" '
    'OR TITLE:"teaching neuroimages" OR TITLE:"mystery case") '
    'AND NOT (PUB_TYPE:"Review" OR PUB_TYPE:"Systematic Review" '
    'OR PUB_TYPE:"Meta-Analysis" OR PUB_TYPE:"Clinical Trial" '
    'OR PUB_TYPE:"Randomized Controlled Trial" '
    'OR PUB_TYPE:"Observational Study" OR PUB_TYPE:"Multicenter Study" '
    'OR PUB_TYPE:"Comparative Study" OR PUB_TYPE:"Evaluation Study" '
    'OR PUB_TYPE:"Validation Study")'
)


def detect_non_case_report(
    title: str = "",
    abstract_text: str = "",
    paragraphs: list = None,
    captions: list = None,
    pub_types: list = None,
    html_str: str = "",
) -> str:
    """Trả về lý do nếu bài báo KHÔNG phải ca lâm sàng đơn lẻ (hồi cứu, tiến cứu, RCT, cohort, ML, loạt ca...); ngược lại trả về chuỗi rỗng."""
    if pub_types:
        norm_pts = [str(pt).strip().lower() for pt in pub_types if str(pt).strip()]
        for pt in norm_pts:
            if pt in EXCLUDED_PUB_TYPES:
                return f"Excluded publication type: {pt}"
        has_case_pt = any(pt in ("case-report", "case reports", "case report") for pt in norm_pts)
        if "research-article" in norm_pts and not has_case_pt and not CASE_REPORT_TITLE_HINT_REGEX.search(title or ""):
            return "Publication type is research-article (not a case report)"

    if html_str:
        head_chunk = html_str[:12000]
        meta_types = re.findall(
            r'<meta[^>]+name=["\'](?:citation_article_type|dc\.type)["\'][^>]+content=["\']([^"\']+)["\']',
            head_chunk,
            flags=re.IGNORECASE,
        )
        attr_types = re.findall(r'article-type=["\']([^"\']+)["\']', head_chunk, flags=re.IGNORECASE)
        article_type_tokens = " ".join(meta_types + attr_types).strip()
        if article_type_tokens:
            if PMC_NON_CASE_HTML_TYPE_REGEX.search(article_type_tokens) and not re.search(
                r"\bcase[- ]?report\b", article_type_tokens, re.IGNORECASE
            ):
                return f"PMC HTML article type is non-case: {article_type_tokens[:60]}"
        elif re.search(r"\bORIGINAL RESEARCH article\b|\bSYSTEMATIC REVIEW article\b|\bCLINICAL TRIAL article\b", head_chunk, re.IGNORECASE):
            return "PMC HTML header indicates Original Research / Review / Clinical Trial"

    if title and EXCLUDED_TITLES_REGEX.search(title):
        return f"Excluded title pattern: {title[:80]}"

    if abstract_text:
        if CASE_SERIES_ABSTRACT_REGEX.search(abstract_text):
            return "Abstract describes a case series / multiple cases"
        if NON_CASE_STUDY_ABSTRACT_REGEX.search(abstract_text):
            return "Abstract describes a multi-patient study / trial / cohort / ML research"

    if captions:
        for cap in captions:
            if CASE_SERIES_CAPTION_REGEX.search(cap):
                return f"Figure caption references multiple cases: {cap[:80]}"

    if paragraphs:
        joined = "\n".join(paragraphs)
        has_case_1_2 = (
            re.search(r"\bCase\s*1\b", joined, re.IGNORECASE)
            and re.search(r"\bCase\s*2\b", joined, re.IGNORECASE)
        )
        has_patient_1_2 = (
            re.search(r"\bPatient\s*1\b", joined, re.IGNORECASE)
            and re.search(r"\bPatient\s*2\b", joined, re.IGNORECASE)
        )
        if has_case_1_2 or has_patient_1_2:
            return "Article body contains multiple numbered cases (Case/Patient 1 & 2)"

        # Chỉ kiểm tra các đoạn đầu (Methods / Intro / Case body, trước Discussion) để tránh loại nhầm ca lâm sàng có trích dẫn RCT trong Discussion
        leading_body = "\n".join(paragraphs[:4])
        if NON_CASE_STUDY_ABSTRACT_REGEX.search(leading_body):
            return "Leading body paragraphs describe a multi-patient study / trial / cohort / ML research"

    return ""


def detect_case_series(title: str = "", abstract_text: str = "", paragraphs: list = None, captions: list = None) -> str:
    """Wrapper tương thích ngược cho detect_non_case_report."""
    return detect_non_case_report(
        title=title,
        abstract_text=abstract_text,
        paragraphs=paragraphs,
        captions=captions,
    )


EXCLUDED_CAPTIONS_REGEX = re.compile(
    r"\b("
    r"workflow|flow diagram|flowchart|pipeline|framework|architecture|prisma|forest plot|alluvial|schematic|"
    r"study protocol|study design|patient inclusion|patient selection|eligibility|consort|"
    r"kaplan-meier|survival curve|roc curve|receiver operating|auc|auroc|decision curve|dca|calibration curve|"
    r"nomogram|confusion matrix|bar graph|bar chart|histogram|scatter plot|box plot|boxplot|violin plot|funnel plot|"
    r"heatmap|shap|grad-cam|feature importance|feature extraction|data partitioning|prediction model|machine learning|deep learning|classification|"
    r"pedigree|timeline"
    r")\b",
    re.IGNORECASE
)
EXCLUDED_MODALITIES_REGEX = re.compile(
    r"\b(workflow|diagram|flowchart|pipeline|decision curve|dca|roc curve|kaplan-meier|forest plot|machine learning|bar chart|scatter plot|timeline|schematic|nomogram|heatmap)\b",
    re.IGNORECASE,
)
NEUROIMAGING_CAPTION_REGEX = re.compile(
    r"\b(MRI|FLAIR|DWI|diffusion-weighted|ADC|T1-weighted|T2-weighted|SWI|MRV|MRA|CTA|CT\b|DSA|angiogram|angiography|hyperintense|hyperintensity|hypointense|infarction|occlusion|thrombosis|enhancement|gadolinium|EEG|electroencephalogram|clinical photograph|photograph|rash|lesion|erythema|skin|papules|purpura|fundus|fundoscopy|papilledema|cranial nerve|ptosis|ophthalmoplegia|pupil|biopsy|histopathology|myopathy|muscle biopsy|EMG|electromyography)\b",
    re.IGNORECASE
)

# Bảng luân phiên chuyên khoa theo thứ trong tuần (Day-of-Week Specialty Schedule Matrix)
WEEKDAY_SPECIALTY_SCHEDULE = {
    0: "Stroke",                  # Thứ 2: Đột quỵ & Mạch máu não
    1: "Neuromuscular",           # Thứ 3: Bệnh thần kinh cơ & thần kinh ngoại biên
    2: "Epilepsy",                # Thứ 4: Động kinh & Điện não lâm sàng
    3: "Neuroimmunology",         # Thứ 5: Miễn dịch thần kinh (MS, NMOSD, MOGAD, Viêm não tự miễn)
    4: "Movement Disorders",      # Thứ 6: Rối loạn vận động
    5: "Neurocritical Care",      # Thứ 7: Hồi sức thần kinh & Chấn thương sọ não
    6: "Dementia",                # Chủ nhật: Sa sút trí tuệ, Nhận thức & Thần kinh hiếm gặp
}

# Ngân hàng chủ đề ca lâm sàng Thần kinh & Đột quỵ đa dạng (mở rộng truy vấn toàn bài thay vì chỉ TITLE)
CLINICAL_CASE_TOPIC_BANK = [
    {
        "subspecialty": "Stroke",
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
        "subspecialty": "Stroke",
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
        "subspecialty": "Dementia",
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
        "subspecialty": "CNS Infections",
        "query": '("tuberculous meningitis" OR "neurosyphilis" OR "cryptococcal meningitis" OR "brain abscess" OR "HSV encephalitis") AND "case report" AND (MRI OR CSF)',
        "keywords": ["cns infections", "meningitis", "brain abscess", "mri", "csf"],
        "distractors": [
            "Autoimmune limbic encephalitis",
            "High-grade glioma",
            "Neurosarcoidosis"
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
    {
        "subspecialty": "Other",
        "query": '("transverse myelitis" OR "spinal dural arteriovenous fistula" OR "epidural abscess" OR "subacute combined degeneration" OR "cervical myelopathy") AND "case report" AND (MRI OR spine)',
        "keywords": ["spinal cord", "myelopathy", "spine mri", "cord compression", "paraparesis"],
        "distractors": [
            "Guillain-Barré syndrome (AIDP variant)",
            "Thoracic aortic dissection with spinal ischemia",
            "Anterior spinal artery syndrome"
        ]
    },
    {
        "subspecialty": "Neuromuscular",
        "query": '("dermatomyositis" OR "myasthenia gravis" OR "Horner syndrome" OR "neurosyphilis" OR "neurosarcoidosis") AND "case report" AND (photograph OR clinical OR rash OR MRI)',
        "keywords": ["clinical finding", "neuromuscular", "myopathy", "rash", "cranial nerve"],
        "distractors": [
            "Inclusion body myositis",
            "Lambert-Eaton myasthenic syndrome",
            "Chronic inflammatory demyelinating polyneuropathy (CIDP)"
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


def extract_figures_and_text_from_pmc(
    pmcid: str,
    doi: str,
    pmid: str,
    title: str,
    journal_title: str,
    journal_short: str,
    pub_year: str,
    abstract_text: str,
    pub_types: list | None = None,
):
    """Tải nội dung ca bệnh (Presentation + Discussion) và trích xuất 1-2 hình ảnh thật từ PMC CDN.
    Từ chối mọi bài báo không phải ca lâm sàng đơn lẻ (hồi cứu, tiến cứu, RCT, cohort, ML, loạt ca...).
    """
    os.makedirs(FIGURES_DIR, exist_ok=True)
    case_body_text = abstract_text or ""
    discussion_text = ""
    extracted_figs = []

    try:
        pmc_page_url = f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/"
        html_str = fetch_url_bytes(pmc_page_url, timeout=18).decode("utf-8", errors="ignore")

        # Trích xuất tất cả các đoạn văn sạch từ HTML bài báo
        all_paragraphs = []
        for m in re.finditer(r"<p\b[^>]*>([\s\S]*?)</p>", html_str, flags=re.IGNORECASE):
            txt = strip_html_tags(m.group(1))
            if len(txt) > 90 and not re.search(
                r"\b(Creative Commons|Open Access|funding|conflict of interest|competing interests|acknowledgments|ethics approval|informed consent|supplementary material)\b",
                txt,
                flags=re.IGNORECASE
            ):
                all_paragraphs.append(txt)

        # Khối 1: Đoạn mô tả ca bệnh cá thể (Case Presentation) — ưu tiên câu chuyện lâm sàng của 1 bệnh nhân
        pres_paragraphs = []
        for txt in all_paragraphs:
            if len(txt) > 100 and re.search(
                r"\b(year-old|years old|month-old|presented with|presented to|admitted|chief complaint|physical examination|neurological examination|examination revealed|history of present)\b",
                txt,
                flags=re.IGNORECASE
            ):
                pres_paragraphs.append(txt)
                if len(pres_paragraphs) >= 6:
                    break
        if pres_paragraphs:
            case_body_text = "\n\n".join(pres_paragraphs)[:4200]

        # Khối 2: Đoạn bàn luận / chẩn đoán phân biệt / thông điệp chính (Discussion & Conclusion)
        pres_set = set(pres_paragraphs)
        disc_paragraphs = []
        for txt in all_paragraphs:
            if txt in pres_set:
                continue
            if re.search(
                r"\b(discussion|differential diagnosis|pitfall|misdiagnos|pathophysiology|mechanism|hallmark|in conclusion|takeaway|clinicians should|rare cause|diagnostic challenge|our patient|this case highlights|timely diagnosis|prognosis)\b",
                txt,
                flags=re.IGNORECASE
            ):
                disc_paragraphs.append(txt)
                if len(disc_paragraphs) >= 6:
                    break

        if not disc_paragraphs and len(all_paragraphs) > len(pres_paragraphs):
            remaining = [p for p in all_paragraphs if p not in pres_set]
            disc_paragraphs = remaining[-4:]

        if disc_paragraphs:
            discussion_text = "\n\n".join(disc_paragraphs)[:3500]

        # Quét các thẻ <figure> lấy ảnh thật từ cdn.ncbi.nlm.nih.gov
        fig_blocks = re.findall(r"<figure\b[^>]*>([\s\S]*?)</figure>", html_str, flags=re.IGNORECASE)
        all_captions = [
            strip_html_tags(m.group(1))
            for block in fig_blocks
            for m in [re.search(r"<figcaption[^>]*>([\s\S]*?)</figcaption>", block, flags=re.IGNORECASE)]
            if m
        ]
        non_case_reason = detect_non_case_report(
            title=title,
            abstract_text=abstract_text,
            paragraphs=all_paragraphs,
            captions=all_captions,
            pub_types=pub_types,
            html_str=html_str,
        )
        if non_case_reason:
            print(f"   [skip] {pmcid}: {non_case_reason}")
            return None

        # Bắt buộc phải có bằng chứng mô tả 1 bệnh nhân cụ thể (tuổi/giới) trong abstract hoặc phần bệnh án
        pres_joined = "\n".join(pres_paragraphs)
        if not (
            SINGLE_PATIENT_EVIDENCE_REGEX.search(abstract_text or "")
            or SINGLE_PATIENT_EVIDENCE_REGEX.search(pres_joined)
        ):
            print(f"   [skip] {pmcid}: No single-patient clinical presentation detected")
            return None

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
        "discussion_text": discussion_text,
        "figures": extracted_figs
    }


def find_new_pmc_candidate(used_pmcids: set, day_index: int, target_subspecialty: str = None):
    """Duyệt qua ngân hàng chủ đề lâm sàng trên các tạp chí uy tín để tìm 1 ca bệnh PMC đơn lẻ mới có hình ảnh thần kinh, ưu tiên theo chuyên khoa luân phiên của ngày."""
    topics = list(CLINICAL_CASE_TOPIC_BANK)
    if target_subspecialty:
        # Đưa các chủ đề thuộc chuyên khoa mục tiêu của ngày lên ưu tiên hàng đầu
        matched_topics = [t for t in topics if t["subspecialty"].lower() == target_subspecialty.lower()]
        other_topics = [t for t in topics if t["subspecialty"].lower() != target_subspecialty.lower()]
        topics = matched_topics + other_topics

    total_topics = len(topics)
    for offset in range(total_topics):
        topic_cfg = topics[(day_index + offset) % total_topics]
        full_query = f"({topic_cfg['query']}) AND ({CASE_REPORT_QUERY_CONSTRAINT}) AND ({HIGH_IMPACT_JOURNAL_FILTER}) AND OPEN_ACCESS:y"
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
            raw_pub_types = item.get("pubTypeList", {}).get("pubType", [])
            if isinstance(raw_pub_types, str):
                pub_types = [raw_pub_types]
            elif isinstance(raw_pub_types, list):
                pub_types = [str(pt) for pt in raw_pub_types if pt]
            else:
                pub_types = []

            if EXCLUDED_JOURNALS_REGEX.search(journal_title):
                continue
            skip_reason = detect_non_case_report(
                title=title,
                abstract_text=abstract_text,
                pub_types=pub_types,
            )
            if skip_reason:
                print(f"   [skip] {pmcid}: {skip_reason}")
                continue

            candidate = extract_figures_and_text_from_pmc(
                pmcid,
                doi,
                pmid,
                title,
                journal_title,
                journal_short,
                pub_year,
                abstract_text,
                pub_types=pub_types,
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


def _normalize_peer_percentages(options: list, correct_opt: str) -> None:
    """Đảm bảo peer_percentage của 4 phương án luôn là số nguyên có tổng bằng 100."""
    if not isinstance(options, list) or len(options) != 4:
        return
    vals = []
    for opt in options:
        try:
            v = int(round(float(opt.get("peer_percentage", 0))))
        except (TypeError, ValueError):
            v = 0
        v = max(1, min(97, v))
        opt["peer_percentage"] = v
        vals.append(v)

    total = sum(vals)
    if total != 100:
        diff = 100 - total
        target_idx = next((i for i, o in enumerate(options) if o.get("id") == correct_opt), 0)
        adjusted = max(1, min(97, options[target_idx]["peer_percentage"] + diff))
        options[target_idx]["peer_percentage"] = adjusted
        # Nếu vẫn lệch do kẹp biên, phân bổ phần còn lại
        rem = 100 - sum(o["peer_percentage"] for o in options)
        for i, opt in enumerate(options):
            if rem == 0:
                break
            if i != target_idx:
                cand = max(1, min(97, opt["peer_percentage"] + rem))
                rem -= cand - opt["peer_percentage"]
                opt["peer_percentage"] = cand


def _extract_leak_terms(final_diag: str, correct_opt_text: str) -> list[str]:
    """Trích xuất danh sách cụm từ dễ lộ đáp án (tên đầy đủ, đáp án đúng, gốc bệnh lý, và từ viết tắt trong ngoặc)."""
    terms: list[str] = []
    for raw in (final_diag, correct_opt_text):
        cleaned = (raw or "").strip()
        if len(cleaned) > 4:
            terms.append(cleaned)
        # Lấy phần gốc trước các cụm nguyên nhân/bổ nghĩa hoặc dấu ngoặc đơn
        stem = re.split(
            r"\s+(?:secondary to|due to|associated with|caused by|complicating|following|in a)\b|\s*\(",
            cleaned,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()
        if len(stem) > 5:
            terms.append(stem)
        # Lấy các từ viết tắt in hoa trong ngoặc đơn (vd: (PRES), (ADEM), (NMDAR))
        for acro in re.findall(r"\(([A-Z0-9-]{3,10})\)", cleaned):
            terms.append(acro)

    # Khử trùng lặp (không phân biệt hoa/thường) và sắp xếp dài -> ngắn để thay thế chính xác
    seen: set[str] = set()
    unique: list[str] = []
    for t in sorted(terms, key=len, reverse=True):
        key = t.lower()
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique


def _redact_leak_terms(text: str, leak_terms: list[str], replacement: str) -> str:
    """Ẩn toàn bộ các cụm từ lộ đáp án trong caption / findings_summary."""
    if not text:
        return text
    out = text
    for term in leak_terms:
        if len(term) <= 4 and term.isupper():
            # Từ viết tắt ngắn (vd: PRES, ADEM) -> khớp theo ranh giới từ và đúng chữ hoa để tránh thay nhầm từ thường
            out = re.sub(rf"\b{re.escape(term)}\b", replacement, out)
        else:
            out = re.sub(re.escape(term), replacement, out, flags=re.IGNORECASE)
    return out


def validate_case_quality(case: dict) -> tuple[bool, str]:
    """Kiểm tra chất lượng học thuật, dòng thời gian và chống lộ đáp án:
    1. question_type phải hợp lệ và đủ 4 options A, B, C, D.
    2. Câu hỏi không được hỏi 2 ý (Compound double-barrel question).
    3. Tên chẩn đoán cuối và đáp án đúng không được lộ trong tiêu đề, câu hỏi, chief complaint, HPI, neuro_exam, hoặc key_labs_csf.
    4. Kiểm tra đảo ngược thời gian giữa HPI (diễn tiến ICU/hôn mê muộn) và neuro_exam (khám tỉnh ban đầu).
    5. Tự động làm sạch caption/findings của hình ảnh (kể cả tên bệnh rút gọn & từ viết tắt) và chuẩn hóa peer_percentage về tổng 100.
    """
    challenge = case.get("challenge") or {}
    q_text = challenge.get("question", "")
    q_type = challenge.get("question_type", "")
    correct_opt = challenge.get("correct_option", "")
    options = challenge.get("options", [])
    title = case.get("title", "")
    pres = case.get("presentation", {})
    hpi = pres.get("history_of_present_illness", "")
    cc = pres.get("chief_complaint", "")
    neuro_exam = pres.get("neuro_exam", "")
    labs_csf = pres.get("key_labs_csf", "")
    final_diag = case.get("resolution", {}).get("final_diagnosis", "").strip()

    if q_type not in ("Diagnosis", "Acute Management", "Next Best Step", "Localization"):
        return False, f"Invalid question_type: {q_type}"

    if len(options) != 4 or correct_opt not in ("A", "B", "C", "D"):
        return False, "Options count is not 4 or correct_option invalid"

    # 1. Kiểm tra hỏi kép 2 ý (Compound double-barrel question)
    if re.search(r"\band\s+(?:the\s+)?(?:optimal|most\s+appropriate|next\s+step|management|treatment|diagnostic|therapeutic)\b", q_text, re.IGNORECASE):
        return False, "Compound double-barrel question detected (asking both diagnosis and management)"
    if re.search(r"\bas\s+well\s+as\s+(?:the\s+)?", q_text, re.IGNORECASE):
        return False, "Compound question detected ('as well as')"

    # 2. Kiểm tra đảo ngược thời gian giữa HPI và neuro_exam
    late_hpi_re = re.compile(
        r"\b(coma|comatose|intubated|mechanical ventilation|external ventricular drain|icu admission|subsequently deteriorated)\b",
        re.IGNORECASE,
    )
    alert_exam_re = re.compile(
        r"\b(initially alert|awake and alert|alert and oriented|normal cranial nerves and no focal)\b",
        re.IGNORECASE,
    )
    if late_hpi_re.search(hpi) and alert_exam_re.search(neuro_exam):
        return False, "Chronological reversal between HPI and neuro_exam"

    # 2b. Kiểm tra hình ảnh không phải biểu đồ / workflow diagram / DCA / ROC
    for img in pres.get("imaging", []):
        if EXCLUDED_MODALITIES_REGEX.search(img.get("modality", "")) or EXCLUDED_CAPTIONS_REGEX.search(img.get("caption", "")):
            return False, "Non-clinical figure/diagram detected in imaging"

    # 3. Kiểm tra lộ chẩn đoán cuối / đáp án đúng trong toàn bộ dữ kiện trước khi giải
    correct_opt_text = next(
        (str(o.get("text", "")).strip() for o in options if o.get("id") == correct_opt),
        "",
    )
    leak_terms = _extract_leak_terms(final_diag, correct_opt_text)

    if len(final_diag) > 4:
        diag_lower = final_diag.lower()
        if diag_lower in q_text.lower():
            return False, "Final diagnosis appears inside the question text (answer leakage)"
        if diag_lower in title.lower():
            return False, "Final diagnosis appears inside the title"
        if diag_lower in cc.lower():
            return False, "Final diagnosis appears inside the chief complaint"
        if diag_lower in hpi.lower():
            return False, "Final diagnosis appears inside HPI (answer leakage)"
        if diag_lower in neuro_exam.lower():
            return False, "Final diagnosis appears inside neuro_exam (answer leakage)"
        if diag_lower in labs_csf.lower():
            return False, "Final diagnosis appears inside key_labs_csf (answer leakage)"

    if q_type == "Diagnosis" and len(correct_opt_text) > 5:
        opt_lower = correct_opt_text.lower()
        if opt_lower in q_text.lower():
            return False, "Correct option appears inside the question text (answer leakage)"
        if opt_lower in title.lower():
            return False, "Correct option appears inside the title"
        if opt_lower in cc.lower():
            return False, "Correct option appears inside the chief complaint"
        if opt_lower in hpi.lower():
            return False, "Correct option appears inside HPI (answer leakage)"
        if opt_lower in neuro_exam.lower():
            return False, "Correct option appears inside neuro_exam (answer leakage)"
        if opt_lower in labs_csf.lower():
            return False, "Correct option appears inside key_labs_csf (answer leakage)"

    # 4. Làm sạch caption và findings_summary nếu lỡ chứa tên chẩn đoán cuối, đáp án đúng hoặc từ viết tắt
    if leak_terms:
        for img in pres.get("imaging", []):
            if "caption" in img and img["caption"]:
                img["caption"] = _redact_leak_terms(img["caption"], leak_terms, "characteristic pathology")
            if "findings_summary" in img and img["findings_summary"]:
                img["findings_summary"] = _redact_leak_terms(img["findings_summary"], leak_terms, "the primary abnormality")

    # 5. Chuẩn hóa peer_percentage tổng bằng 100
    _normalize_peer_percentages(options, correct_opt)

    return True, "Passed"


def _call_gemini_json(prompt: str, temperature: float = 0.15, stage_label: str = "pass") -> dict | None:
    """Gọi Gemini REST API theo Waterfall Single Source of Truth (config/gemini-models.json).
    Tương thích đầy đủ với Gemini 4.x / 3.x thinking models (lọc bỏ part.thought, không giới hạn token quá chặt,
    dùng header x-goog-api-key và ghi log fallback rõ ràng).
    """
    if not GEMINI_API_KEY:
        return None

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
        },
    }
    local_ctx = create_ssl_context()

    for idx, model_name in enumerate(ACTIVE_GEMINI_MODELS):
        next_model = ACTIVE_GEMINI_MODELS[idx + 1] if idx + 1 < len(ACTIVE_GEMINI_MODELS) else None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"

        for attempt in range(2):
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": GEMINI_API_KEY,
                    },
                )
                with urllib.request.urlopen(req, context=local_ctx, timeout=45) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise ValueError("Empty candidates array")
                    parts = candidates[0].get("content", {}).get("parts", [])
                    raw_str = "".join(
                        p.get("text", "") for p in parts if "text" in p and not p.get("thought")
                    ).strip()
                    if not raw_str and parts and parts[0].get("text"):
                        raw_str = str(parts[0].get("text", "")).strip()

                    raw_str = re.sub(r"^```(?:json)?\s*", "", raw_str)
                    raw_str = re.sub(r"\s*```$", "", raw_str)
                    json_match = re.search(r"\{[\s\S]*\}", raw_str)
                    if json_match:
                        raw_str = json_match.group(0)

                    parsed = json.loads(raw_str)
                    if isinstance(parsed, dict):
                        return parsed
                    raise ValueError("Parsed Gemini output is not a JSON object")

            except urllib.error.HTTPError as e:
                if e.code in (429, 500, 502, 503, 504) and attempt == 0:
                    time.sleep(2)
                    continue
                next_info = f" -> falling back to {next_model}" if next_model else " -> no more fallback models"
                print(
                    f"   [Gemini Waterfall Fallback] [fetch_cases:{stage_label}] "
                    f"{model_name} (HTTP {e.code}): {e.reason}{next_info}"
                )
                break
            except Exception as e:
                next_info = f" -> falling back to {next_model}" if next_model else " -> no more fallback models"
                print(
                    f"   [Gemini Waterfall Fallback] [fetch_cases:{stage_label}] "
                    f"{model_name}: {e}{next_info}"
                )
                break

    return None


def critique_and_refine_with_gemini(raw_case_json: dict, candidate: dict | None = None) -> dict:
    """Stage 3 (Pass 2): Strict Senior Neurology Examiner Critique.
    - Kiểm tra hỏi 1 ý (Single-focus rule).
    - Kiểm tra dòng thời gian 1 chiều xuyên suốt HPI -> neuro_exam -> key_labs_csf.
    - Chống lộ đáp án (Lexical + Semantic) và cắt xét nghiệm khẳng định/loại trừ muộn khỏi key_labs_csf.
    - Đảm bảo 4 đáp án là chẩn đoán phân biệt thực sự và không quá hiển nhiên.
    """
    if not GEMINI_API_KEY:
        return raw_case_json

    discussion_ref = (candidate or {}).get("discussion_text", "")[:2000]
    critique_prompt = f"""You are a Strict Senior Neurology Examination Committee Reviewer.
Review and revise the following draft clinical case vignette and MCQ:
{json.dumps(raw_case_json, indent=2)}

ARTICLE DISCUSSION REFERENCE (for verifying differentials & diagnostic inflection point):
{discussion_ref or "Use the clinical facts in the draft."}

EXAMINER REVIEW CHECKLIST (REVISE STRICTLY AS NEEDED):
1. SINGLE-FOCUS QUESTION: Ensure `challenge.question` asks strictly ONE clinical concept (`Diagnosis`, `Next Best Step`, `Acute Management`, or `Localization`). NEVER combine diagnosis and management. No 'and the...' or 'as well as...'.
2. STRICT ONE-WAY CHRONOLOGY:
   - The UI concatenates `history_of_present_illness + " " + neuro_exam + " " + key_labs_csf` into ONE paragraph.
   - `history_of_present_illness` MUST stop at initial ED/clinic arrival. Remove any late hospital course, ICU deterioration, coma, intubation, or EVD from HPI if `neuro_exam` starts with an alert initial exam (or move post-arrival deterioration strictly after the initial exam / into `clinical_discussion`).
3. ZERO LEXICAL OR SEMANTIC ANSWER LEAKAGE (INCLUDING IMAGE CAPTIONS):
   - Remove the final diagnosis name, the correct option text, disease acronyms/eponyms (e.g., "PRES", "ADEM", "NMDAR"), AND overly specific syndrome buzzwords from `title`, `chief_complaint`, `history_of_present_illness`, `neuro_exam`, `key_labs_csf`, `question`, `imaging_metadata[].caption`, and `imaging_metadata[].findings_summary`.
   - Specifically audit EVERY `presentation.imaging_metadata[].caption`: replace diagnostic framing (e.g., "Imaging studies of a patient with [Diagnosis]...") with neutral anatomical/temporal framing (e.g., "Neuroimaging obtained immediately after the clinical event..."), ensure it describes only modality/panels and objective findings, and ensure it ends as a complete sentence (no mid-sentence truncation).
   - Use objective clinical signs instead of diagnostic labels.
4. DIAGNOSTIC TIMEPOINT CUTOFF (CRITICAL):
   - Keep only INITIAL/FIRST-LINE labs and CSF in `key_labs_csf` (e.g., opening pressure, cell count, protein, glucose).
   - STRIP late confirmatory or broad exclusion workup (e.g., negative broad viral/bacterial PCR panels, negative bacterial/fungal cultures, negative oligoclonal bands, definitive autoantibodies, biopsy results) from `key_labs_csf` if they trivially eliminate 2-3 distractors; ensure those findings are explained in `resolution.clinical_discussion` instead.
5. NON-TRIVIAL CHALLENGE & REAL DIFFERENTIALS:
   - Ensure all 3 distractors remain clinically plausible given the withheld late labs and reflect real differential diagnoses from the article.
   - Keep `correct_option` as "{raw_case_json.get('challenge', {}).get('correct_option', 'A')}" and ensure `peer_percentage` values are integers summing to 100.
   - Keep `imaging_metadata` array exact length ({len(raw_case_json.get('presentation', {}).get('imaging_metadata', []))}).
6. Output ONLY 100% valid JSON matching the exact same schema."""

    refined = _call_gemini_json(critique_prompt, temperature=0.1, stage_label="pass2_examiner")
    if isinstance(refined, dict) and refined.get("challenge") and refined.get("resolution"):
        return refined
    return raw_case_json


def editorial_and_logic_review_with_gemini(case_json: dict, candidate: dict | None = None) -> dict:
    """Stage 4 (Pass 3): Harsh Senior Medical Editor Review (NEJM / Neurology style).
    - Kiểm tra ngữ pháp tiếng Anh y khoa, thì động từ, đơn vị đo lường.
    - Kiểm tra tính liên tục mạch lạc khi ghép HPI + neuro_exam + key_labs_csf thành 1 đoạn văn (không lặp ý, không đảo ngược thời gian).
    - Kiểm tra tính logic xuyên suốt từ dữ kiện đề bài -> câu hỏi & 4 options -> rationales -> clinical_discussion -> teaching_points -> clinical_pitfalls.
    """
    if not GEMINI_API_KEY:
        return case_json

    pres = case_json.get("presentation", {})
    combined_vignette = (
        f"{pres.get('history_of_present_illness', '')} "
        f"{pres.get('neuro_exam', '')} "
        f"{pres.get('key_labs_csf', '')}"
    ).strip()
    correct_opt_id = case_json.get("challenge", {}).get("correct_option", "A")
    correct_opt_text = next(
        (
            str(o.get("text", "")).strip()
            for o in case_json.get("challenge", {}).get("options", [])
            if o.get("id") == correct_opt_id
        ),
        "",
    )
    img_meta_list = pres.get("imaging_metadata", [])
    captions_preview = "\n".join(
        f"- Figure {i + 1} | modality={m.get('modality', '')} | caption={m.get('caption', '')} | findings_summary={m.get('findings_summary', '')}"
        for i, m in enumerate(img_meta_list)
        if isinstance(m, dict)
    )

    editor_prompt = f"""You are a Harsh Senior Medical Editor for NEJM Clinical & Imaging Challenge and Neurology Resident & Fellow Section.
Audit and polish this clinical case JSON for academic medical prose, narrative continuity, and end-to-end clinical logic:
{json.dumps(case_json, indent=2)}

RENDERED VIGNETTE PREVIEW (this exact concatenated paragraph is what readers see before answering):
"{combined_vignette}"

RENDERED FIGURE CAPTIONS PREVIEW (readers can view `caption` as a hint BEFORE answering; `final_diagnosis` = "{case_json.get('resolution', {}).get('final_diagnosis', '')}", `correct_option` = "{correct_opt_text}"):
{captions_preview or "None"}

HARSH EDITOR REVIEW CHECKLIST (FIX ALL DEFECTS DIRECTLY IN THE OUTPUT JSON):
1. MEDICAL GRAMMAR, TENSE & UNITS:
   - Use precise academic neurology terminology, past tense for patient presentation/exam/labs, and present tense for general medical principles in `teaching_points`, `clinical_pitfalls`, and pathophysiological explanations.
   - Standardize medical units (e.g., `cmH2O`, `mg/dL`, `µL`, `mmHg`, `bpm`). Eliminate AI-sounding filler or choppy phrasing.
2. SEAMLESS SINGLE-PARAGRAPH CONTINUITY:
   - Read the RENDERED VIGNETTE PREVIEW word-for-word. Eliminate any repetition between `history_of_present_illness` and `neuro_exam`.
   - Verify strict chronological flow (Onset -> Presentation -> Initial Neuro Exam -> Initial Labs/CSF). Never allow late coma/intubation/ICU events to precede an initially alert exam.
   - Ensure smooth transitions across the 3 concatenated fields without re-introducing any leaked diagnosis or late confirmatory tests.
3. END-TO-END CLINICAL LOGIC & CONSISTENCY:
   - Verify that the vignette clues + imaging logically support the `correct_option` without contradicting any detail.
   - Verify that every option's `rationale` directly matches the vignette facts (correct option starts with `"Correct! "`; incorrect options start with `"Incorrect. "`).
   - Verify `resolution.clinical_discussion` is structured cleanly into 3 cohesive paragraphs separated by `\\n\\n`:
     * Paragraph 1: Differential diagnosis & why the mimics were plausible.
     * Paragraph 2: The diagnostic inflection point, the late confirmatory/exclusion tests withheld from the vignette, and pathophysiology of `final_diagnosis`.
     * Paragraph 3: Targeted management and clinical outcome.
   - Verify `resolution.teaching_points` (3-4 generalizable, high-yield board pearls) and `resolution.clinical_pitfalls` (2-3 concrete diagnostic/management traps) align directly with the question and the article's main lesson.
   - Preserve `challenge.correct_option` ("{correct_opt_id}") and exact `imaging_metadata` count ({len(img_meta_list)}).
4. BLINDED FIGURE CAPTIONS & RADIOLOGICAL CONSISTENCY:
   - Audit EVERY entry in `RENDERED FIGURE CAPTIONS PREVIEW` against `final_diagnosis` and `correct_option`.
   - Rewrite any `imaging_metadata[].caption` or `findings_summary` that mentions or hints at the diagnosis, correct option, or its acronym (e.g., "Imaging studies of a patient with [Diagnosis]..." -> "Neuroimaging obtained immediately after the acute event...").
   - Ensure every `caption` is a complete, grammatically intact sentence (no mid-sentence truncation) and aligns radiologically with the vignette.
5. Output ONLY 100% valid JSON matching the exact same schema."""

    edited = _call_gemini_json(editor_prompt, temperature=0.1, stage_label="pass3_editor")
    if isinstance(edited, dict) and edited.get("challenge") and edited.get("resolution"):
        return edited
    return case_json


def generate_clinical_case_with_gemini(candidate: dict, next_case_num: int, today_str: str, is_daily: bool = True):
    """Stage 2-5: Quy trình 3-Pass AI (Board Director -> Strict Examiner -> Harsh Medical Editor) + Guardrails."""
    if not GEMINI_API_KEY:
        return None

    figures_desc = "\n".join(
        f"- {fig['figure_label']}: {fig['caption']}"
        for fig in candidate["figures"]
    )
    discussion_text = candidate.get("discussion_text") or candidate.get("abstract_text") or ""
    target_correct_opt = ["A", "B", "C", "D"][next_case_num % 4]

    prompt = f"""You are a Senior Neurology & Stroke Board Examination Director.
Convert the following real Open Access PubMed Central neurological case report into an interactive board-style Clinical Case vignette in strict JSON format.

SOURCE ARTICLE METADATA:
- Original Title: {candidate['article_title']}
- PMCID: {candidate['pmcid']} ({candidate['journal_title']}, {candidate['pub_year']})
- Case Presentation Text: {candidate['case_body_text']}
- Discussion & Authors' Key Takeaways: {discussion_text}
- Extracted Neuroimaging Figures:
{figures_desc}

CRITICAL DESIGN RULES (6-STAGE PIPELINE — PASS 1):
0. STRICT SINGLE-PATIENT CASE REPORT GATE (ZERO FABRICATION):
   - First verify that the source article describes ONE real individual clinical patient (NOT a retrospective or prospective cohort study, NOT a randomized controlled trial, NOT a case-control/observational study, NOT a systematic review/meta-analysis, NOT a machine learning/original research study, and NOT a multi-patient case series) AND that the extracted figures are real clinical/neuroimaging figures of that patient (NOT workflow diagrams, ML pipelines, ROC/DCA curves, or statistical charts).
   - NEVER invent or fabricate a fictional patient to fit a non-case research paper.
   - If the article is NOT a single-patient clinical case report or its figures are non-clinical diagrams/charts, return ONLY:
     {{"is_single_patient_case_report": false, "reject_reason": "Brief reason"}}
1. IDENTIFY THE CLINICAL INFLECTION POINT:
   - Read "Discussion & Authors' Key Takeaways" to identify WHY the authors published this case (e.g., a deceptive clinical mimic, difficult etiologic workup, pivotal next diagnostic test, neuroanatomical localization, or acute management trap).
   - Do NOT ask a trivial broad-syndrome diagnosis (e.g., "encephalitis") if the clinical syndrome is already obvious and the real challenge is the underlying etiology or next best diagnostic/therapeutic step.
2. BLINDED TITLE & ZERO LEAKAGE:
   - Write a compelling presentation `title` based on symptoms/signs/anatomy WITHOUT naming the final diagnosis or giving away the correct answer.
3. STRICT ONE-WAY CHRONOLOGY & DIAGNOSTIC TIMEPOINT CUTOFF:
   - The UI renders `history_of_present_illness + " " + neuro_exam + " " + key_labs_csf` as ONE continuous NEJM-style paragraph.
   - `history_of_present_illness`: Strictly chronological pre-arrival history up to ED/clinic presentation (3-4 sentences). NEVER include subsequent hospital deterioration, ICU admission, coma, mechanical ventilation, EVD, or final outcome here.
   - `neuro_exam`: Initial neurological exam at presentation (avoid repeating HPI symptoms).
   - `key_labs_csf`: ONLY initial/first-line laboratory and CSF results available at the diagnostic decision point. WITHHOLD late confirmatory or broad exclusion tests (e.g., negative broad bacterial/viral PCR panels, negative cultures, negative oligoclonal bands, definitive autoantibodies, biopsy) that would prematurely eliminate the distractors; move those results to `resolution.clinical_discussion`.
4. IMAGING (BLINDED CAPTIONS):
   - Return `imaging_metadata` matching the {len(candidate['figures'])} figure(s) above in exact order, specifying `"modality"`, `"caption"` (a complete, grammatically intact BLINDED rewrite of the original figure caption describing ONLY imaging modality/panels and objective anatomical/signal findings WITHOUT naming the final diagnosis, correct option, or disease acronyms), and `"findings_summary"` (1 concise sentence describing purely anatomical/radiological features WITHOUT naming the final diagnosis).
5. 4-OPTION MCQ & REAL DIFFERENTIALS (SINGLE-FOCUS RULE):
   - Ask strictly ONE clinical concept (`"Diagnosis"`, `"Next Best Step"`, `"Acute Management"`, or `"Localization"`). NEVER combine two questions.
   - All 3 incorrect options MUST come from plausible differential diagnoses actually relevant to or considered in the article, and remain plausible given the withheld late workup.
   - Set `"correct_option"` to `"{target_correct_opt}"`.
   - `"peer_percentage"` across A, B, C, D must be integers summing to 100 (correct option 64-82).
   - `"rationale"`: correct option starts with `"Correct! "`; incorrect options start with `"Incorrect. "`.
6. HIGH-YIELD RESOLUTION:
   - `clinical_discussion`: 3 structured paragraphs separated by `\\n\\n` (Para 1: differential diagnosis & mimics; Para 2: diagnostic inflection point, withheld confirmatory/exclusion tests, and pathophysiology; Para 3: targeted therapy & outcome).
   - `teaching_points`: 3-4 generalizable, high-yield board-level pearls (not single-patient trivia).
   - `clinical_pitfalls`: 2-3 concrete diagnostic or management pitfalls highlighted by the authors.
7. Output ONLY valid JSON matching this exact structure:
{{
  "title": "string",
  "subspecialty": "{candidate['default_subspecialty']}",
  "subspecialties": ["{candidate['default_subspecialty']}"],
  "difficulty": "Fellow",
  "estimated_time_sec": 110,
  "presentation": {{
    "demographics": "string (e.g., '54-year-old female')",
    "chief_complaint": "string",
    "history_of_present_illness": "string",
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
        "caption": "string (complete blinded figure caption without diagnosis or acronym)",
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
    "clinical_discussion": "string (3 paragraphs separated by \\n\\n)",
    "teaching_points": ["string", "string", "string"],
    "clinical_pitfalls": ["string", "string"],
    "related_keywords": ["string", "string", "string", "string"]
  }}
}}"""

    # Stage 2 (Pass 1): Board Director Draft
    parsed = _call_gemini_json(prompt, temperature=0.2, stage_label="pass1_director")
    if not parsed:
        return None
    if parsed.get("is_single_patient_case_report") is False:
        reason = parsed.get("reject_reason") or "Not a single-patient clinical case report"
        print(f"   [skip/AI-reject] {candidate['pmcid']}: {reason}")
        return {"_rejected_non_case": True, "reason": reason}
    if not parsed.get("challenge") or not parsed.get("resolution"):
        return None

    # Chuẩn hóa imaging_metadata trước Stage 3 & 4 để Pass 2 & Pass 3 luôn rà soát được caption thật
    pres_draft = parsed.setdefault("presentation", {})
    raw_img_meta = pres_draft.get("imaging_metadata", [])
    if not isinstance(raw_img_meta, list):
        raw_img_meta = []
    normalized_img_meta = []
    for idx, fig in enumerate(candidate["figures"]):
        m = raw_img_meta[idx] if idx < len(raw_img_meta) and isinstance(raw_img_meta[idx], dict) else {}
        normalized_img_meta.append({
            "modality": m.get("modality") or "Brain MRI / Neuroimaging",
            "caption": m.get("caption") or fig["caption"],
            "findings_summary": m.get("findings_summary") or fig["caption"][:200],
        })
    pres_draft["imaging_metadata"] = normalized_img_meta

    # Stage 3 (Pass 2): Strict Examiner Critique (Anti-Leakage including Captions, Cutoff, Chronology)
    parsed = critique_and_refine_with_gemini(parsed, candidate)

    # Stage 4 (Pass 3): Harsh Senior Medical Editor (Grammar, Continuity, Logic, Blinded Captions)
    parsed = editorial_and_logic_review_with_gemini(parsed, candidate)

    case_id = f"nc-2026-{str(next_case_num).zfill(3)}"
    case_code = f"NC-2026-{str(next_case_num).zfill(3)}"
    pres = parsed.get("presentation", {})
    img_meta_list = pres.get("imaging_metadata", [])

    imaging_items = []
    for idx, fig in enumerate(candidate["figures"]):
        meta = img_meta_list[idx] if idx < len(img_meta_list) and isinstance(img_meta_list[idx], dict) else {}
        imaging_items.append({
            "modality": meta.get("modality") or "Brain MRI / Neuroimaging",
            "sequence_badge": f"{fig['figure_label']} • {candidate['journal_short']} ({candidate['pmcid']})",
            "figure_label": fig["figure_label"],
            "image_url": fig["image_url"],
            "pmcid": candidate["pmcid"],
            "doi_url": candidate["doi_url"],
            "caption": meta.get("caption") or fig["caption"],
            "findings_summary": meta.get("findings_summary") or fig["caption"][:200]
        })

    case_obj = {
        "id": case_id,
        "case_code": case_code,
        "title": parsed.get("title") or candidate["article_title"],
        "subspecialty": parsed.get("subspecialty") or candidate["default_subspecialty"],
        "subspecialties": parsed.get("subspecialties") or [candidate["default_subspecialty"]],
        "difficulty": parsed.get("difficulty") if parsed.get("difficulty") in ("Resident", "Fellow", "Attending") else "Fellow",
        "estimated_time_sec": int(parsed.get("estimated_time_sec") or 110),
        "is_daily_challenge": is_daily,
        "archive_only": not is_daily,
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

    # Stage 5: Kiểm tra chất lượng tự động bằng code (Deterministic Guardrails)
    valid, reason = validate_case_quality(case_obj)
    if not valid:
        print(f"   [!] Case quality check failed ({reason}).")
        if "Non-clinical figure/diagram" in reason:
            return {"_rejected_non_case": True, "reason": reason}
        return None

    return case_obj


def build_structured_clinical_case_deterministic(candidate: dict, next_case_num: int, today_str: str, is_daily: bool = True) -> dict:
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
        "is_daily_challenge": is_daily,
        "archive_only": not is_daily,
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


def _acquire_and_build_case(
    used_pmcids: set,
    day_index: int,
    max_num: int,
    today_str: str,
    is_daily: bool,
    target_subspecialty: str = None,
    max_attempts: int = 4,
):
    """Tìm ứng viên ca bệnh đơn lẻ hợp lệ; nếu AI từ chối vì không phải case report thì thử ứng viên khác, không rơi về fallback bịa/lỗi."""
    label = "Daily Challenge" if is_daily else "Archive Case"
    for attempt in range(max_attempts):
        cand = find_new_pmc_candidate(
            used_pmcids,
            day_index + attempt,
            target_subspecialty=target_subspecialty,
        )
        if not cand:
            return None, max_num

        used_pmcids.add(cand["pmcid"].strip())
        print(
            f"   -> Ứng viên {label} (lần {attempt + 1}/{max_attempts}): "
            f"{cand['pmcid']} ({cand['journal_title']}) - {len(cand['figures'])} hình ảnh."
        )

        case_obj = None
        if GEMINI_API_KEY:
            print(f"   -> Đang gọi Gemini AI biên soạn {label} (3-Pass Review)...")
            case_obj = generate_clinical_case_with_gemini(cand, max_num + 1, today_str, is_daily=is_daily)
            if isinstance(case_obj, dict) and case_obj.get("_rejected_non_case"):
                print(f"   [skip] {cand['pmcid']} bị loại ({case_obj.get('reason')}). Tìm ứng viên khác...")
                continue

        if not case_obj or not case_obj.get("challenge") or not case_obj.get("resolution"):
            print(f"   -> Dùng bộ biên soạn lâm sàng tất định cho {label}...")
            case_obj = build_structured_clinical_case_deterministic(cand, max_num + 1, today_str, is_daily=is_daily)

        if case_obj:
            valid, reason = validate_case_quality(case_obj)
            if not valid:
                print(f"   [skip] {cand['pmcid']} không đạt validate_case_quality ({reason}). Tìm ứng viên khác...")
                continue
            return case_obj, max_num + 1

    return None, max_num


def run():
    print("[NeuroCase 1/3] Đang kiểm tra kho dữ liệu ca lâm sàng tại public/data/cases.json...")
    existing_cases = load_existing_cases()

    # Sử dụng múi giờ Việt Nam (UTC+7) để đồng bộ ngày Daily Challenge với người dùng
    vn_tz = timezone(timedelta(hours=7))
    today_dt = datetime.now(vn_tz)
    today_str = today_dt.strftime("%Y-%m-%d")
    day_index = today_dt.timetuple().tm_yday
    weekday = today_dt.weekday()
    target_subspecialty = WEEKDAY_SPECIALTY_SCHEDULE.get(weekday, "Stroke")

    used_pmcids = set()
    max_num = 0

    # Đảm bảo tất cả các ca Daily lịch sử (nc-2026-...) luôn giữ is_daily_challenge = True (trừ khi có archive_only)
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

    has_daily_today = any(
        c.get("published_date") == today_str
        and c.get("is_daily_challenge") is True
        and not c.get("archive_only")
        and c.get("status", "approved") == "approved"
        for c in existing_cases
    )
    has_archive_today = any(
        c.get("published_date") == today_str
        and c.get("archive_only") is True
        and c.get("status", "approved") == "approved"
        for c in existing_cases
    )

    print(f"-> Ngày hiện tại (UTC+7): {today_str} ({today_dt.strftime('%A')}) | Hiện có {len(existing_cases)} ca ({len(used_pmcids)} PMCID đã dùng).")
    print(f"-> Luân phiên chuyên khoa mục tiêu: ⭐ {target_subspecialty}")
    print(f"-> Trạng thái cập nhật ngày {today_str}: Daily Challenge = {'✅ Đã có' if has_daily_today else '⏳ Chưa có'} | Case Archive = {'✅ Đã có' if has_archive_today else '⏳ Chưa có'}")

    if has_daily_today and has_archive_today:
        save_cases_to_disk(existing_cases)
        print(f"[NeuroCase 2/3] ✅ Đã đủ 2 ca (1 Daily + 1 Archive) cho ngày {today_str}. Không cần tìm thêm.")
        return

    newly_added = []

    # 1. Cập nhật 1 ca Daily Challenge nếu ngày hôm nay chưa có
    if not has_daily_today:
        print(f"[NeuroCase 2/3] 🎯 Đang tìm ca bệnh Open Access mới làm Daily Challenge ({target_subspecialty}) cho ngày {today_str}...")
        case_daily, max_num = _acquire_and_build_case(
            used_pmcids,
            day_index,
            max_num,
            today_str,
            is_daily=True,
            target_subspecialty=target_subspecialty,
        )
        if case_daily:
            newly_added.append(case_daily)
            print(f"   ✨ Đã xuất bản Daily Challenge [{case_daily['case_code']}]: {case_daily['title']}")

    # 2. Cập nhật 1 ca Case Archive nếu ngày hôm nay chưa có
    if not has_archive_today:
        print(f"[NeuroCase 2/3] 📚 Đang tìm ca bệnh Open Access mới lưu trữ vào Case Archive cho ngày {today_str}...")
        case_archive, max_num = _acquire_and_build_case(
            used_pmcids,
            day_index + 17,
            max_num,
            today_str,
            is_daily=False,
        )
        if case_archive:
            newly_added.append(case_archive)
            print(f"   📚 Đã xuất bản Archive Case [{case_archive['case_code']}]: {case_archive['title']}")

    if newly_added:
        updated_cases = newly_added + existing_cases
        save_cases_to_disk(updated_cases)
        print(f"[NeuroCase 3/3] ✨ Hoàn tất! Đã lưu {len(newly_added)} ca mới vào public/data/cases.json (Tổng: {len(updated_cases)} ca).")
    else:
        save_cases_to_disk(existing_cases)
        print("[NeuroCase 3/3] Chưa tìm thấy ứng viên bài báo mới. Giữ nguyên kho ca bệnh hiện tại.")


if __name__ == "__main__":
    run()
