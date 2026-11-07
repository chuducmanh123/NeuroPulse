#!/usr/bin/env python3
"""
labeler_tools.py - prompt builder, API runner (Google Gemini default + Anthropic Claude fallback)
and independent validator for step 2 ontology labeling.

Files expected in the same folder (override with --dir):
  stroke_ontology.json, labeler_output_schema.json, labeler_fewshot_examples.json,
  labeler_system_prompt.template.md

Commands
  selftest                          offline checks of the validator (no API needed)
  render-prompt [--out FILE]        build the full system prompt from template + ontology + examples
  build-schema [--out FILE]         regenerate labeler_output_schema.json from stroke_ontology.json
  run --in inputs.jsonl --out runA.jsonl [--provider gemini|anthropic] [--model M] [--limit N]
                                    call Gemini API (default, uses GEMINI_API_KEY) or Anthropic API
  validate --in runA.jsonl [--report report.json]
                                    validate every record; status = reject | needs_review | ai_checked
  compare --a runA.jsonl --b runB.jsonl
                                    field-by-field disagreement between two runs (different model/prompt/seed)
  eval --pred runA.jsonl [--gold gold.json]
                                    per-facet accuracy against gold labels, incl. SILENT errors
"""
import argparse, copy, hashlib, json, os, re, sys, unicodedata, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
HIDDEN_FROM_MODEL = {"cor", "loe", "strength_raw", "quality_raw", "change_type"}
MODEL_INPUT_FIELDS = ["rec_id", "society", "guideline_id", "section_path", "parent_context", "text"]
TOP_KEYS = ["rec_id", "ontology_version", "labels", "confidence", "needs_review", "review_reasons", "notes"]
REVIEW_CODES = {"label_not_in_ontology", "ambiguous_population", "direction_text_conflict", "missing_context",
                "multiple_interpretations", "unlisted_drug_or_procedure", "weak_evidence_span", "other"}


# ------------------------------------------------------------------ io
def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def load_jsonl(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]

def dump_jsonl(p, rows):
    with open(p, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

def paths(d):
    d = Path(d)
    return {
        k: d / v
        for k, v in {
            "ontology": "stroke_ontology.json",
            "schema": "labeler_output_schema.json",
            "examples": "labeler_fewshot_examples.json",
            "template": "labeler_system_prompt.template.md",
        }.items()
    }


# ------------------------------------------------------------------ schema builder & Gemini sanitizer
def build_output_schema(ont):
    """Generates labeler_output_schema.json dynamically from stroke_ontology.json."""
    props_labels = {}
    req_labels = list(ont["facets"].keys())
    for fid, f in ont["facets"].items():
        enum_vals = [x["id"] for x in f["values"]]
        item_schema = {
            "type": "object",
            "additionalProperties": False,
            "required": ["value", "evidence_span", "source"],
            "properties": {
                "value": {"type": "string", "enum": enum_vals},
                "evidence_span": {
                    "type": ["string", "null"],
                    "description": "VERBATIM substring copied from `text` or `parent_context`. null only when value is 'unspecified'.",
                },
                "source": {
                    "type": ["string", "null"],
                    "enum": ["text", "parent_context", None],
                    "description": "Where evidence_span was copied from. null only when value is 'unspecified'.",
                },
            },
        }
        if f["cardinality"] == "multi":
            facet_schema = {"type": "array", "items": item_schema}
            if f.get("required"):
                facet_schema["minItems"] = 1
            props_labels[fid] = facet_schema
        else:
            props_labels[fid] = item_schema

    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"https://neuropulse.internal/schemas/recommendation-labels-v{ont['ontology_version']}.json",
        "title": "Recommendation labeling output (step 2)",
        "description": "Output of the AI labeler. Enums are generated from stroke_ontology.json; regenerate both together. COR/LOE/numbers are NOT part of the output.",
        "type": "object",
        "additionalProperties": False,
        "required": TOP_KEYS,
        "properties": {
            "rec_id": {"type": "string", "description": "Copy exactly from the input."},
            "ontology_version": {"type": "string", "enum": [ont["ontology_version"]]},
            "labels": {
                "type": "object",
                "additionalProperties": False,
                "required": req_labels,
                "properties": props_labels,
            },
            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
            "needs_review": {"type": "boolean"},
            "review_reasons": {
                "type": "array",
                "items": {"type": "string", "enum": sorted(list(REVIEW_CODES))},
            },
            "notes": {"type": "string", "maxLength": 300},
        },
    }


