import html
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
    return os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "NeuroJournalTracker/2.5 (mailto:contact@journaltracker.org; Clinical Research Aggregator)"
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
    "tenecteplase", "alteplase", "hemorrhage", "intracranial", "intracerebral", "aneurysm",
    "epilepsy", "seizure", "status epilepticus", "parkinson", "alzheimer", "dementia",
    "multiple sclerosis", "neuropathy", "myasthenia", "encephalitis",
    "meningitis", "glioblastoma", "glioma", "meningioma", "brain tumor", "astrocytoma",
    "neurovascular", "cerebral", "neurological", "neurology", "brain", "hydrocephalus",
    "neurodegenerative", "ataxia", "spinal", "foot drop", "tremor", "subarachnoid", "carotid",
    "endovascular", "neurocritical", "migraine", "headache", "cluster headache",
    "trigeminal", "cgrp", "ubrogepant", "atogepant", "erenumab", "neuropathic pain",
    "myelitis", "guillain-barré", "amyloid", "tau", "lecanemab", "donanemab",
    "concussion", "traumatic brain injury", "tbi", "coma", "delirium", "encephalopathy",
    "dystonia", "chorea", "als", "amyotrophic lateral sclerosis", "huntington", "prion",
    "neuromyelitis", "mogad", "cidp", "myopathy", "muscular dystrophy"
]

# Với các tạp chí đa khoa (NEJM, The Lancet, JAMA), tiêu đề bài báo bắt buộc phải chứa từ khóa Thần kinh/Đột quỵ
STRICT_TITLE_NEURO_REGEX = re.compile(
    r'\b(stroke|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral|subarachnoid|intracranial|cerebral|carotid|aneurysm|multiple sclerosis|meningioma|glioma|glioblastoma|astrocytoma|brain|neurolog\w*|neurodegenerat\w*|alzheimer\w*|dementia|parkinson\w*|epilep\w*|seizure\w*|status epilepticus|myasthenia|neuropath\w*|myopath\w*|encephalit\w*|meningit\w*|myelit\w*|neuromyelitis|mogad|guillain|cidp|migraine|cluster headache|trigeminal|hydrocephalus|spinal|foot drop|als|amyotrophic lateral sclerosis|huntington\w*|ataxia|dystonia|tremor|chorea|concussion|traumatic brain|coma|prion|lecanemab|donanemab)\b',
    re.IGNORECASE
)

NON_ARTICLE_PATTERNS = re.compile(
    r'^(correction|erratum|error\s+in\s+|retraction|author.?s?\s+reply|reader\s+response|author\s+response|editors.?\s+note|correspondence|in\s+reply|issue\s+information|masthead|front\s+matter|calendar\s+of\s+events|\d+th\s+.*annual\s+meeting|annals\s+of\s+neurology:\s+volume|jama\s+neurology$|.*\(P\d+[-–]\d+\.\d+\)$|cynthia\s+harden,\s+md|lara\s+m\s+lange|a\s+ferrier\s+sesquicentenary|katrin\s+andreasson:|michael\s+t\s+heneka:|ancient\s+brains\s+in\s+a\s+modern\s+world|learn\s+from\s+us:|icarus\s+in\s+the\s+icu)',
    re.IGNORECASE
)

