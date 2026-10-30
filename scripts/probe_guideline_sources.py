import os
import re
import socket
import ssl
import json
import urllib3
import requests
from bs4 import BeautifulSoup

# Vô hiệu hóa cảnh báo SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Ép buộc dùng IPv4
try:
    _orig_getaddrinfo = socket.getaddrinfo
    def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    socket.getaddrinfo = _ipv4_getaddrinfo
except Exception:
    pass

SOURCES = [
    {
        "society": "ESO (European Stroke Organisation)",
        "url": "https://eso-stroke.org/guidelines/eso-guideline-directory",
        "category": "Stroke",
    },
    {
        "society": "AHA/ASA (Heart & Stroke)",
        "url": "https://professional.heart.org/en/guidelines-statements",
        "category": "Cardio & Stroke",
    },
    {
        "society": "NCS (Neurocritical Care Society)",
        "url": "https://www.neurocriticalcare.org/Resources-Publications/Neurocritical-Care-Guidelines",
        "category": "Neurocritical Care",
    },
    {
        "society": "Springer - Neurocritical Care Journal",
        "url": "https://link.springer.com/journal/12028",
        "category": "Neurocritical Care",
    },
    {
        "society": "ILAE (Epilepsy Definition & Classification)",
        "url": "https://www.ilae.org/guidelines/definition-and-classification",
        "category": "Epilepsy",
    },
    {
        "society": "ILAE (Guidelines and Reports)",
        "url": "https://www.ilae.org/guidelines/guidelines-and-reports",
        "category": "Epilepsy",
    },
    {
        "society": "AES (American Epilepsy Society)",
        "url": "https://aesnet.org/clinical-care/clinical-guidance/guidelines",
        "category": "Epilepsy",
    },
    {
        "society": "NICE (UK Guidelines)",
        "url": "https://www.nice.org.uk/guidance/",
        "category": "General & Neuro",
    },
    {
        "society": "Alzheimer's & Dementia (Wiley)",
        "url": "https://alz-journals.onlinelibrary.wiley.com/",
        "category": "Dementia",
    },
    {
        "society": "AAN (American Academy of Neurology)",
        "url": "https://www.aan.com/guidelines/home/allguidelines",
        "category": "General Neurology",
    },
    {
        "society": "EAN (European Academy of Neurology)",
        "url": "https://www.ean.org/research/ean-guidelines/guideline-reference-center",
        "category": "General Neurology",
    },
    {
        "society": "PNS (Peripheral Nerve Society)",
        "url": "https://pnsociety.com/resources/guidelines/",
        "category": "Peripheral Nerve",
    },
    {
        "society": "AHS (American Headache Society)",
        "url": "https://americanheadachesociety.org/resources/clinicians/guidelines",
        "category": "Headache",
    },
    {
        "society": "MDS (Movement Disorders - Wiley)",
        "url": "https://movementdisorders.onlinelibrary.wiley.com/journal/23301619",
        "category": "Movement Disorders",
    },
]

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def probe_source(src):
    url = src["url"]
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    result = {
        "society": src["society"],
        "url": url,
        "category": src["category"],
        "status_code": None,
        "can_access": False,
        "is_waf_blocked": False,
        "sample_guidelines_found": [],
        "notes": "",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=25, verify=False, allow_redirects=True)
        result["status_code"] = resp.status_code
        text = resp.text

        # Kiểm tra WAF / Cloudflare block
        if resp.status_code in (403, 503) or "Attention Required! | Cloudflare" in text or "Just a moment..." in text:
            result["is_waf_blocked"] = True
            result["notes"] = "Bị chặn bởi Cloudflare/WAF (403/503)"
            return result

        if resp.status_code == 200:
            result["can_access"] = True
            # Thử parse các link/tiêu đề liên quan guideline
            soup = BeautifulSoup(text, "html.parser")
            found_titles = []

            # 1. Quét thẻ <a> có text hoặc href liên quan guideline/recommendation
            for a in soup.find_all("a", href=True):
                txt = a.get_text().strip()
                href = a["href"]
                if len(txt) > 15:
                    if any(kw in txt.lower() for kw in ["guideline", "consensus", "recommendation", "statement", "management", "treatment", "criteria"]):
                        found_titles.append(txt)
                        if len(found_titles) >= 5:
                            break

            # 2. Nếu tìm thẻ h1, h2, h3
            if not found_titles:
                for h in soup.find_all(["h2", "h3", "h4"]):
                    htxt = h.get_text().strip()
                    if len(htxt) > 15 and any(kw in htxt.lower() for kw in ["guideline", "statement", "consensus", "practice"]):
                        found_titles.append(htxt)
                        if len(found_titles) >= 5:
                            break

            result["sample_guidelines_found"] = found_titles
            result["notes"] = f"Truy cập thành công ({len(text)} bytes, tìm thấy {len(found_titles)} tựa đề mẫu)"
        else:
            result["notes"] = f"HTTP {resp.status_code}"

    except requests.exceptions.Timeout:
        result["notes"] = "Timeout (>25s)"
    except Exception as e:
        result["notes"] = f"Lỗi kết nối: {str(e)[:100]}"

    return result


def main():
    print(f"[*] Bắt đầu kiểm tra {len(SOURCES)} nguồn URL chuyên mục thần kinh...\n")
    results = []
    for idx, s in enumerate(SOURCES):
        print(f"[{idx+1}/{len(SOURCES)}] Đang kiểm tra: {s['society']} ({s['url']})...")
        r = probe_source(s)
        results.append(r)
        status_sym = "[OK]" if r["can_access"] else "[CHẶN/LỖI]"
        print(f"    -> {status_sym} Status: {r['status_code']} | Ghi chú: {r['notes']}")
        if r["sample_guidelines_found"]:
            for sample in r["sample_guidelines_found"][:2]:
                print(f"       * Mẫu: {sample[:80]}...")

    # Lưu kết quả kiểm tra dạng JSON
    out_path = "data/sources_probe_result.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n[+] Đã lưu báo cáo chi tiết vào: {out_path}")


if __name__ == "__main__":
    main()