def sanitize_schema_for_gemini(schema):
    """
    Converts JSON Schema Draft 2020-12 into Google Gemini OpenAPI 3.0 responseSchema subset:
    - Strips $schema, $id, title, additionalProperties, allOf, if, then, else, const
    - Converts type: ["string", "null"] -> type: "STRING", nullable: True
    """
    if not isinstance(schema, dict):
        return schema

    out = {}
    raw_type = schema.get("type")
    nullable = False
    if isinstance(raw_type, list):
        non_null = [t for t in raw_type if t != "null"]
        nullable = "null" in raw_type
        raw_type = non_null[0] if non_null else "string"

    if isinstance(raw_type, str):
        out["type"] = raw_type.upper()
    if nullable:
        out["nullable"] = True

    if "description" in schema:
        out["description"] = schema["description"]

    if "enum" in schema:
        clean_enum = [str(v) for v in schema["enum"] if v is not None]
        if clean_enum:
            out["enum"] = clean_enum
    elif "const" in schema and schema["const"] is not None:
        out["enum"] = [str(schema["const"])]

    if "properties" in schema and isinstance(schema["properties"], dict):
        out["properties"] = {k: sanitize_schema_for_gemini(v) for k, v in schema["properties"].items()}
    if "required" in schema and isinstance(schema["required"], list):
        out["required"] = schema["required"]
    if "items" in schema and isinstance(schema["items"], dict):
        out["items"] = sanitize_schema_for_gemini(schema["items"])

    return out


# ------------------------------------------------------------------ prompt
def render_ontology(ont):
    lines = []
    for fid, f in ont["facets"].items():
        card = "ONE value" if f["cardinality"] == "single" else ("one or more values" if f["required"] else "zero or more values (empty array allowed)")
        lines.append(f"\n## {fid}  [{card}]\n{f['def']}")
        for x in f["values"]:
            s = f"- {x['id']}: {x['def']}"
            if x.get("not"): s += f" | NOT: {x['not']}"
            if x.get("aliases"): s += f" | aliases: {', '.join(x['aliases'])}"
            lines.append(s)
    return "\n".join(lines).strip()

def model_view(inp):
    return {k: inp.get(k) for k in MODEL_INPUT_FIELDS}

def render_examples(ex):
    out = []
    for i, e in enumerate(ex["examples"], 1):
        out.append(f"<example_{i}>\n<input>{json.dumps(model_view(e['input']), ensure_ascii=False)}</input>\n"
                   f"<output>{json.dumps(e['expected_output'], ensure_ascii=False)}</output>\n</example_{i}>")
    return "\n".join(out)

def render_prompt(d):
    p = paths(d)
    ont, ex = load_json(p["ontology"]), load_json(p["examples"])
    with open(p["template"], encoding="utf-8") as f:
        tpl = f.read()
    s = (tpl.replace("{{ONTOLOGY_VERSION}}", ont["ontology_version"])
            .replace("{{ONTOLOGY}}", render_ontology(ont)).replace("{{EXAMPLES}}", render_examples(ex)))
    return s, hashlib.sha256(s.encode()).hexdigest()[:8]


# ------------------------------------------------------------------ validator
def _norm_ws(s):
    s = unicodedata.normalize("NFKC", str(s or ""))
    # Strip ASCII control characters (e.g. \u0007 bell character from PDF extraction)
    s = re.sub(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f]", " ", s)
    s = s.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    s = re.sub(r"[\u2010-\u2015\u2212]", "-", s)
    return re.sub(r"\s+", " ", s).strip()

def span_match(span, src):
    if span in src: return "exact"
    if _norm_ws(span) and _norm_ws(span) in _norm_ws(src): return "normalized"
    return None