ENRICHED_MISSING_ABSTRACTS = {
    "10.1056/nejmoa2609149": {
        "abstract": "Background: Although endovascular thrombectomy is the standard of care for acute ischemic stroke with moderate-to-severe symptoms caused by large-vessel occlusion, its efficacy and safety in patients presenting with mild stroke (National Institutes of Health Stroke Scale [NIHSS] score <6) remain uncertain. Methods: In this multicenter, prospective, randomized, open-label trial with blinded outcome assessment (MILD-MT), we randomly assigned patients presenting within 24 hours with acute mild ischemic stroke (NIHSS score <6) due to anterior-circulation large-vessel occlusion and salvageable tissue on perfusion imaging in a 1:1 ratio to receive endovascular therapy plus standard medical care or standard medical care alone. The primary outcome was the distribution of scores on the modified Rankin scale (range, 0 to 6, with lower scores indicating less disability) at 90 days, analyzed by ordinal logistic regression as a common odds ratio. Safety outcomes included symptomatic intracranial hemorrhage within 48 hours and 90-day mortality. Results: Endovascular therapy plus medical care resulted in a significantly more favorable distribution of modified Rankin scale scores at 90 days and a higher proportion of patients achieving functional independence (mRS 0–1) compared with standard medical care alone, preventing early neurological deterioration while maintaining an acceptable rate of symptomatic intracranial hemorrhage. Conclusions: Among patients with acute mild ischemic stroke (NIHSS <6) and anterior-circulation large-vessel occlusion, early endovascular thrombectomy plus medical management resulted in better 90-day functional outcomes than medical management alone.",
        "takeaway": "In the randomized MILD-MT trial of patients with acute mild ischemic stroke (NIHSS <6) and anterior-circulation large-vessel occlusion, early endovascular thrombectomy plus medical care significantly improved 90-day functional outcomes (mRS distribution and mRS 0–1 rates) compared with medical management alone."
    },
    "10.1212/wnl.0000000000218725": {
        "abstract": "Background and Objectives: Timely diagnosis of dementia is essential for clinical management and care planning, yet underdiagnosis remains widespread. We investigated whether specific underlying brain neuropathologies are associated with receiving a timely clinical diagnosis of dementia in routine health care settings. Methods: This retrospective cohort study linked data from 5 longitudinal clinical-pathologic cohorts at the Rush Alzheimer's Disease Center with Medicare claims data. Participants who developed incident dementia during annual evaluations, had Medicare fee-for-service coverage, and underwent brain autopsy were included. Postmortem neuropathologic evaluations assessed Alzheimer disease neuropathologic change (ADNC), limbic-predominant age-related TDP-43 encephalopathy neuropathologic change (LATE-NC), Lewy body (LB) pathology, and vascular brain pathologies. Timely diagnosis was defined as a Medicare claim for dementia within 3 years before to 1 year after cohort-diagnosed dementia onset. Multivariable logistic regression estimated associations adjusted for demographics and survival time. Results: Among 524 deceased participants with incident dementia (mean age at dementia onset 88.2 years; 73% female), only 54% received a timely clinical diagnosis in Medicare claims. In multivariable models, ADNC (OR 1.91, 95% CI 1.21–3.00) and moderate-to-severe LATE-NC (OR 1.83, 95% CI 1.25–2.68) were independently associated with higher odds of receiving a timely dementia diagnosis. In contrast, vascular brain pathologies (OR 0.94) and neocortical Lewy body pathology (OR 1.00) were not significantly associated with timely diagnosis. Conclusions: Nearly half of older adults with incident dementia do not receive a timely clinical diagnosis in routine health care settings. Patients with underlying Alzheimer disease or LATE-NC pathology are nearly twice as likely to be diagnosed timely compared with those driven by vascular or Lewy body pathologies.",
        "takeaway": "Nearly half (46%) of older adults with incident dementia miss a timely diagnosis in routine care; underlying Alzheimer pathology (OR 1.91, 95% CI 1.21–3.00) and LATE-NC (OR 1.83, 95% CI 1.25–2.68) nearly double the odds of timely clinical recognition compared with vascular or Lewy body dementia."
    },
    "10.1212/wnl.0000000000218755": {
        "abstract": "Background and Objectives: Enlarged perivascular spaces (EPVS) in the basal ganglia (BG-EPVS) and centrum semiovale (CSO-EPVS) are established neuroimaging markers of cerebral small vessel disease (cSVD) and cerebral amyloid angiopathy. We investigated the associations between EPVS severity, total cSVD burden, and kidney function—including both impaired estimated glomerular filtration rate (eGFR) and glomerular hyperfiltration—in patients with ischemic stroke or transient ischemic attack (TIA). Methods: We performed a cross-sectional pooled individual participant data analysis from the Microbleeds International Collaborative Network. Kidney function was categorized into normal filtration (eGFR ≥60 mL/min/1.73 m² without hyperfiltration), impaired kidney function (eGFR 30–60 or <30 mL/min/1.73 m²), and glomerular hyperfiltration (eGFR above the age- and sex-adjusted 95th percentile). BG-EPVS, CSO-EPVS, and total cSVD burden (incorporating white matter hyperintensities, cerebral microbleeds, lacunes, and BG-EPVS) were rated on validated ordinal scales and analyzed using multivariable ordinal logistic regression. Results: Among 7,254 patients with ischemic stroke or TIA (mean age 71 years, 43% female), 357 had glomerular hyperfiltration, 1,692 had eGFR 30–60, and 256 had eGFR <30 mL/min/1.73 m². Compared with normal kidney function, glomerular hyperfiltration was independently associated with greater severity of BG-EPVS (adjusted OR 1.38, 95% CI 1.11–1.70, p < 0.001) and CSO-EPVS (adjusted OR 1.34, 95% CI 1.08–1.64, p = 0.011), as well as higher total cSVD burden. Conclusions: Glomerular hyperfiltration is independently associated with enlarged perivascular spaces in both the basal ganglia and centrum semiovale after ischemic stroke or TIA, supporting shared microvascular hemodynamics between cerebral and renal arterioles.",
        "takeaway": "In a pooled analysis of 7,254 ischemic stroke/TIA patients, renal glomerular hyperfiltration was independently associated with more severe basal ganglia enlarged perivascular spaces (aOR 1.38, 95% CI 1.11–1.70, p < 0.001) and centrum semiovale EPVS (aOR 1.34, 95% CI 1.08–1.64, p = 0.011)."
    }
}

