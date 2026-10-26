import html
import json
import os
import re
import socket
import ssl
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Force IPv4 to avoid read timeouts on Windows
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_getaddrinfo

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeuroPulseCaseFetcher/2.5"
}

FIGURES_DIR = os.path.join("public", "data", "figures")
CASES_JSON_PATH = os.path.join("public", "data", "cases.json")


def clean_xml_text(elem) -> str:
    if elem is None:
        return ""
    raw = "".join(elem.itertext())
    raw = html.unescape(raw)
    return re.sub(r"\s+", " ", raw).strip()


def fetch_url_bytes(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return resp.read()


def search_pmc_case_with_figures(query: str, max_results: int = 12):
    """Search Europe PMC for Open Access case reports with full text XML and extract real figures."""
    encoded_q = urllib.parse.quote(f"{query} AND OPEN_ACCESS:y AND HAS_FT:y")
    api_url = (
        f"https://www.ebi.ac.uk/europepmc/webservices/rest/search"
        f"?query={encoded_q}&format=json&pageSize={max_results}&resultType=core"
    )
    data = json.loads(fetch_url_bytes(api_url).decode("utf-8"))
    results = data.get("resultList", {}).get("result", [])

    for item in results:
        pmcid = item.get("pmcid")
        doi = item.get("doi", "")
        pmid = item.get("pmid", "")
        title = item.get("title", "").rstrip(".")
        journal_title = item.get("journalInfo", {}).get("journal", {}).get("title", "PubMed Central")
        pub_year = str(item.get("pubYear", "2024"))

        if not pmcid:
            continue

        try:
            xml_url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"
            xml_bytes = fetch_url_bytes(xml_url, timeout=20)
            root = ET.fromstring(xml_bytes)
        except Exception:
            continue

        figures = []
        for fig in root.findall(".//fig"):
            label_el = fig.find("label")
            caption_el = fig.find("caption")
            graphic_el = fig.find(".//graphic")
            if graphic_el is None:
                continue

            href = ""
            for k, v in graphic_el.attrib.items():
                if k.endswith("href"):
                    href = v
                    break
            if not href:
                continue

            if not href.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
                href_jpg = f"{href}.jpg"
            else:
                href_jpg = href

            label_text = clean_xml_text(label_el) or "Figure 1"
            caption_text = clean_xml_text(caption_el)
            if len(caption_text) < 25:
                continue

            remote_img_url = f"https://europepmc.org/articles/{pmcid}/bin/{href_jpg}"
            figures.append({
                "pmcid": pmcid,
                "doi": doi,
                "pmid": pmid,
                "article_title": title,
                "journal_title": journal_title,
                "pub_year": pub_year,
                "figure_label": label_text,
                "caption": caption_text,
                "remote_img_url": remote_img_url,
                "href_jpg": href_jpg,
            })

        if figures:
            # Verify and download the first 1-2 figures locally so the browser loads them instantaneously
            os.makedirs(FIGURES_DIR, exist_ok=True)
            verified_figs = []
            for fig_info in figures[:2]:
                safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", f"{pmcid}_{fig_info['href_jpg']}")
                local_rel_path = f"/data/figures/{safe_name}"
                local_fs_path = os.path.join(FIGURES_DIR, safe_name)
                try:
                    img_bytes = fetch_url_bytes(fig_info["remote_img_url"], timeout=20)
                    if len(img_bytes) > 2500:
                        with open(local_fs_path, "wb") as f:
                            f.write(img_bytes)
                        fig_info["local_url"] = local_rel_path
                        verified_figs.append(fig_info)
                except Exception:
                    continue

            if verified_figs:
                return verified_figs

    return []


if __name__ == "__main__":
    TOPICS = [
        ("basilar_occlusion", 'TITLE:"basilar artery occlusion" AND (CT OR CTA OR MRI OR thrombectomy) AND "case"'),
        ("wallenberg", '(TITLE:"Wallenberg" OR TITLE:"lateral medullary") AND MRI AND "case"'),
        ("nmda_encephalitis", 'TITLE:"NMDA receptor encephalitis" AND (MRI OR EEG) AND "case"'),
        ("caa_ich", 'TITLE:"cerebral amyloid angiopathy" AND ("superficial siderosis" OR "microbleeds" OR "MSP" OR MRI) AND "case"'),
        ("myasthenic_crisis", 'TITLE:"myasthenic crisis" AND (CT OR thymoma OR radiograph) AND "case"'),
        ("ncse_eeg", 'TITLE:"nonconvulsive status epilepticus" AND EEG AND "case"'),
        ("rcvs_dsa", 'TITLE:"reversible cerebral vasoconstriction syndrome" AND (angiography OR MRA OR CTA OR MRI) AND "case"'),
        ("msa_hotcrossbun", 'TITLE:"hot cross bun" AND "multiple system atrophy" AND MRI'),
    ]

    extracted = {}
    for key, q in TOPICS:
        print(f"Searching PMC Open Access figures for: {key} ...")
        figs = search_pmc_case_with_figures(q)
        if figs:
            print(f"  -> Found {len(figs)} figure(s) from {figs[0]['pmcid']} ({figs[0]['journal_title']})")
            extracted[key] = figs
        else:
            print(f"  -> No figure found for {key}")

    with open(os.path.join("public", "data", "pmc_extracted_figures.json"), "w", encoding="utf-8") as f:
        json.dump(extracted, f, indent=2, ensure_ascii=False)
    print("Done.")