def norm_cor(raw):
    """AHA COR -> '1' | '2a' | '2b' | '3: no benefit' | '3: harm' | '3' | None"""
    if not raw: return None
    s = re.sub(r"(?i)\b(class|cor)\b", "", str(raw)).strip(" :.-").lower()
    # Map Roman numerals if present
    s = re.sub(r"^iii\b", "3", s)
    s = re.sub(r"^iia\b", "2a", s)
    s = re.sub(r"^iib\b", "2b", s)
    s = re.sub(r"^i\b", "1", s)
    m = re.match(r"^(1|2a|2b|3)\b[\s:,\-]*(.*)$", s)
    if not m: return None
    base, rest = m.groups()
    if base == "3":
        return "3: harm" if "harm" in rest else ("3: no benefit" if "benefit" in rest else "3")
    return base

COR_ALLOWED = {"1": {"for"}, "2a": {"for", "uncertain"}, "2b": {"for", "uncertain"},
               "3: no benefit": {"no_benefit", "against"}, "3: harm": {"against"}, "3": {"no_benefit", "against"}}

NEG = re.compile(r"\b(is|are) not recommended\b|\bnot recommended\b|\bshould not\b|\bis harmful\b|\bpotentially harmful\b|"
                 r"\bcontraindicated\b|\bdoes not (result in|improve|reduce)\b|\bno benefit\b|\bnot useful\b|"
                 r"\bnot beneficial\b|\bshould be avoided\b|\brecommend against\b|\bsuggest against\b", re.I)
POS = re.compile(r"\b(is|are) (recommended|reasonable|indicated|useful|effective|beneficial)\b|"
                 r"\bshould be (performed|given|administered|considered|offered)\b|\bmay be (considered|reasonable)\b|"
                 r"\bcan be (considered|useful)\b|\bwe (recommend|suggest) (that|using|offering|administering|performing)\b", re.I)
UNC = re.compile(r"\b(is|are) (uncertain|unknown|unclear)\b|\bnot well established\b|\bremains? (uncertain|unclear)\b|"
                 r"\bremain to be determined\b|\bcontinued uncertainty\b", re.I)
PED = re.compile(r"\b(pediatric|paediatric|child|children|neonat\w*|infant\w*|adolescent\w*)\b|trẻ em|nhi khoa|sơ sinh", re.I)

def _term_regex(term):
    t = term.strip()
    if len(t) <= 4:   # short abbreviations: case-sensitive upper-case form (CT, MRI, TNK...)
        return re.compile(r"(?<![A-Za-z0-9])" + re.escape(t.upper()) + r"(?![A-Za-z0-9])")
    return re.compile(r"(?<![A-Za-z0-9])" + re.escape(t) + r"(?![A-Za-z0-9])", re.I)