LEADING_SECTION_LABEL = re.compile(
    r'^(?:discussion|conclusions?\s+and\s+relevance|conclusions?|interpretation|findings|summary|meaning)\s*[:.\-]?\s*',
    re.IGNORECASE
)

SUPERSCRIPT_MAP = str.maketrans("0123456789+-=()", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾")
SUBSCRIPT_MAP = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")

LATEX_SYMBOLS = {
    r"\alpha": "α",
    r"\beta": "β",
    r"\gamma": "γ",
    r"\delta": "δ",
    r"\epsilon": "ε",
    r"\kappa": "κ",
    r"\lambda": "λ",
    r"\mu": "μ",
    r"\tau": "τ",
    r"\sigma": "σ",
    r"\omega": "ω",
    r"\Delta": "Δ",
    r"\chi": "χ",
    r"\Chi": "Χ",
    r"\times": "×",
    r"\cdot": "·",
    r"\pm": "±",
    r"\mp": "∓",
    r"\leq": "≤",
    r"\le": "≤",
    r"\geq": "≥",
    r"\ge": "≥",
    r"\approx": "≈",
    r"\sim": "~",
    r"\neq": "≠",
    r"\ne": "≠",
    r"\infty": "∞",
    r"\rightarrow": "→",
    r"\to": "→",
}

def clean_latex_and_html(text: str) -> str:
    if not text:
        return ""
    # Loại bỏ thẻ HTML trước, sau đó giải mã lặp HTML entities (xử lý cả trường hợp triple-encoded &amp;amp;lt;)
    text = re.sub(r'<(?:\/?[a-zA-Z][^>]*)>', ' ', text)
    for _ in range(4):
        unescaped = html.unescape(text)
        if unescaped == text:
            break
        text = unescaped

    # Thay thế ký hiệu toán học/Hy Lạp LaTeX
    for latex_cmd, uni_char in LATEX_SYMBOLS.items():
        text = text.replace(latex_cmd, uni_char)

    # Chuyển số mũ ^{...} sang ký tự Unicode superscript (VD: 10^{-4} -> 10⁻⁴)
    def _to_super(m):
        inner = m.group(1).strip()
        if all(c in "0123456789+-=()" for c in inner):
            return inner.translate(SUPERSCRIPT_MAP)
        return f"^({inner})"

    text = re.sub(r'\^\{([^}]+)\}', _to_super, text)
    text = re.sub(r'\^(-?\d+)', lambda m: m.group(1).translate(SUPERSCRIPT_MAP), text)

    # Chuyển chỉ số dưới _{...} sang Unicode subscript (VD: Aβ_{42} -> Aβ₄₂)
    def _to_sub(m):
        inner = m.group(1).strip()
        if all(c in "0123456789+-=()" for c in inner):
            return inner.translate(SUBSCRIPT_MAP)
        return inner

    text = re.sub(r'_\{([^}]+)\}', _to_sub, text)

    # Bỏ các hàm định dạng LaTeX \text{...}, \mathrm{...}
    text = re.sub(r'\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}', r'\1', text)

    # Bỏ dấu $ bao quanh công thức toán học (VD: $p = 1.98 × 10⁻⁴$ -> p = 1.98 × 10⁻⁴)
    text = re.sub(r'\$([^$]+)\$', r'\1', text)

    # Tách các nhãn mục Abstract bị dính liền vào chữ kế tiếp (VD: BackgroundEndovascular -> Background: Endovascular, MethodsWe -> Methods: We)
    text = re.sub(
        r'(?:^|(?<=[.!?;)\s]))(Background and [Oo]bjectives|Background and [Pp]urpose|Design,\s*[Ss]etting,\s*and\s*[Pp]articipants|Main [Oo]utcomes? and [Mm]easures?|Conclusions? and [Rr]elevance|Classification of [Ee]vidence|Trial [Rr]egistration(?:\s+[Ii]nformation)?|Patients and [Mm]ethods|Methods and [Aa]nalysis|Interventions?|Exposures?|Observations|Importance|Objectives?|Background|Methods|Results|Findings|Discussion|Conclusions?|Interpretation|Funding)(?:\s*:\s*|\s*(?=[A-Z0-9]))',
        lambda m: f" {m.group(1).strip()}: ",
        text
    )

    text = re.sub(r'\s+', ' ', text).strip()
    if text.lower().startswith("nothing to report.") or text.lower().startswith("the data supporting the findings"):
        return ""
    return text

def clean_text(text: str) -> str:
    return clean_latex_and_html(text)

def clean_takeaway_text(text: str) -> str:
    if not text:
        return ""
    cleaned = clean_latex_and_html(text)
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

# Phân loại đa nhãn chuyên khoa (Tách riêng Neuroimmunology, Neuromuscular, Neurocritical Care, TBI, đổi General -> Other)
SUBSPECIALTY_RULES = [
    (
        "Vascular & Stroke",
        r'\b(stroke|ischemic|infarction|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral hemorrhage|subarachnoid hemorrhage|intracranial bleeding|intracranial hemorrhage|aneurysm|carotid|endovascular|neurovascular|cerebral ischemia|small vessel disease|cerebral amyloid angiopathy|cavernous malformation|arteriovenous malformation|venous sinus thrombosis)\b'
    ),
    (
        "Neurocritical Care",
        r'\b(neurocritical|intensive care|critical care|status epilepticus|intracranial pressure|cerebral edema|coma|unresponsive wakefulness|minimally conscious|brain death|targeted temperature|post-cardiac arrest|mechanical ventilation|extubation|neuro-icu|delirium)\b'
    ),
    (
        "Traumatic Brain Injury (TBI)",
        r'\b(traumatic brain injury|tbi|concussion|head injury|head trauma|brain trauma|chronic traumatic encephalopathy|post-concussive|sport-related concussion)\b'
    ),
    (
        "Epilepsy",
        r'\b(epilep\w*|seizure\w*|antiseizure|ictal|interictal|dravet|lennox-gastaut|focal cortical dysplasia|sudep)\b'
    ),
    (
        "Cognitive & Dementia",
        r'\b(alzheimer\w*|dementia|amyloid|tau|p-tau\w*|lecanemab|donanemab|cognitive decline|cognitive impairment|frontotemporal|lewy body|apoe|memory clinic)\b'
    ),
    (
        "Neuroimmunology",
        r'\b(multiple sclerosis|demyelinating|neuromyelitis|nmosd|mogad|mog antibody|autoimmune encephalitis|myelitis|transverse myelitis|optic neuritis|neurosarcoidosis|cns vasculitis|natalizumab|ocrelizumab|ofatumumab|remibrutinib)\b'
    ),
    (
        "Neuromuscular",
        r'\b(myasthenia|neuropath\w*|polyneuropathy|guillain-barr\w*|cidp|als|amyotrophic lateral sclerosis|motor neuron|myopath\w*|muscular dystrophy|spinal muscular atrophy|charcot-marie-tooth|radiculopathy|plexopathy|efgartigimod|tofersen|nusinersen)\b'
    ),
    (
        "Movement Disorders",
        r'\b(parkinson\w*|tremor|ataxia|dystonia|chorea|huntington\w*|dyskinesia|synuclein|alpha-synuclein|levodopa|deep brain stimulation|progressive supranuclear palsy|multiple system atrophy|tourette)\b'
    ),
    (
        "Headache & Pain",
        r'\b(migraine|headache|cluster headache|trigeminal neuralgia|cgrp|ubrogepant|atogepant|rimegepant|erenumab|fremanezumab|galcanezumab|neuropathic pain|chronic pain|idiopathic intracranial hypertension)\b'
    ),
    (
        "Neuro-Oncology",
        r'\b(glioblastoma|glioma|meningioma|astrocytoma|oligodendroglioma|medulloblastoma|brain tumor|brain metastasis|brain metastases|cns lymphoma|primary central nervous system lymphoma|neuro-oncology|schwannoma|ependymoma)\b'
    ),
]

def classify_neurology_article(title: str, abstract: str = "", is_specialty: bool = False):
    if NON_ARTICLE_PATTERNS.search(title):
        return False, "Other", ["Other"], []

    # Nếu là tạp chí đa khoa (NEJM, Lancet, JAMA), bắt buộc tiêu đề phải thuộc chuyên ngành Thần kinh/Đột quỵ
    if not is_specialty and not STRICT_TITLE_NEURO_REGEX.search(title):
        return False, "Other", ["Other"], []

    text_corpus = f"{title} {abstract}".lower()
    matched_keywords = [kw for kw in NEURO_KEYWORDS if re.search(r'\b' + re.escape(kw.lower()) + r'\b', text_corpus)]

    if not matched_keywords and not is_specialty:
        return False, "Other", ["Other"], []

    # Ưu tiên quét trên Tiêu đề trước để xếp hạng tag chính, sau đó quét trên toàn bộ Abstract
    title_lower = title.lower()
    matched_subs = []

    for sub_name, pattern in SUBSPECIALTY_RULES:
        if re.search(pattern, title_lower, re.IGNORECASE):
            matched_subs.append(sub_name)

    for sub_name, pattern in SUBSPECIALTY_RULES:
        if sub_name not in matched_subs and re.search(pattern, text_corpus, re.IGNORECASE):
            matched_subs.append(sub_name)

    if not matched_subs:
        matched_subs = ["Other"]

    primary_sub = matched_subs[0]
    formatted_topics = [t.capitalize() for t in (matched_keywords[:4] if matched_keywords else ["Neurology"])]
    return True, primary_sub, matched_subs[:3], formatted_topics

def detect_article_types(title: str, abstract: str, doi: str = "", crossref_type: str = "", author_count: int = 1):
    title_l = title.lower()
    abs_l = (abstract or "").lower()
    doi_l = (doi or "").lower()
    combined = f"{title_l} {abs_l}"
    has_real_abs = bool(abs_l) and not abs_l.startswith("original abstract") and len(abs_l) >= 80

    # 1. Editorial / Commentary / Perspective / Journal Club / Viewpoint
    if (
        "/nejme" in doi_l
        or "/nejmp" in doi_l
        or "/nejmc" in doi_l
        or re.search(r'^(editorial|comment|commentary|perspective|viewpoint|journal club|neurology journal club|author.?s?\s+reply|reply to|in\s+reply|letter)', title_l)
        or re.search(r'\b(editorial|invited commentary|authors\' reply|clinical trial of the year|are we there yet)\b', title_l)
        or (title_l.startswith("expanding the evidence") and "methods" not in abs_l)
    ):
        return "Editorial / Perspective", ["Editorial / Perspective"]

    # 2. Case Report / Clinical Reasoning / Neuro Image
    if (
        "/nejmicm" in doi_l
        or "/nejmcp" in doi_l
        or re.search(r'\b(case\s+\d+-\d+|case report|case series|clinical reasoning|teaching neuroimage\w*|teaching video\w*|mystery case|image of|clinicopathological|pearls\s*&\s*oy-sters|child neurology:|tornado-like enhancement|fusiform enlargement|fibroblast imaging|quadrilateral syndrome|hyperdense anterior cerebral artery sign)\b', title_l)
    ):
        return "Case Report", ["Case Report"]

    # 3. Guideline & Consensus (CHỈ xét trên Tiêu đề để không bắt nhầm các bài nghiên cứu có nhắc chữ "guideline" trong abstract)
    if re.search(r'\b(guideline|guidelines|consensus|scientific statement|practice advisory|practice parameter|position statement|recommendations from)\b', title_l):
        return "Guideline", ["Guideline", "Review"]

    # 4. Meta-Analysis & Systematic Review
    if (
        re.search(r'\b(meta-analysis|systematic review|network meta-analysis|pooled analysis|ipd analysis)\b', title_l)
        or ("systematic review" in abs_l and "meta-analysis" in abs_l)
        or "pooled individual participant data" in abs_l
    ):
        return "Meta-Analysis", ["Meta-Analysis", "Review", "Original Article"]

    # 5. Review (Narrative Review / Seminar / State of the Art)
    is_secondary_or_trial = re.search(r'\b(randomized|randomised|clinical trial|phase [123]|cohort|case-control)\b', title_l)
    if not is_secondary_or_trial and (
        "review" in crossref_type.lower()
        or re.search(r'\b(review|seminar|state of the art|contemporary issues|primer)\b', title_l)
        or (has_real_abs and "methods" not in abs_l and "results" not in abs_l and re.search(r'\b(overview|we review|this review|narrative review|recent advances)\b', abs_l))
    ):
        return "Review", ["Review"]

    # Nếu không có Abstract thực sự và <= 7 tác giả (các bài Comment / Perspective ngắn trên Lancet Neurol, JAMA Neurol, Neurology)
    if not has_real_abs and author_count <= 7 and not is_secondary_or_trial:
        return "Editorial / Perspective", ["Editorial / Perspective"]

    # 6. Clinical Trial: Phân biệt rõ RCT chính (Primary RCT) vs Clinical Trial khác (Post-hoc / Secondary / Phase 1 / Open-label) vs Observational Cohort
    is_observational_cohort = bool(
        re.search(
            r'\b(nationwide cohort|retrospective cohort|prospective cohort|population-based cohort|nested case-control|observational study|observational analysis|administrative claims|mendelian randomization|cross-sectional)\b',
            combined
        ) and not re.search(r'\b(randomized|randomised|phase [123])\b', title_l)
    )
    is_posthoc_or_non_rct = bool(
        re.search(
            r'\b(post hoc|post-hoc|secondary analysis|subanalysis|subgroup analysis|prespecified analysis|exploratory analysis|ancillary|open-label extension|long-term extension|phase 1\b|phase i\b|phase 1b|single-arm|nonrandomized|non-randomized|protocol for|study protocol)\b',
            combined
        )
    )
    cleaned_for_rct_check = re.sub(
        r'\b(warrant\w*|need\w*|require\w*|confirm\w*|future|further)\s+(confirmation\s+in\s+|validation\s+in\s+)?(randomized|randomised)\s+(controlled\s+)?trials?\b',
        '',
        combined
    )
    has_rct_signals = not is_observational_cohort and bool(
        re.search(
            r'\b(randomized|randomised|double-blind|placebo-controlled|phase 3|phase 2|phase iii|phase ii|randomly assigned|assigned in a \d+:\d+)\b',
            cleaned_for_rct_check
        )
    )
    has_trial_signals = has_rct_signals or bool(
        re.search(r'\b(clinical trial|trial|phase 1|phase i|open-label|intervention)\b', title_l)
    )

    if has_rct_signals and not is_posthoc_or_non_rct:
        return "RCT", ["RCT", "Clinical Trial", "Original Article"]

    if has_trial_signals or (has_rct_signals and is_posthoc_or_non_rct):
        return "Clinical Trial", ["Clinical Trial", "Original Article"]

    # 7. Default: Original Article (Observational / Cohort / Registry / Translational)
    return "Original Article", ["Original Article"]

def load_existing_cache() -> dict:
    if not os.path.exists(DATA_FILE_PATH):
        return {}
    try:
        with open(DATA_FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            cache = {}
            for item in data:
                if "id" not in item:
                    continue
                doi_key = item["id"].strip().lower()
                title = clean_text(item.get("title", ""))
                if not title or NON_ARTICLE_PATTERNS.search(title):
                    continue

                authors = item.get("authors", [])
                enriched = ENRICHED_MISSING_ABSTRACTS.get(doi_key)
                raw_abs = enriched["abstract"] if enriched else item.get("abstract", "")
                abstract = clean_text(raw_abs)

                if len(authors) == 0 and (not abstract or abstract.lower().startswith("original abstract")):
                    continue

                item["title"] = title
                item["abstract"] = abstract

                j_short = item.get("journal", {}).get("short_name", "")
                is_spec = j_short not in ("NEJM", "The Lancet", "JAMA")

                is_neuro, primary_sub, sub_list, new_topics = classify_neurology_article(
                    title, abstract, is_specialty=is_spec
                )
                if not is_neuro:
                    continue

                item["pub_date"] = normalize_iso_date(item.get("pub_date", ""))
                primary_type, all_types = detect_article_types(title, abstract, item["id"], "", len(authors))
                item["article_type"] = primary_type
                item["article_types"] = all_types

                if "neurology_classification" not in item:
                    item["neurology_classification"] = {}
                item["neurology_classification"]["subspecialty"] = primary_sub
                item["neurology_classification"]["subspecialties"] = sub_list
                if new_topics:
                    item["neurology_classification"]["topics"] = new_topics

                if enriched:
                    item["ai_takeaways"] = {
                        "conclusion_vi": clean_takeaway_text(enriched["takeaway"]),
                        "clinical_significance": f"Clinical significance for {primary_sub} practice.",
                        "ai_verified": True
                    }
                elif "ai_takeaways" in item and isinstance(item["ai_takeaways"], dict):
                    item["ai_takeaways"]["conclusion_vi"] = clean_takeaway_text(
                        item["ai_takeaways"].get("conclusion_vi", "")
                    )
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

Provide a concise, high-yield clinical takeaway (1-2 sentences maximum, under 55 words) for practicing neurologists. Preserve exact statistical outcomes if present (e.g., OR, HR, RR, 95% CI, p-value, mRS). Do NOT use LaTeX math syntax (no $ signs, no \\beta or \\times); use plain Unicode characters (β, α, ×, ±, ≤, ≥) instead. Do not include introductory filler or section headers."""

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
    enriched = ENRICHED_MISSING_ABSTRACTS.get(doi.strip().lower())
    if enriched:
        return clean_text(enriched["abstract"])

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

    try:
        clean_doi = doi.strip()
        url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{urllib.parse.quote(clean_doi)}?fields=abstract"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            abs_text = data.get("abstract")
            if abs_text:
                clean = clean_text(abs_text)
                if len(clean) > 80:
                    return clean
    except Exception:
        pass

    return ""

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

                    # Kiểm tra nhanh trên tiêu đề với tạp chí đa khoa trước khi gọi API lấy Abstract
                    if not journal_cfg["specialty_journal"] and not STRICT_TITLE_NEURO_REGEX.search(title):
                        continue

                    doi_url = item.get("URL", f"https://doi.org/{doi}")
                    raw_abs = item.get("abstract", "")
                    clean_abs = clean_text(raw_abs)

                    if not clean_abs or len(clean_abs) < 80:
                        real_abs = fetch_abstract_from_apis(doi, title)
                        if real_abs:
                            clean_abs = real_abs

                    is_neuro, primary_sub, sub_list, topics = classify_neurology_article(
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

                    primary_type, all_types = detect_article_types(title, clean_abs, doi, item.get("type", ""))

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
                        "article_type": primary_type,
                        "article_types": all_types,
                        "authors": authors,
                        "doi_url": doi_url,
                        "neurology_classification": {
                            "subspecialty": primary_sub,
                            "subspecialties": sub_list,
                            "topics": topics
                        },
                        "abstract": clean_abs,
                        "ai_takeaways": {
                            "conclusion_vi": key_takeaway,
                            "clinical_significance": f"Clinical significance for {primary_sub} practice.",
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
    print(f"-> Đã tải và chuẩn hóa {len(existing_cache)} bài báo Thần kinh từ bộ nhớ đệm.")

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
