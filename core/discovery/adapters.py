import hashlib
import re
import socket
import ssl
from typing import List, Dict, Any, Optional
import requests
from bs4 import BeautifulSoup
from core.common.contracts import DiscoveredGuideline

# Ép buộc dùng IPv4
try:
    _orig_getaddrinfo = socket.getaddrinfo
    def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    socket.getaddrinfo = _ipv4_getaddrinfo
except Exception:
    pass

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36 NeuroGuide-Indexer/1.0"
)


def _gen_candidate_id(title: str, url: str) -> str:
    slug = re.sub(r"[^\w]", "", title.lower())[:20]
    hash_str = hashlib.sha256(url.encode("utf-8")).hexdigest()[:8]
    return f"disc_{slug}_{hash_str}"


def _extract_year(text: str) -> Optional[int]:
    matches = re.findall(r"\b(201\d|202\d)\b", text)
    if matches:
        return int(matches[-1])
    return None


class HtmlDirectoryAdapter:
    """Adapter cào trực tiếp danh mục guideline từ các trang HTML mở của hội chuyên khoa."""

    def __init__(self, timeout: int = 25):
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    def fetch_guidelines(
        self,
        source_key: str,
        config: Dict[str, Any],
        limit: int = 10,
        year_min: int = 2018,
    ) -> List[DiscoveredGuideline]:
        results: List[DiscoveredGuideline] = []
        url = config.get("url")
        if not url:
            return results

        try:
            resp = requests.get(url, headers=self.headers, timeout=self.timeout, verify=False, allow_redirects=True)
            if resp.status_code != 200:
                return results

            soup = BeautifulSoup(resp.text, "html.parser")
            seen_titles = set()

            for a in soup.find_all("a", href=True):
                txt = " ".join(a.get_text().split()).strip()
                href = a["href"].strip()

                if len(txt) < 15 or txt.lower() in seen_titles:
                    continue

                # Kiểm tra xem có chứa từ khóa liên quan đến hướng dẫn lâm sàng không
                is_match = False
                patterns = config.get("link_patterns", ["guideline"])
                for pat in patterns:
                    if re.search(pat, txt, re.IGNORECASE) or re.search(pat, href, re.IGNORECASE):
                        is_match = True
                        break

                if not is_match:
                    continue

                full_url = href
                if href.startswith("/"):
                    base_domain = re.match(r"^https?://[^/]+", url)
                    if base_domain:
                        full_url = base_domain.group(0) + href

                year = _extract_year(txt) or _extract_year(href)
                if year and year < year_min:
                    continue

                seen_titles.add(txt.lower())
                cand_id = _gen_candidate_id(txt, full_url)

                results.append(
                    DiscoveredGuideline(
                        guideline_id_candidate=cand_id,
                        title=txt,
                        society=config.get("name", source_key),
                        year=year,
                        source_url=full_url,
                        category=config.get("category"),
                        adapter_used="HTML_DIRECTORY",
                        is_new=True,
                    )
                )

                if len(results) >= limit:
                    break

        except Exception:
            pass

        return results


class PubmedSocietyAdapter:
    """Adapter truy vấn NCBI E-utilities API cho các tạp chí bị WAF (Wiley, NICE)."""

    def __init__(self, timeout: int = 25):
        self.timeout = timeout

    def fetch_guidelines(
        self,
        source_key: str,
        config: Dict[str, Any],
        limit: int = 10,
        year_min: int = 2018,
    ) -> List[DiscoveredGuideline]:
        results: List[DiscoveredGuideline] = []
        raw_query = config.get("query")
        if not raw_query:
            return results

        # Thêm ràng buộc năm vào query PubMed
        query = f"({raw_query}) AND ({year_min}:3000[Date - Publication])"

        try:
            # 1. ESearch: lấy danh sách PMIDs
            esearch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            params = {
                "db": "pubmed",
                "term": query,
                "retmode": "json",
                "retmax": limit,
                "sort": "pub_date",
            }
            s_resp = requests.get(esearch_url, params=params, timeout=self.timeout)
            if s_resp.status_code != 200:
                return results

            id_list = s_resp.json().get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return results

            # 2. ESummary: lấy chi tiết metadata
            esummary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            sum_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "json",
            }
            sum_resp = requests.get(esummary_url, params=sum_params, timeout=self.timeout)
            if sum_resp.status_code != 200:
                return results

            result_dict = sum_resp.json().get("result", {})
            for pmid in id_list:
                item = result_dict.get(pmid)
                if not item:
                    continue

                title = item.get("title", "").strip().rstrip(".")
                pubdate = item.get("pubdate", "")
                year = _extract_year(pubdate)

                # Tìm DOI
                doi = None
                for aid in item.get("articleids", []):
                    if aid.get("idtype") == "doi":
                        doi = aid.get("value")
                        break

                url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                cand_id = f"pmid_{pmid}"

                results.append(
                    DiscoveredGuideline(
                        guideline_id_candidate=cand_id,
                        title=title,
                        society=config.get("name", source_key),
                        year=year,
                        source_url=url,
                        doi=doi,
                        category=config.get("category"),
                        adapter_used="PUBMED_API",
                        is_new=True,
                    )
                )

        except Exception:
            pass

        return results