def validate_record(inp, out, ont):
    E, R, W = [], [], []
    e = lambda c, m: E.append({"code": c, "msg": m})
    r = lambda c, m: R.append({"code": c, "msg": m})
    w = lambda c, m: W.append({"code": c, "msg": m})
    facets = ont["facets"]
    text, ctx = inp.get("text", "") or "", inp.get("parent_context", "") or ""

    if not isinstance(out, dict):
        return {"status": "reject", "errors": [{"code": "not_object", "msg": "output is not an object"}], "reviews": [], "warnings": []}
    for k in TOP_KEYS:
        if k not in out: e("missing_key", f"missing top-level key {k}")
    for k in out:
        if k not in TOP_KEYS: e("extra_key", f"unexpected top-level key '{k}' (labeler may not output COR/LOE or other fields)")
    if out.get("rec_id") != inp.get("rec_id"): e("rec_id_mismatch", f"{out.get('rec_id')} != {inp.get('rec_id')}")
    if out.get("ontology_version") != ont["ontology_version"]: e("version_mismatch", f"ontology_version {out.get('ontology_version')}")
    if out.get("confidence") not in ("high", "medium", "low"): e("bad_confidence", str(out.get("confidence")))
    if not isinstance(out.get("needs_review"), bool): e("bad_needs_review", "needs_review must be boolean")
    rr = out.get("review_reasons")
    if not isinstance(rr, list): e("bad_review_reasons", "review_reasons must be an array")
    else:
        for x in rr:
            if x not in REVIEW_CODES: e("bad_review_reason", f"unknown review reason '{x}'")
        if out.get("needs_review") is True and not rr: e("review_reasons_missing", "needs_review=true but no reason given")
    if not isinstance(out.get("notes", ""), str) or len(out.get("notes", "")) > 300: e("bad_notes", "notes must be a string of at most 300 characters")

    lab = out.get("labels")
    vals = {}
    if not isinstance(lab, dict):
        e("bad_labels", "labels must be an object")
        lab = {}
    for fid, f in facets.items():
        if fid not in lab: e("missing_facet", f"facet '{fid}' missing"); continue
        raw = lab[fid]
        multi = f["cardinality"] == "multi"
        if multi and not isinstance(raw, list): e("bad_cardinality", f"{fid} must be an array"); continue
        if not multi and not isinstance(raw, dict): e("bad_cardinality", f"{fid} must be a single object"); continue
        items = raw if multi else [raw]
        if multi and f["required"] and not items: e("empty_required_facet", f"{fid} needs at least one value")
        ids = {x["id"] for x in f["values"]}
        seen = []
        for it in items:
            if not isinstance(it, dict) or set(it) != {"value", "evidence_span", "source"}:
                e("bad_item_keys", f"{fid}: item must have exactly value, evidence_span, source"); continue
            v, sp, src = it["value"], it["evidence_span"], it["source"]
            if v not in ids: e("enum", f"{fid}: '{v}' is not in the ontology"); continue
            seen.append(v)
            if v == "unspecified":
                if sp is not None or src is not None: e("unspecified_with_evidence", f"{fid}: unspecified must have null evidence")
                continue
            if not isinstance(sp, str) or len(sp) < 3 or src not in ("text", "parent_context"):
                e("evidence_missing", f"{fid}={v}: needs evidence_span (>=3 chars) and source text|parent_context"); continue
            m = span_match(sp, text if src == "text" else ctx)
            if m is None: e("span_not_found", f"{fid}={v}: span not found verbatim in {src}: '{sp}'")
            elif m == "normalized": w("span_normalized", f"{fid}={v}: span matches only after whitespace/quote normalization")
        if len(seen) != len(set(seen)): e("duplicate_value", f"{fid}: duplicate values")
        if "unspecified" in seen and len(seen) > 1: e("unspecified_mixed", f"{fid}: 'unspecified' combined with other values")
        vals[fid] = seen

    if E:
        return {"status": "reject", "errors": E, "reviews": R, "warnings": W}

    # ---- semantic checks (REVIEW = code forces the record into the review queue)
    flat = [v for vs in vals.values() for v in vs]
    if any(v.startswith("other_") for v in flat):
        r("other_value_used", "an other_* / other_unlisted value was used (candidate new ontology term)")
    if vals["condition"] == ["unspecified"]: r("condition_unspecified", "no condition could be determined")
    if vals["direction"] == ["unspecified"]: r("direction_unspecified", "direction could not be determined")
    if out["confidence"] == "low": r("low_confidence", "labeler reported low confidence")

    direction = vals["direction"][0]
    cor = norm_cor(inp.get("cor"))
    if cor and direction not in COR_ALLOWED[cor] | {"unspecified"}:
        r("cor_direction", f"COR '{inp.get('cor')}' implies {sorted(COR_ALLOWED[cor])} but direction='{direction}'")
    sr = (inp.get("strength_raw") or "").lower()
    if sr and not cor:
        if "against" in sr and direction not in {"against", "no_benefit", "unspecified"}: r("strength_direction", f"strength '{inp['strength_raw']}' vs direction '{direction}'")
        elif re.search(r"\bfor\b", sr) and direction not in {"for", "uncertain", "unspecified"}: r("strength_direction", f"strength '{inp['strength_raw']}' vs direction '{direction}'")

    neg, pos, unc = NEG.search(text), POS.search(text), UNC.search(text)
    if neg: allowed, why = {"against", "no_benefit", "unspecified"}, f"negative wording '{neg.group(0)}'"
    elif pos and not unc: allowed, why = {"for", "uncertain", "unspecified"}, f"positive wording '{pos.group(0)}'"
    elif unc and not pos: allowed, why = {"uncertain", "unspecified"}, f"uncertainty wording '{unc.group(0)}'"
    else: allowed, why = None, ""
    if allowed and direction not in allowed:
        r("wording_conflict", f"direction='{direction}' conflicts with {why}")

    if PED.search(text + " " + ctx) and not ({"pediatric", "neonate_perinatal"} & set(vals["age_group"])):
        r("pediatric_missing", "text mentions pediatric/neonatal patients but age_group does not")

    for x in facets["drug_or_procedure"]["values"]:
        if x["id"] == "other_unlisted" or x["id"] in vals["drug_or_procedure"]: continue
        for term in [x["id"].replace("_", " ")] + x.get("aliases", []):
            if _term_regex(term).search(text):
                w("missed_alias", f"text mentions '{term}' but drug_or_procedure lacks '{x['id']}'"); break

    flagged_by_ai = out["needs_review"]
    if R and not flagged_by_ai:
        w("forced_review", "labeler did not flag this record; code forced it into review")
    status = "needs_review" if (R or flagged_by_ai or out["confidence"] != "high") else "ai_checked"
    return {"status": status, "errors": E, "reviews": R, "warnings": W}


