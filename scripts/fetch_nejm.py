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
from datetime import datetime, timezone, timedelta

# Ép buộc dùng IPv4 (AF_INET) để tránh lỗi treo "The read operation timed out" trên Windows
if os.name == "nt":
    try:
        _orig_getaddrinfo = socket.getaddrinfo
        def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        socket.getaddrinfo = _ipv4_getaddrinfo
    except Exception:
        pass

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
ctx.check_hostname = True
ctx.verify_mode = ssl.CERT_REQUIRED

HEADERS = {
    "User-Agent": "NeuroJournalTracker/3.0 (mailto:admin@neuropulse.org; Clinical Research & Practice Guidelines Aggregator)"
}

GEMINI_API_KEY = load_env_key()
ACTIVE_GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
]
GEMINI_MODEL = ACTIVE_GEMINI_MODELS[0]

DATA_FILE_PATH = "public/data/articles.json"
MAX_ARTICLES_STORED = 1000
MAX_GEMINI_CALLS_PER_RUN = 30
CHUNK_SIZE = 5

JOURNAL_CONFIGS = [
    {
        "name": "The New England Journal of Medicine",
        "short_name": "NEJM",
        "issn": "0028-4793",
        "online_issn": "1533-4406",
        "badge_bg": "#FEE2E2",
        "badge_text": "#991B1B",
        "specialty_journal": False,
        "scan_rows": 50
    },
    {
        "name": "The Lancet",
        "short_name": "The Lancet",
        "issn": "0140-6736",
        "online_issn": "1474-547X",
        "badge_bg": "#DBEAFE",
        "badge_text": "#1E40AF",
        "specialty_journal": False,
        "scan_rows": 50
    },
    {
        "name": "The Lancet Neurology",
        "short_name": "Lancet Neurol",
        "issn": "1474-4422",
        "online_issn": "1474-4465",
        "badge_bg": "#CFFAFE",
        "badge_text": "#0E7490",
        "specialty_journal": True,
        "scan_rows": 40
    },
    {
        "name": "JAMA",
        "short_name": "JAMA",
        "issn": "0098-7484",
        "online_issn": "1538-3598",
        "badge_bg": "#FEE2E2",
        "badge_text": "#DC2626",
        "specialty_journal": False,
        "scan_rows": 50
    },
    {
        "name": "JAMA Neurology",
        "short_name": "JAMA Neurol",
        "issn": "2168-6149",
        "online_issn": "2168-6157",
        "badge_bg": "#FFE4E6",
        "badge_text": "#E11D48",
        "specialty_journal": True,
        "scan_rows": 40
    },
    {
        "name": "Stroke (AHA)",
        "short_name": "Stroke",
        "issn": "0039-2499",
        "online_issn": "1524-4628",
        "badge_bg": "#FFE4E6",
        "badge_text": "#991B1B",
        "specialty_journal": True,
        "scan_rows": 50
    },
    {
        "name": "Neurology (AAN)",
        "short_name": "Neurology",
        "issn": "0028-3878",
        "online_issn": "1526-632X",
        "badge_bg": "#DCFCE7",
        "badge_text": "#166534",
        "specialty_journal": True,
        "scan_rows": 50
    },
    {
        "name": "Annals of Neurology",
        "short_name": "Ann Neurol",
        "issn": "0364-5134",
        "online_issn": "1531-8249",
        "badge_bg": "#EDE9FE",
        "badge_text": "#5B21B6",
        "specialty_journal": True,
        "scan_rows": 40
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

STRICT_TITLE_NEURO_REGEX = re.compile(
    r'\b(stroke|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral|subarachnoid|intracranial|cerebral|carotid|aneurysm|multiple sclerosis|meningioma|glioma|glioblastoma|astrocytoma|brain|neurolog\w*|neurodegenerat\w*|alzheimer\w*|dementia|parkinson\w*|epilep\w*|seizure\w*|status epilepticus|myasthenia|neuropath\w*|myopath\w*|encephalit\w*|meningit\w*|myelit\w*|neuromyelitis|mogad|guillain|cidp|migraine|cluster headache|trigeminal|hydrocephalus|spinal|foot drop|als|amyotrophic lateral sclerosis|huntington\w*|ataxia|dystonia|tremor|chorea|concussion|traumatic brain|coma|prion|lecanemab|donanemab)\b',
    re.IGNORECASE
)

NON_ARTICLE_PATTERNS = re.compile(
    r'^(correction|erratum|error\s+in\s+|retraction|author.?s?\s+reply|reader\s+response|author\s+response|editors.?\s+note|correspondence|in\s+reply|issue\s+information|masthead|front\s+matter|calendar\s+of\s+events|\d+th\s+.*annual\s+meeting|annals\s+of\s+neurology:\s+volume|jama\s+neurology$|.*\(P\d+[-–]\d+\.\d+\)$|cynthia\s+harden,\s+md|lara\s+m\s+lange|a\s+ferrier\s+sesquicentenary|katrin\s+andreasson:|michael\s+t\s+heneka:|ancient\s+brains\s+in\s+a\s+modern\s+world|learn\s+from\s+us:|icarus\s+in\s+the\s+icu)',
    re.IGNORECASE
)

# 9 bài Stroke bị nhảy từ ngày 26/10 sang 01/11 do nhãn số báo in tháng 11 - cần khôi phục lại đúng ngày 26/10
REPAIR_OCT26_DOIS = {
    "10.1161/strokeaha.126.055500": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.056613": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.056369": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.058046": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.057085": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.056650": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.056099": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.058301": "2026-10-26T00:00:00Z",
    "10.1161/strokeaha.126.057797": "2026-10-26T00:00:00Z",
}

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
    text = re.sub(r'<(?:\/?[a-zA-Z][^>]*)>', ' ', text)
    for _ in range(4):
        unescaped = html.unescape(text)
        if unescaped == text:
            break
        text = unescaped

    for latex_cmd, uni_char in LATEX_SYMBOLS.items():
        text = text.replace(latex_cmd, uni_char)

    def _to_super(m):
        inner = m.group(1).strip()
        if all(c in "0123456789+-=()" for c in inner):
            return inner.translate(SUPERSCRIPT_MAP)
        return f"^({inner})"

    text = re.sub(r'\^\{([^}]+)\}', _to_super, text)
    text = re.sub(r'\^(-?\d+)', lambda m: m.group(1).translate(SUPERSCRIPT_MAP), text)

    def _to_sub(m):
        inner = m.group(1).strip()
        if all(c in "0123456789+-=()" for c in inner):
            return inner.translate(SUBSCRIPT_MAP)
        return inner

    text = re.sub(r'_\{([^}]+)\}', _to_sub, text)
    text = re.sub(r'\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}', r'\1', text)
    text = re.sub(r'\$([^$]+)\$', r'\1', text)

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

def is_valid_clinical_takeaway(text: str) -> bool:
    if not text or len(text.strip()) < 35:
        return False
    # Check for prompt artifacts / reasoning traces / draft marks
    bad_patterns = [
        r'\bdraft\s*\d',
        r'check\s*word\s*count',
        r'word\s*count',
        r'<\s*\d+\)',
        r'exact\s*stats',
        r':\*\s*\"',
        r'^\s*[\-\*]\s*',
        r'^\s*:\s*',
        r'^\s*-limited',
    ]
    for pat in bad_patterns:
        if re.search(pat, text, re.IGNORECASE):
            return False

    # Check for truncation signals (dangling punctuation)
    if re.search(r'[,;\-–—\(\[\<]\s*$', text):
        return False

    trailing_words = r'\b(and|or|with|to|of|in|for|from|by|at|as|than|compared|is|are|was|were|the|a|an|that|which|this|these|between|into|both)\b\s*$'
    if re.search(trailing_words, text, re.IGNORECASE):
        return False

    trimmed = text.strip()
    if not trimmed.endswith(('.', '!', '?', '"', '”', '’', ')')):
        return False

    return True

def clean_takeaway_text(text: str) -> str:
    if not text:
        return ""
    cleaned = clean_latex_and_html(text)
    cleaned = LEADING_SECTION_LABEL.sub('', cleaned).strip()
    # Loại bỏ các tiền tố nhãn do AI tự thêm (ví dụ: **Key Takeaway:**, Takeaway:)
    cleaned = re.sub(
        r'^(?:\*\*)?(?:key\s+(?:clinical\s+)?takeaways?|clinical\s+takeaways?|takeaways?|clinical\s+implications?|summary)(?:\*\*)?\s*[:.\-]\s*',
        '',
        cleaned,
        flags=re.IGNORECASE
    )
    # Loại bỏ dấu ngoặc kép bọc ngoài nếu toàn bộ câu bị đóng ngoặc
    cleaned = re.sub(r'^["\'“‘](.+)["\'”’]$', r'\1', cleaned).strip()
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

def extract_date_from_parts(parts_obj: dict) -> tuple:
    """
    Trích xuất ngày từ cấu trúc date-parts của Crossref.
    Trả về tuple: (iso_str, has_exact_day)
    has_exact_day = True nếu có đủ ngày (day), False nếu chỉ có tháng/năm.
    """
    if not parts_obj or not isinstance(parts_obj, dict):
        return ("", False)
    date_parts = parts_obj.get("date-parts")
    if date_parts and len(date_parts) > 0 and len(date_parts[0]) >= 1:
        parts = date_parts[0]
        y = parts[0]
        m = str(parts[1] if len(parts) >= 2 else 1).zfill(2)
        has_day = len(parts) >= 3 and parts[2] is not None
        d = str(parts[2] if has_day else 1).zfill(2)
        return (f"{y}-{m}-{d}T00:00:00Z", has_day)
    return ("", False)

def resolve_article_pub_date(crossref_item: dict, epmc_date: str = "", fallback_date: str = "") -> str:
    """
    [Giải pháp B] Xác định ngày xuất bản thực tế chính xác:
    - Ưu tiên ngày xuất bản điện tử / xuất hiện thực tế (có đủ ngày DD).
    - KHÔNG cho phép nhãn số báo in tương lai (chỉ có MM/YYYY như [2026, 11]) đè lên ngày xuất bản online thực tế.
    """
    # 1. Nếu Europe PMC có ngày xuất bản đầu tiên chính xác (format: YYYY-MM-DD)
    if epmc_date and len(epmc_date) >= 10:
        return normalize_iso_date(f"{epmc_date[:10]}T00:00:00Z")

    online_iso, online_has_day = extract_date_from_parts(crossref_item.get("published-online", {}))
    created_iso, created_has_day = extract_date_from_parts(crossref_item.get("created", {}))
    deposited_iso, deposited_has_day = extract_date_from_parts(crossref_item.get("deposited", {}))
    print_iso, print_has_day = extract_date_from_parts(crossref_item.get("published-print", {}))
    issued_iso, issued_has_day = extract_date_from_parts(crossref_item.get("issued", {}))

    # 2. Nếu published-online có ngày chính xác, đây là ngày xuất bản online chuẩn
    if online_iso and online_has_day:
        return normalize_iso_date(online_iso, fallback_iso=created_iso or fallback_date)

    # 3. Nếu created có ngày chính xác (ngày nạp bài lên hệ thống xuất bản)
    if created_iso and created_has_day:
        # Nếu print_iso có đủ ngày và không phải tháng tương lai so với created, chấp nhận print_iso
        if print_iso and print_has_day and print_iso[:7] <= created_iso[:7]:
            return normalize_iso_date(print_iso, fallback_iso=created_iso)
        # Ngược lại, dùng chính ngày nạp (created) vì bài đã phát hành trực tuyến vào ngày này
        return normalize_iso_date(created_iso, fallback_iso=fallback_date)

    if deposited_iso and deposited_has_day:
        return normalize_iso_date(deposited_iso, fallback_iso=fallback_date)

    if print_iso and print_has_day:
        return normalize_iso_date(print_iso, fallback_iso=created_iso or fallback_date)

    if issued_iso and issued_has_day:
        return normalize_iso_date(issued_iso, fallback_iso=created_iso or fallback_date)

    best_candidate = online_iso or print_iso or issued_iso or created_iso or fallback_date
    return normalize_iso_date(best_candidate, fallback_iso=created_iso or fallback_date)

SUBSPECIALTY_RULES = [
    (
        "Stroke",
        r'\b(stroke|ischemic|infarction|thrombectomy|thrombolysis|tenecteplase|alteplase|intracerebral hemorrhage|subarachnoid hemorrhage|intracranial bleeding|intracranial hemorrhage|aneurysm|carotid|endovascular|neurovascular|cerebral ischemia|small vessel disease|cerebral amyloid angiopathy|cavernous malformation|arteriovenous malformation|venous sinus thrombosis)\b'
    ),
    (
        "Neurocritical Care",
        r'\b(neurocritical|intensive care|critical care|status epilepticus|intracranial pressure|cerebral edema|coma|unresponsive wakefulness|minimally conscious|brain death|targeted temperature|post-cardiac arrest|mechanical ventilation|extubation|neuro-icu|delirium|traumatic brain injury|tbi|concussion|head injury|head trauma)\b'
    ),
    (
        "Epilepsy",
        r'\b(epilep\w*|seizure\w*|antiseizure|ictal|interictal|dravet|lennox-gastaut|focal cortical dysplasia|sudep)\b'
    ),
    (
        "Dementia",
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
        "CNS Infections",
        r'\b(meningit\w*|meningoencephalit\w*|brain abscess|epidural abscess|subdural empyema|tuberculous meningitis|cns tuberculosis|neurosyphilis|herpes simplex virus encephalitis|hsv encephalitis|cryptococc\w*|cerebral toxoplasmosis|varicella zoster\w*|vzv encephalitis|neurocysticercosis|arbovirus|japanese encephalitis|lyme neuroborreliosis|neuroborreliosis|progressive multifocal leukoencephalopathy|pml|cerebral malaria|rabies|ventriculit\w*|cns viral infection|cns bacterial infection|cns fungal infection|cns parasitic infection|cns infection|infectious encephalitis)\b'
    ),
    (
        "Neuro-Oncology",
        r'\b(glioblastoma|glioma|meningioma|astrocytoma|oligodendroglioma|medulloblastoma|brain tumor|brain metastasis|brain metastases|cns lymphoma|primary central nervous system lymphoma|neuro-oncology|schwannoma|ependymoma)\b'
    ),
]

def classify_neurology_article(title: str, abstract: str = "", is_specialty: bool = False, subjects: list = None):
    """
    [Giải pháp C] Nhận diện bài Thần kinh toàn diện, bao gồm cả tạp chí đa khoa (NEJM, The Lancet, JAMA)
    thông qua tiêu đề, từ khóa chuyên khoa, subjects, và abstract.
    """
    if NON_ARTICLE_PATTERNS.search(title):
        return False, "Other", ["Other"], []

    subjects_str = " ".join(subjects or []).lower()
    subject_has_neuro = any(k in subjects_str for k in ["neuro", "stroke", "brain", "psychiatry", "nervous system"])

    # Với tạp chí đa khoa: kiểm tra tiêu đề, subjects, hoặc abstract
    if not is_specialty:
        title_matches = bool(STRICT_TITLE_NEURO_REGEX.search(title))
        abstract_matches = bool(abstract and STRICT_TITLE_NEURO_REGEX.search(abstract[:400]))
        if not (title_matches or subject_has_neuro or abstract_matches):
            return False, "Other", ["Other"], []

    text_corpus = f"{title} {abstract}".lower()
    matched_keywords = [kw for kw in NEURO_KEYWORDS if re.search(r'\b' + re.escape(kw.lower()) + r'\b', text_corpus)]

    if not matched_keywords and not is_specialty and not subject_has_neuro:
        return False, "Other", ["Other"], []

    title_lower = title.lower()
    matched_subs = []

    for sub_name, pattern in SUBSPECIALTY_RULES:
        if re.search(pattern, title_lower, re.IGNORECASE):
            matched_subs.append(sub_name)

    for sub_name, pattern in SUBSPECIALTY_RULES:
        if sub_name not in matched_subs and re.search(pattern, text_corpus, re.IGNORECASE):
            matched_subs.append(sub_name)

    if not matched_subs:
        matched_subs = ["Stroke" if "stroke" in text_corpus else "Other"]

    primary_sub = matched_subs[0]
    formatted_topics = [t.capitalize() for t in (matched_keywords[:4] if matched_keywords else ["Neurology"])]
    return True, primary_sub, matched_subs[:3], formatted_topics

def detect_article_types(title: str, abstract: str, doi: str = "", crossref_type: str = "", author_count: int = 1):
    title_l = title.lower()
    abs_l = (abstract or "").lower()
    doi_l = (doi or "").lower()
    combined = f"{title_l} {abs_l}"
    has_real_abs = bool(abs_l) and not abs_l.startswith("original abstract") and len(abs_l) >= 80

    if (
        "/nejme" in doi_l
        or "/nejmp" in doi_l
        or "/nejmc" in doi_l
        or re.search(r'^(editorial|comment|commentary|perspective|viewpoint|journal club|neurology journal club|author.?s?\s+reply|reply to|in\s+reply|letter)', title_l)
        or re.search(r'\b(editorial|invited commentary|authors\' reply|clinical trial of the year|are we there yet)\b', title_l)
        or (title_l.startswith("expanding the evidence") and "methods" not in abs_l)
    ):
        return "Editorial / Perspective", ["Editorial / Perspective"]

    if (
        "/nejmicm" in doi_l
        or "/nejmcp" in doi_l
        or re.search(r'\b(case\s+\d+-\d+|case report|case series|clinical reasoning|teaching neuroimage\w*|teaching video\w*|mystery case|image of|clinicopathological|pearls\s*&\s*oy-sters|child neurology:|tornado-like enhancement|fusiform enlargement|fibroblast imaging|quadrilateral syndrome|hyperdense anterior cerebral artery sign)\b', title_l)
    ):
        return "Case Report", ["Case Report"]

    # Guideline & Consensus
    if re.search(r'\b(guideline|guidelines|consensus|scientific statement|practice advisory|practice parameter|position statement|recommendations from)\b', title_l):
        return "Guideline", ["Guideline", "Review"]

    if (
        re.search(r'\b(meta-analysis|systematic review|network meta-analysis|pooled analysis|ipd analysis)\b', title_l)
        or ("systematic review" in abs_l and "meta-analysis" in abs_l)
        or "pooled individual participant data" in abs_l
    ):
        return "Meta-Analysis", ["Meta-Analysis", "Review", "Original Article"]

    is_secondary_or_trial = re.search(r'\b(randomized|randomised|clinical trial|phase [123]|cohort|case-control)\b', title_l)
    if not is_secondary_or_trial and (
        "review" in crossref_type.lower()
        or re.search(r'\b(review|seminar|state of the art|contemporary issues|primer)\b', title_l)
        or (has_real_abs and "methods" not in abs_l and "results" not in abs_l and re.search(r'\b(overview|we review|this review|narrative review|recent advances)\b', abs_l))
    ):
        return "Review", ["Review"]

    if not has_real_abs and author_count <= 7 and not is_secondary_or_trial:
        return "Editorial / Perspective", ["Editorial / Perspective"]

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

                # Khôi phục chính xác các bài Stroke bị dồn ngày
                if doi_key in REPAIR_OCT26_DOIS:
                    item["pub_date"] = REPAIR_OCT26_DOIS[doi_key]
                else:
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
                item["id"] = doi_key
                cache[doi_key] = item
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

Provide a concise, high-yield clinical takeaway (1-2 sentences maximum, under 55 words) for practicing neurologists. Preserve exact statistical outcomes if present (e.g., OR, HR, RR, 95% CI, p-value, mRS). Do NOT use LaTeX math syntax (no $ signs, no \\beta or \\times); use plain Unicode characters (β, α, ×, ±, ≤, ≥) instead. Do not include introductory filler, draft notes, word counting, or section headers. Return only the final takeaway."""

    system_instruction = "You are an expert clinical neurologist and methodologist. Return ONLY the final 1-2 sentence clinical takeaway directly. Never output reasoning, scratchpad, drafts, word counts, or preambles."

    payload_no_thinking = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": {
            "temperature": 0.15,
            "maxOutputTokens": 1024,
            "thinkingConfig": {
                "thinkingBudget": 0
            }
        }
    }

    payload_fallback = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": {
            "temperature": 0.15,
            "maxOutputTokens": 1024
        }
    }

    for model_name in ACTIVE_GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        for payload in [payload_no_thinking, payload_fallback]:
            success = False
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
                            candidate = candidates[0]
                            finish_reason = candidate.get("finishReason", "")
                            if finish_reason == "MAX_TOKENS":
                                break
                            parts = candidate.get("content", {}).get("parts", [])
                            text_chunks = [p.get("text", "") for p in parts if "text" in p and not p.get("thought")]
                            summary = clean_takeaway_text(" ".join(text_chunks))
                            if is_valid_clinical_takeaway(summary):
                                time.sleep(1.2)
                                return summary
                            else:
                                break
                    success = True
                    break
                except urllib.error.HTTPError as e:
                    if e.code == 400:
                        # thinkingConfig không được hỗ trợ trên model này, thử payload_fallback
                        break
                    elif e.code in (429, 500, 502, 503, 504):
                        time.sleep(2 * (attempt + 1))
                    else:
                        success = True
                        break
                except Exception:
                    time.sleep(1)
                    continue
            if success:
                break

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
        with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            id_list = data.get("esearchresult", {}).get("idlist", [])
            if id_list:
                pmid = id_list[0]

        if not pmid:
            return ""

        efetch_url = (
            f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
            f"?db=pubmed&id={pmid}&retmode=xml"
        )
        req_f = urllib.request.Request(efetch_url, headers=HEADERS)
        with urllib.request.urlopen(req_f, context=ctx, timeout=6) as resp_f:
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

    # 1. Europe PMC (nhanh nhất, bao quát cao nhất cho y khoa)
    try:
        url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%22{urllib.parse.quote(doi)}%22&format=json&resultType=core"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("resultList", {}).get("result", [])
            if results and results[0].get("abstractText"):
                clean = clean_text(results[0]["abstractText"])
                if len(clean) > 80:
                    return clean
    except Exception:
        pass

    # 2. PubMed qua DOI
    pubmed_abs = fetch_pubmed_abstract(doi, title)
    if pubmed_abs:
        return pubmed_abs

    # 3. OpenAlex fallback
    try:
        clean_doi = doi.strip()
        url = f"https://api.openalex.org/works/https://doi.org/{urllib.parse.quote(clean_doi)}"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
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

def fetch_europepmc_rolling_items(issn: str, days_back: int = 21) -> dict:
    """
    [Giải pháp A] Quét Europe PMC (PubMed Mirror mở) theo cửa sổ trượt 21 ngày gần nhất.
    Trả về dict dạng: { doi: { 'doi': ..., 'title': ..., 'abstract': ..., 'firstPublicationDate': ... } }
    """
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")
    end_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    
    query = f'ISSN:{issn} AND FIRST_PDATE:[{start_date} TO {end_date}]'
    url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={urllib.parse.quote(query)}&format=json&pageSize=50&resultType=core"
    req = urllib.request.Request(url, headers=HEADERS)
    epmc_map = {}

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=14) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("resultList", {}).get("result", [])
            for r in results:
                doi = (r.get("doi") or "").strip().lower()
                if not doi:
                    continue
                title = clean_text(r.get("title", ""))
                abstract = clean_text(r.get("abstractText", ""))
                first_pdate = r.get("firstPublicationDate") or ""
                authors = []
                author_str = r.get("authorString", "")
                if author_str:
                    authors = [a.strip() for a in author_str.split(",") if a.strip()][:15]

                epmc_map[doi] = {
                    "doi": doi,
                    "title": title,
                    "abstract": abstract,
                    "firstPublicationDate": first_pdate,
                    "authors": authors,
                    "pubType": r.get("pubType", ""),
                    "pmid": r.get("pmid", "")
                }
    except Exception as e:
        # Nếu Europe PMC có trục trặc mạng tạm thời, ghi nhận và tiếp tục dùng Crossref
        pass

    return epmc_map

def fetch_journal_articles(journal_cfg: dict, cache: dict) -> list:
    """
    [Giải pháp A & B] Quét đa chiều theo cửa sổ trượt (Multi-Query Rolling Window):
    1. Crossref sort=created (các bài vừa nạp/tạo mới nhất)
    2. Crossref sort=published-online (các bài vừa xuất bản trực tuyến)
    3. Crossref sort=published (các bài trong số phát hành)
    4. Europe PMC cửa sổ 21 ngày gần nhất (lấy ngày First Pub Date và Abstract tức thì)
    """
    issn = journal_cfg["issn"]
    rows = journal_cfg.get("scan_rows", 40)
    articles = []

    # 1. Quét Europe PMC theo cửa sổ 21 ngày trước
    epmc_items = fetch_europepmc_rolling_items(issn, days_back=21)
    if journal_cfg.get("online_issn") and len(epmc_items) < 10:
        alt_epmc = fetch_europepmc_rolling_items(journal_cfg["online_issn"], days_back=21)
        epmc_items.update(alt_epmc)

    # 2. Quét Crossref đa chiều: created, published-online, published
    crossref_urls = [
        f"https://api.crossref.org/journals/{issn}/works?sort=created&order=desc&rows={rows}",
        f"https://api.crossref.org/journals/{issn}/works?sort=published-online&order=desc&rows={rows}",
        f"https://api.crossref.org/journals/{issn}/works?sort=published&order=desc&rows={max(25, rows // 2)}"
    ]

    raw_crossref_items = {}
    for c_url in crossref_urls:
        try:
            req = urllib.request.Request(c_url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=16) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for item in data.get("message", {}).get("items", []):
                    doi = item.get("DOI", "").strip()
                    if doi and doi.lower() not in raw_crossref_items:
                        raw_crossref_items[doi.lower()] = item
        except Exception:
            continue

    print(f"   -> {journal_cfg['short_name']}: Crossref thu thập {len(raw_crossref_items)} bài; Europe PMC phát hiện {len(epmc_items)} bài trong 21 ngày.")

    # 3. Hợp nhất danh sách DOI từ cả 2 nguồn
    all_dois = list(set(list(raw_crossref_items.keys()) + list(epmc_items.keys())))

    for doi_lower in all_dois:
        try:
            c_item = raw_crossref_items.get(doi_lower, {})
            e_item = epmc_items.get(doi_lower, {})

            # Lấy tiêu đề sạch
            title = ""
            if e_item.get("title"):
                title = e_item["title"]
            elif c_item.get("title"):
                title = clean_text(c_item["title"][0])

            if not title or NON_ARTICLE_PATTERNS.search(title):
                continue

            doi = (c_item.get("DOI") or e_item.get("doi") or doi_lower).strip().lower()
            if not doi:
                continue

            # Xác định ngày xuất bản chính xác
            epmc_pdate = e_item.get("firstPublicationDate", "")
            pub_iso = resolve_article_pub_date(c_item, epmc_date=epmc_pdate)

            # Khôi phục nếu nằm trong danh sách bài 26/10 bị nhảy ngày
            if doi in REPAIR_OCT26_DOIS:
                pub_iso = REPAIR_OCT26_DOIS[doi]

            # Kiểm tra bộ nhớ đệm đã có bài hay chưa (so khớp chuẩn chữ thường)
            if doi in cache:
                cached_art = cache[doi]
                cached_art["id"] = doi
                # Giữ nguyên ngày xuất bản đã ghi nhận trong cache, tuyệt đối không nhảy ngày
                if doi in REPAIR_OCT26_DOIS:
                    cached_art["pub_date"] = REPAIR_OCT26_DOIS[doi]
                cached_abs = cached_art.get("abstract", "")

                # Nếu bài trong cache đã có abstract đầy đủ, giữ nguyên và sử dụng tiếp
                if cached_abs and not cached_abs.startswith("Original abstract and full manuscript"):
                    articles.append(cached_art)
                    continue
                # Nếu bài trong cache chỉ có placeholder nhưng giờ Europe PMC có abstract thực
                elif e_item.get("abstract") and len(e_item["abstract"]) >= 80:
                    cached_art["abstract"] = e_item["abstract"]
                    cached_art["ai_takeaways"]["conclusion_vi"] = extract_fallback_takeaway(e_item["abstract"])
                    articles.append(cached_art)
                    continue

            # Kiểm tra phân ngành thần kinh cho tạp chí đa khoa
            subjects = c_item.get("subject", [])
            initial_abs = e_item.get("abstract") or clean_text(c_item.get("abstract", ""))
            
            is_neuro, primary_sub, sub_list, topics = classify_neurology_article(
                title, initial_abs, is_specialty=journal_cfg["specialty_journal"], subjects=subjects
            )
            if not is_neuro:
                continue

            # Lấy Abstract: ưu tiên Europe PMC, sau đó tới Crossref, sau đó tới API fallback
            clean_abs = initial_abs
            if not clean_abs or len(clean_abs) < 80:
                real_abs = fetch_abstract_from_apis(doi, title)
                if real_abs:
                    clean_abs = real_abs

            if not clean_abs or len(clean_abs) < 80:
                clean_abs = f"Original abstract and full manuscript available at {journal_cfg['short_name']} via DOI."

            # Tác giả
            authors = []
            if e_item.get("authors"):
                authors = e_item["authors"]
            elif c_item.get("author"):
                for a in c_item.get("author", []):
                    family = a.get("family", "")
                    given = a.get("given", "")
                    if family:
                        authors.append(f"{family} {given}".strip())

            primary_type, all_types = detect_article_types(title, clean_abs, doi, c_item.get("type", ""), len(authors))

            key_takeaway = ""
            if clean_abs and not clean_abs.startswith("Original abstract"):
                key_takeaway = extract_fallback_takeaway(clean_abs)

            article_entry = {
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
                "doi_url": c_item.get("URL", f"https://doi.org/{doi}"),
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
            }
            articles.append(article_entry)

        except Exception:
            continue

    return articles

def sync_guidelines_to_neuroguide(articles: list):
    """
    [Giải pháp C] Tự động đồng bộ các Guideline / Scientific Statement phát hiện được
    sang Hàng đợi kiểm duyệt (Review Queue) của NeuroGuide.
    """
    catalog_path = os.path.join("data", "guidelines_store", "catalog.json")
    store_dir = os.path.join("data", "guidelines_store")
    os.makedirs(store_dir, exist_ok=True)
    catalog = {}
    if os.path.exists(catalog_path):
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog = json.load(f)
        except Exception:
            catalog = {}

    existing_titles = {
        re.sub(r"[^a-z0-9]", "", entry.get("title", "").lower())
        for entry in catalog.values()
    }
    existing_dois = {
        entry.get("doi", "").lower().strip()
        for entry in catalog.values() if entry.get("doi")
    }

    synced_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for art in articles:
        if art.get("article_type") != "Guideline" and "Guideline" not in art.get("article_types", []):
            continue

        doi = art.get("id", "").strip().lower()
        title = art.get("title", "").strip()
        if not doi or not title:
            continue

        clean_t = re.sub(r"[^a-z0-9]", "", title.lower())
        if clean_t in existing_titles or doi in existing_dois:
            continue

        j_name = art.get("journal", {}).get("name", "")
        j_short = art.get("journal", {}).get("short_name", "")
        society = "AHA/ASA" if ("Stroke" in j_name or "AHA" in title or "ASA" in title) else \
                  "ESO" if ("European Stroke" in j_name or "ESO" in title) else \
                  "AAN" if ("Neurology" in j_name or "AAN" in title) else \
                  "NCS" if "Neurocritical" in j_name else "Clinical Society"

        guideline_id = "guide-doi-" + re.sub(r"[^a-z0-9]", "-", doi)
        pub_date_str = art.get("pub_date") or "2026"
        pub_year = int(pub_date_str[:4]) if len(pub_date_str) >= 4 and pub_date_str[:4].isdigit() else 2026
        takeaway = art.get("ai_takeaways", {}).get("conclusion_vi", "") or art.get("abstract", "")[:300]
        sub = art.get("neurology_classification", {}).get("subspecialty", "Stroke")

        guideline_record = {
            "guideline_id": guideline_id,
            "version": 1,
            "metadata": {
                "guideline_id": guideline_id,
                "title": title,
                "society": society,
                "year": pub_year,
                "source_url": art.get("doi_url", f"https://doi.org/{doi}"),
                "doi": doi,
                "state": "PENDING_REVIEW",
                "top_takeaways": [takeaway] if takeaway else ["Society clinical practice guideline."]
            },
            "total_recommendations": 1,
            "pending_count": 1,
            "approved_count": 0,
            "rejected_count": 0,
            "recommendations": [
                {
                    "rec_id": f"{guideline_id}-rec-01",
                    "guideline_id": guideline_id,
                    "grading_system": "AHA_ACC" if society == "AHA/ASA" else "GRADE_ESO",
                    "page_num": 1,
                    "section": sub,
                    "topic": sub,
                    "statement": title,
                    "cor": "1",
                    "cor_label": "Official Society Recommendation",
                    "loe": "A",
                    "loe_label": "Evidence from trials & consensus",
                    "target_population": f"Patients managed under {sub} guidelines",
                    "driving_trials": [f"{j_short} ({pub_year})", f"DOI: {doi}"],
                    "verbatim_quote": title,
                    "confidence_score": 0.95,
                    "approval_status": "pending"
                }
            ],
            "updated_at": now_iso
        }

        latest_path = os.path.join(store_dir, f"{guideline_id}_latest.json")
        with open(latest_path, "w", encoding="utf-8") as f:
            json.dump(guideline_record, f, ensure_ascii=False, indent=2)

        catalog[guideline_id] = {
            "guideline_id": guideline_id,
            "title": title,
            "society": society,
            "year": pub_year,
            "latest_version": 1,
            "total_recommendations": 1,
            "pending_count": 1,
            "approved_count": 0,
            "rejected_count": 0,
            "grading_system": "AHA_ACC" if society == "AHA/ASA" else "GRADE_ESO",
            "updated_at": now_iso
        }
        existing_titles.add(clean_t)
        existing_dois.add(doi)
        synced_count += 1
        print(f"   [🎯 NeuroGuide Bridge] Tự động đồng bộ Guideline mới vào Review Queue: {title[:55]}...")

    if synced_count > 0:
        with open(catalog_path, "w", encoding="utf-8") as f:
            json.dump(catalog, f, ensure_ascii=False, indent=2)
        print(f"-> Đã đồng bộ {synced_count} guideline mới vào NeuroGuide Review Queue.")

def save_articles_to_disk(all_articles: list):
    os.makedirs("public/data", exist_ok=True)
    tmp_path = f"{DATA_FILE_PATH}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, DATA_FILE_PATH)

def run():
    print("=" * 70)
    print("🚀 NEUROPULSE MULTI-JOURNAL COMPREHENSIVE SCANNER & PIPELINE")
    print("=" * 70)

    # [Pha 1]: Khởi động bộ đệm và sửa lỗi ngày tháng
    print("\n[1/4] Tải và chuẩn hóa bộ nhớ đệm bài báo...")
    existing_cache = load_existing_cache()
    print(f"-> Đã tải {len(existing_cache)} bài báo từ bộ nhớ đệm (Đã khôi phục các bài Stroke bị dồn ngày).")

    # [Pha 2]: Quét đa chiều theo cửa sổ trượt (Multi-Query Rolling Window)
    print("\n[2/4] Quét bài mới từ 8 tạp chí y khoa hàng đầu (Crossref + Europe PMC Rolling Window)...")
    merged_articles = dict(existing_cache)

    for cfg in JOURNAL_CONFIGS:
        print(f"+ Đang kết nối tạp chí: {cfg['name']} ({cfg['short_name']})...")
        arts = fetch_journal_articles(cfg, existing_cache)
        print(f"  => Thu thập được {len(arts)} bài thần kinh/đột quỵ.")
        for art in arts:
            merged_articles[art["id"]] = art

    journal_order = [c["short_name"] for c in JOURNAL_CONFIGS]
    all_articles = list(merged_articles.values())
    all_articles.sort(
        key=lambda x: (
            (x.get("pub_date") or "")[:10],
            -(journal_order.index(x.get("journal", {}).get("short_name", "")) if x.get("journal", {}).get("short_name", "") in journal_order else 99)
        ),
        reverse=True
    )
    all_articles = all_articles[:MAX_ARTICLES_STORED]

    # [Giải pháp D - Bước 1]: Lưu ngay vào đĩa để bài mới lập tức hiển thị trên UI
    save_articles_to_disk(all_articles)
    print(f"\n[✓ Checkpoint] Đã lưu {len(all_articles)} bài báo mới nhất vào {DATA_FILE_PATH} (Hiển thị ngay trên UI).")

    # [Pha 3]: Phân tích AI theo từng Micro-Batch nhỏ và Lưu Checkpoint liên tục
    if GEMINI_API_KEY and all_articles:
        print(f"\n[3/4] [AI Mode] Phân tích AI ({GEMINI_MODEL}) theo từng micro-batch {CHUNK_SIZE} bài...")
        remaining_quota = MAX_GEMINI_CALLS_PER_RUN
        analyzed_count = 0
        consecutive_failures = 0

        # Lấy danh sách các bài cần chạy AI
        pending_ai_articles = []
        for art in all_articles:
            abs_text = art.get("abstract", "")
            has_real_abs = bool(abs_text) and not abs_text.startswith("Original abstract")
            already_verified = bool(art.get("ai_takeaways", {}).get("ai_verified"))
            if has_real_abs and not already_verified:
                pending_ai_articles.append(art)

        print(f"-> Có {len(pending_ai_articles)} bài cần phân tích kết luận lâm sàng AI (Hạn ngạch phiên: {MAX_GEMINI_CALLS_PER_RUN}).")

        # Chia thành từng micro-batch
        for i in range(0, len(pending_ai_articles), CHUNK_SIZE):
            if remaining_quota <= 0 or consecutive_failures >= 5:
                if consecutive_failures >= 5:
                    print("   [!] Dừng phân tích AI do gặp 5 lỗi liên tiếp (bảo vệ hạn ngạch API).")
                break

            batch = pending_ai_articles[i : i + CHUNK_SIZE]
            batch_updated = False

            for art in batch:
                if remaining_quota <= 0 or consecutive_failures >= 5:
                    break
                pub_day = art.get("pub_date", "")[:10]
                j_short = art.get("journal", {}).get("short_name", "")
                ai_res = analyze_abstract_with_gemini(art.get("title", ""), art.get("abstract", ""))

                if ai_res and is_valid_clinical_takeaway(ai_res):
                    consecutive_failures = 0
                    remaining_quota -= 1
                    analyzed_count += 1
                    batch_updated = True
                    if "ai_takeaways" not in art or not isinstance(art["ai_takeaways"], dict):
                        art["ai_takeaways"] = {}
                    art["ai_takeaways"]["conclusion_vi"] = ai_res
                    art["ai_takeaways"]["ai_verified"] = True
                    print(f"   [✨ Gemini AI #{analyzed_count} | {pub_day} | {j_short}] {art.get('title', '')[:55]}...")
                else:
                    # Fallback an toàn vào kết luận chính của nghiên cứu nếu AI gặp lỗi hoặc sinh câu dở dang
                    fallback_takeaway = extract_fallback_takeaway(art.get("abstract", ""))
                    if fallback_takeaway:
                        if "ai_takeaways" not in art or not isinstance(art["ai_takeaways"], dict):
                            art["ai_takeaways"] = {}
                        art["ai_takeaways"]["conclusion_vi"] = fallback_takeaway
                        art["ai_takeaways"]["ai_verified"] = False
                        batch_updated = True
                    consecutive_failures += 1

            # [Giải pháp D - Bước 2]: Lưu Checkpoint sau mỗi Batch
            if batch_updated:
                save_articles_to_disk(all_articles)
                print(f"   -> [💾 Checkpoint] Đã lưu tiến trình sau Batch #{i // CHUNK_SIZE + 1}.")

        print(f"-> Hoàn tất phân tích AI cho {analyzed_count} bài báo mới.")
    else:
        print("\n[3/4] [Standard Mode] Không có GEMINI_API_KEY hoặc danh sách trống.")

    # [Pha 4]: Liên thông tự động Guideline sang NeuroGuide
    print("\n[4/4] Kiểm tra và đồng bộ Guideline mới sang NeuroGuide Review Queue...")
    sync_guidelines_to_neuroguide(all_articles)

    print("\n" + "=" * 70)
    print(f"✨ HOÀN TẤT TOÀN DIỆN: {len(all_articles)} bài báo sẵn sàng tại {DATA_FILE_PATH}!")
    print("=" * 70)

if __name__ == "__main__":
    run()