# ------------------------------------------------------------------ compare / eval
def label_sets(out):
    return {fid: ({x["value"] for x in v} if isinstance(v, list) else {v["value"]}) for fid, v in out["labels"].items()}

def compare_runs(a_rows, b_rows):
    A, B = {r["input"]["rec_id"]: r for r in a_rows}, {r["input"]["rec_id"]: r for r in b_rows}
    diffs, agree = [], 0
    for rid in sorted(set(A) & set(B)):
        try: sa, sb = label_sets(A[rid]["output"]), label_sets(B[rid]["output"])
        except Exception: diffs.append({"rec_id": rid, "facet": "*", "a": "unreadable", "b": "unreadable"}); continue
        bad = [f for f in sa if sa[f] != sb.get(f)]
        for f in bad: diffs.append({"rec_id": rid, "facet": f, "a": sorted(sa[f]), "b": sorted(sb.get(f, []))})
        agree += not bad
    return {"records_compared": len(set(A) & set(B)), "records_identical": agree, "diffs": diffs,
            "only_in_a": sorted(set(A) - set(B)), "only_in_b": sorted(set(B) - set(A))}

def eval_gold(gold, pred_rows, ont):
    P = {r["input"]["rec_id"]: r for r in pred_rows}
    fac = {f: {"n": 0, "exact": 0, "tp": 0, "fp": 0, "fn": 0, "silent": 0} for f in ont["facets"]}
    silent_records, missing, n = 0, [], 0
    for g in gold:
        rid = g["input"]["rec_id"]
        if rid not in P: missing.append(rid); continue
        n += 1
        pr = P[rid]
        v = validate_record(pr["input"], pr["output"], ont)
        flagged = v["status"] in ("needs_review", "reject")
        try: ps = label_sets(pr["output"])
        except Exception: ps = {}
        gs = label_sets(g["expected_output"])
        rec_bad = False
        for f in fac:
            a, b = gs.get(f, set()), ps.get(f, set())
            fac[f]["n"] += 1; fac[f]["exact"] += a == b
            fac[f]["tp"] += len(a & b); fac[f]["fp"] += len(b - a); fac[f]["fn"] += len(a - b)
            if a != b:
                rec_bad = True
                if not flagged: fac[f]["silent"] += 1
        silent_records += rec_bad and not flagged
    return {"records": n, "missing_predictions": missing, "silent_error_records": silent_records, "facets": fac}


# ------------------------------------------------------------------ API runner (Gemini default + Anthropic fallback)
def run_api_gemini(inputs, model, system_prompt, schema, limit=None):
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("Set GEMINI_API_KEY in environment before calling run with --provider gemini")
    gemini_schema = sanitize_schema_for_gemini(schema)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    rows = []
    for inp in inputs[:limit]:
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": json.dumps(model_view(inp), ensure_ascii=False)}]}],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json",
                "responseSchema": gemini_schema,
            },
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                text_out = (
                    body.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "{}")
                )
                out = json.loads(text_out)
        except Exception as err:
            print(f"error labeling {inp.get('rec_id')}: {err}", file=sys.stderr)
            out = None
        rows.append({"input": inp, "output": out, "model": model})
        print("labeled (gemini)", inp["rec_id"], file=sys.stderr)
    return rows


def run_api_anthropic(inputs, model, system_prompt, schema, limit=None):
    try:
        import anthropic
    except ImportError:
        sys.exit("Install the SDK first:  pip install anthropic   (and set ANTHROPIC_API_KEY)")
    client = anthropic.Anthropic()
    tool_schema = {k: v for k, v in schema.items() if k not in ("$schema", "$id", "title")}
    tool = {"name": "submit_labels", "description": "Submit the labels for the recommendation.", "input_schema": tool_schema}
    rows = []
    for inp in inputs[:limit]:
        msg = client.messages.create(model=model, max_tokens=2500, temperature=0, system=system_prompt, tools=[tool],
                                     tool_choice={"type": "tool", "name": "submit_labels"},
                                     messages=[{"role": "user", "content": json.dumps(model_view(inp), ensure_ascii=False)}])
        out = next((b.input for b in msg.content if getattr(b, "type", "") == "tool_use"), None)
        rows.append({"input": inp, "output": out, "model": model})
        print("labeled (anthropic)", inp["rec_id"], file=sys.stderr)
    return rows


def run_api(inputs, model, system_prompt, schema, limit=None, provider="gemini"):
    if provider == "anthropic" or (model and "claude" in model.lower()):
        return run_api_anthropic(inputs, model, system_prompt, schema, limit)
    return run_api_gemini(inputs, model, system_prompt, schema, limit)


# ------------------------------------------------------------------ selftest
def selftest(d):
    ont, ex = load_json(paths(d)["ontology"]), load_json(paths(d)["examples"])
    exs = ex["examples"]
    fails = 0
    def check(name, ok):
        nonlocal fails
        print(("PASS " if ok else "FAIL ") + name); fails += (not ok)

    # 1. gold examples behave as designed
    for e in exs:
        v = validate_record(e["input"], e["expected_output"], ont)
        want = "needs_review" if e["input"]["rec_id"].startswith("DEMO") else "ai_checked"
        check(f"example {e['input']['rec_id']} -> {want} (got {v['status']}, E={[x['code'] for x in v['errors']]}, R={[x['code'] for x in v['reviews']]})", v["status"] == want)

    base = {e["input"]["rec_id"]: e for e in exs}
    ped, img, gli = (base[k] for k in ("AHA2026-AIS-prehospital-01", "AHA2026-AIS-imaging-02", "AHA2026-AIS-swelling-GLI"))
    U = {"value": "unspecified", "evidence_span": None, "source": None}

    def mut(src, fn):
        e = copy.deepcopy(src); fn(e["expected_output"]); return validate_record(e["input"], e["expected_output"], ont)
    def has(v, level, code): return any(x["code"] == code for x in v[level])
    tests = [
        ("enum outside ontology -> ERROR enum", ped, lambda o: o["labels"]["condition"][0].update(value="stroke_xyz"), "errors", "enum", "reject"),
        ("fabricated evidence -> ERROR span_not_found", img, lambda o: o["labels"]["drug_or_procedure"][0].update(evidence_span="MRI/MRX"), "errors", "span_not_found", "reject"),
        ("span from wrong source -> ERROR span_not_found", ped, lambda o: o["labels"]["phase"][0].update(source="parent_context"), "errors", "span_not_found", "reject"),
        ("AI outputs COR -> ERROR extra_key", ped, lambda o: o.update(cor="2b"), "errors", "extra_key", "reject"),
        ("rec_id changed -> ERROR rec_id_mismatch", ped, lambda o: o.update(rec_id="X"), "errors", "rec_id_mismatch", "reject"),
        ("facet removed -> ERROR missing_facet", ped, lambda o: o["labels"].pop("phase"), "errors", "missing_facet", "reject"),
        ("duplicate value -> ERROR duplicate_value", ped, lambda o: o["labels"]["condition"].append(copy.deepcopy(o["labels"]["condition"][0])), "errors", "duplicate_value", "reject"),
        ("unspecified mixed -> ERROR unspecified_mixed", ped, lambda o: o["labels"]["condition"].insert(0, dict(U)), "errors", "unspecified_mixed", "reject"),
        ("needs_review without reason -> ERROR", ped, lambda o: o.update(needs_review=True), "errors", "review_reasons_missing", "reject"),
        ("direction flipped vs COR 3 -> REVIEW cor_direction", gli, lambda o: o["labels"]["direction"].update(value="for"), "reviews", "cor_direction", "needs_review"),
        ("direction flipped vs wording -> REVIEW wording_conflict", gli, lambda o: o["labels"]["direction"].update(value="for"), "reviews", "wording_conflict", "needs_review"),
        ("pediatric text, age lost -> REVIEW pediatric_missing", ped, lambda o: o["labels"].update(age_group=[dict(U)]), "reviews", "pediatric_missing", "needs_review"),
        ("low confidence unflagged -> REVIEW low_confidence", ped, lambda o: o.update(confidence="low"), "reviews", "low_confidence", "needs_review"),
        ("other_unlisted unflagged -> REVIEW other_value_used", img, lambda o: o["labels"]["drug_or_procedure"].append({"value": "other_unlisted", "evidence_span": "MRI/MRA", "source": "text"}), "reviews", "other_value_used", "needs_review"),
        ("drug dropped -> WARN missed_alias", img, lambda o: o["labels"]["drug_or_procedure"].pop(1), "warnings", "missed_alias", "ai_checked"),
        ("double space in span -> WARN span_normalized (not reject)", ped, lambda o: o["labels"]["phase"][0].update(evidence_span="transported  by ambulance"), "warnings", "span_normalized", "ai_checked"),
    ]
    for name, src, fn, level, code, status in tests:
        v = mut(src, fn)
        check(f"{name} [status={v['status']}]", has(v, level, code) and v["status"] == status)

    # 2. compare + eval
    a = [{"input": e["input"], "output": e["expected_output"]} for e in exs]
    b = copy.deepcopy(a); b[3]["output"]["labels"]["direction"]["value"] = "against"
    c = compare_runs(a, b)
    check("compare finds the one differing facet", len(c["diffs"]) == 1 and c["diffs"][0]["facet"] == "direction")
    ev = eval_gold(exs, a, ont)
    check("eval on identical labels: 0 silent errors, all exact", ev["silent_error_records"] == 0 and all(f["exact"] == f["n"] for f in ev["facets"].values()))
    bad = copy.deepcopy(a); bad[0]["output"]["labels"]["phase"][0]["value"] = "rehabilitation"; bad[0]["output"]["labels"]["phase"][0]["evidence_span"] = "transported by ambulance"
    ev = eval_gold(exs, bad, ont)
    check("eval counts a wrong, unflagged phase as a SILENT error", ev["silent_error_records"] == 1 and ev["facets"]["phase"]["silent"] == 1)

    # 3. prompt renders & Gemini schema sanitizer works
    s, ver = render_prompt(d)
    check(f"prompt renders (version {ver}, {len(s)} chars, no leftover placeholders)", "{{" not in s and len(s) > 5000)
    check("COR/LOE are NOT shown to the model in examples", '"cor"' not in s and '"loe"' not in s)
    gen_schema = build_output_schema(ont)
    gem_schema = sanitize_schema_for_gemini(gen_schema)
    check("Gemini schema sanitizer removes $schema/allOf and sets nullable", "$schema" not in gem_schema and gem_schema["type"] == "OBJECT")
    print("\nALL PASSED" if not fails else f"\n{fails} FAILED")
    return fails


# ------------------------------------------------------------------ cli
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=str(HERE))
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("selftest")
    x = sp.add_parser("render-prompt"); x.add_argument("--out")
    x = sp.add_parser("build-schema"); x.add_argument("--out")
    x = sp.add_parser("run"); x.add_argument("--in", dest="inp", required=True); x.add_argument("--out", required=True)
    x.add_argument("--provider", choices=["gemini", "anthropic"], default=os.environ.get("LABELER_PROVIDER", "gemini"))
    x.add_argument("--model", default=os.environ.get("LABELER_MODEL", "gemini-2.5-flash")); x.add_argument("--limit", type=int)
    x = sp.add_parser("validate"); x.add_argument("--in", dest="inp", required=True); x.add_argument("--report")
    x = sp.add_parser("compare"); x.add_argument("--a", required=True); x.add_argument("--b", required=True)
    x = sp.add_parser("eval"); x.add_argument("--pred", required=True); x.add_argument("--gold")
    a = ap.parse_args()
    p = paths(a.dir)

    if a.cmd == "selftest": sys.exit(1 if selftest(a.dir) else 0)
    if a.cmd == "render-prompt":
        s, ver = render_prompt(a.dir)
        if a.out:
            with open(a.out, "w", encoding="utf-8") as f:
                f.write(s)
            print(f"wrote {a.out} (prompt_version {ver}, {len(s)} chars)")
        else: print(s)
        return
    if a.cmd == "build-schema":
        ont = load_json(p["ontology"])
        sch = build_output_schema(ont)
        out_path = a.out or str(p["schema"])
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(sch, f, ensure_ascii=False, indent=2)
        print(f"wrote schema to {out_path} (ontology_version {ont['ontology_version']})")
        return

    ont = load_json(p["ontology"])
    if a.cmd == "run":
        s, ver = render_prompt(a.dir)
        rows = run_api(load_jsonl(a.inp), a.model, s, load_json(p["schema"]), a.limit, provider=a.provider)
        for r in rows: r["prompt_version"] = ver
        dump_jsonl(a.out, rows); print(f"wrote {len(rows)} records to {a.out} (provider {a.provider}, model {a.model}, prompt_version {ver})")
    elif a.cmd == "validate":
        rows, rep, counts = load_jsonl(a.inp), [], {}
        for r in rows:
            v = validate_record(r["input"], r["output"], ont)
            counts[v["status"]] = counts.get(v["status"], 0) + 1
            rep.append({"rec_id": r["input"]["rec_id"], **v})
            codes = [f"{lvl[0].upper()}:{c['code']}" for lvl in ("errors", "reviews", "warnings") for c in v[lvl]]
            print(f"{v['status']:<13} {r['input']['rec_id']:<34} {' '.join(codes)}")
        print("\nsummary:", counts)
        if a.report:
            with open(a.report, "w", encoding="utf-8") as f:
                json.dump(rep, f, ensure_ascii=False, indent=2)
        sys.exit(1 if counts.get("reject") else 0)
    elif a.cmd == "compare":
        c = compare_runs(load_jsonl(a.a), load_jsonl(a.b))
        print(f"compared {c['records_compared']} records, identical {c['records_identical']}")
        for dd in c["diffs"]: print(f"  DIFF {dd['rec_id']} {dd['facet']}: A={dd['a']} B={dd['b']}")
        print("Disagreement = send to human review.")
    elif a.cmd == "eval":
        gold = load_json(a.gold or p["examples"])["examples"]
        ev = eval_gold(gold, load_jsonl(a.pred), ont)
        print(f"records evaluated: {ev['records']}  missing predictions: {len(ev['missing_predictions'])}")
        print(f"{'facet':<20}{'exact':>8}{'prec':>8}{'recall':>8}{'silent':>8}")
        for f, m in ev["facets"].items():
            pr = m["tp"] / (m["tp"] + m["fp"]) if m["tp"] + m["fp"] else 1.0
            rc = m["tp"] / (m["tp"] + m["fn"]) if m["tp"] + m["fn"] else 1.0
            ex = m["exact"] / m["n"] if m["n"] else 0.0
            print(f"{f:<20}{ex:>7.1%}{pr:>8.1%}{rc:>8.1%}{m['silent']:>8}")
        print(f"\nSILENT ERROR RECORDS (wrong & unflagged — target is 0): {ev['silent_error_records']}")
        sys.exit(1 if ev["silent_error_records"] else 0)


if __name__ == "__main__":
    main()
