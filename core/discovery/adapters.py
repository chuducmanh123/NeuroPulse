import hashlib
import re
import socket
from typing import List, Dict, Any, Optional
import requests
from bs4 import BeautifulSoup
from core.common.contracts import DiscoveredGuideline, FullTextAvailability

# Ép buộc dùng IPv4 để tránh nghẽn timeout trên các mạng Dual Stack
try:
    _orig_getaddrinfo = socket.getaddrinfo
    def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    socket.getaddrinfo = _ipv4_getaddrinfo
except Exception:
    pass

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36 NeuroGuide-Academic-Indexer/2.0"
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


def _extract_doi_from_text(text: str) -> Optional[str]:
    """Tìm mã DOI chuẩn 10.xxxx/... trong chuỗi ký tự."""
    match = re.search(r"\b(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)\b", text)
    if match:
        doi = match.group(1).rstrip(".,;)")
        return doi
    return None


def derive_direct_pdf_url(url: str, doi: Optional[str] = None) -> Optional[str]:
    """
    Suy luận hoặc chuyển đổi URL trang đích bài báo khoa học thành URL tải file PDF toàn văn trực tiếp.
    Hỗ trợ các nhà xuất bản y khoa lớn: AHA/ASA, SAGE (ESO), Springer, Wiley, PMC.
    """
    if not url:
        return None
    url_clean = url.strip()

    # 1. Đã là file PDF trực tiếp
    if url_clean.lower().endswith(".pdf") or ".pdf?" in url_clean.lower():
        return url_clean

    # 2. PubMed Central (PMC)
    pmc_match = re.search(r"PMC\d+", url_clean, re.IGNORECASE)
    if pmc_match:
        pmcid = pmc_match.group(0).upper()
        return f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/"

    # 3. American Heart Association (AHA / Stroke)
    if "ahajournals.org/doi/" in url_clean:
        # e.g., https://www.ahajournals.org/doi/10.1161/STR.0000000000000513 -> /doi/pdf/10.1161/...
        pdf_url = re.sub(r"/doi/(full|abs|epub)/", "/doi/pdf/", url_clean)
        if "/doi/pdf/" not in pdf_url:
            pdf_url = pdf_url.replace("/doi/", "/doi/pdf/")
        return pdf_url

    # 4. SAGE Journals (ESO - European Stroke Journal)
    if "journals.sagepub.com/doi/" in url_clean:
        pdf_url = re.sub(r"/doi/(full|abs|epub)/", "/doi/pdf/", url_clean)
        if "/doi/pdf/" not in pdf_url:
            pdf_url = pdf_url.replace("/doi/", "/doi/pdf/")
        return pdf_url

    # 5. Springer (Neurocritical Care - NCS)
    if "link.springer.com/article/" in url_clean:
        return url_clean.replace("/article/", "/content/pdf/") + ".pdf"

    # 6. Wiley Online Library
    if "onlinelibrary.wiley.com/doi/" in url_clean:
        pdf_url = re.sub(r"/doi/(full|abs|epdf)/", "/doi/pdfdirect/", url_clean)
        if "/doi/pdfdirect/" not in pdf_url:
            pdf_url = pdf_url.replace("/doi/", "/doi/pdfdirect/")
        return pdf_url

    return None


def resolve_doi_crossref(doi: str, timeout: int = 8) -> Dict[str, Any]:
    """
    Truy vấn Crossref REST API mở để lấy metadata chính thức và link toàn văn của bài báo qua DOI.
    """
    if not doi:
        return {}
    doi_clean = doi.strip()
    api_url = f"https://api.crossref.org/works/{doi_clean}"
    headers = {
        "User-Agent": "NeuroGuide-Academic/2.0 (mailto:developer@neuropulse.org)",
        "Accept": "application/json",
    }
    try:
        resp = requests.get(api_url, headers=headers, timeout=timeout, verify=False)
        if resp.status_code == 200:
            msg = resp.json().get("message", {})
            title = msg.get("title", [""])[0] if msg.get("title") else None
            links = msg.get("link", [])
            pdf_url = None
            for l in links:
                if "pdf" in l.get("content-type", "").lower():
                    pdf_url = l.get("URL")
                    break
            primary_url = msg.get("resource", {}).get("primary", {}).get("URL") or msg.get("URL")
            return {
                "title": title,
                "primary_url": primary_url,
                "pdf_url": pdf_url,
                "publisher": msg.get("publisher"),
            }
    except Exception:
        pass
    return {}


class HtmlDirectoryAdapter:
    """Adapter cào danh mục guideline từ các trang HTML mở của hội chuyên khoa."""

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

                # Tìm DOI và suy luận link PDF
                doi = _extract_doi_from_text(full_url) or _extract_doi_from_text(txt)
                direct_pdf = derive_direct_pdf_url(full_url, doi)

                # Đánh giá khả năng bài toàn văn
                if direct_pdf:
                    avail = FullTextAvailability.DIRECT_PDF_AVAILABLE
                elif doi:
                    avail = FullTextAvailability.OPEN_ACCESS_UNPAYWALL
                else:
                    avail = FullTextAvailability.ABSTRACT_ONLY

                results.append(
                    DiscoveredGuideline(
                        guideline_id_candidate=cand_id,
                        title=txt,
                        society=config.get("name", source_key),
                        year=year,
                        source_url=full_url,
                        pdf_url=direct_pdf,
                        direct_pdf_url=direct_pdf,
                        doi=doi,
                        full_text_availability=avail,
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
    """Adapter truy vấn NCBI E-utilities API với trích xuất PMC ID và link bài toàn văn."""

    def __init__(self, timeout: int = 25):
        self.timeout = timeout
        self.headers = {
            "User-Agent": USER_AGENT,
        }

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
                "tool": "NeuroGuideAcademic",
                "email": "developer@neuropulse.org",
            }
            s_resp = requests.get(esearch_url, params=params, headers=self.headers, timeout=self.timeout, verify=False)
            if s_resp.status_code != 200:
                return results

            id_list = s_resp.json().get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return results

            # 2. ESummary: lấy chi tiết metadata & articleids (DOI, PMC)
            esummary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            sum_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "json",
                "tool": "NeuroGuideAcademic",
                "email": "developer@neuropulse.org",
            }
            sum_resp = requests.get(esummary_url, params=sum_params, headers=self.headers, timeout=self.timeout, verify=False)
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

                # Trích xuất DOI và PMC ID từ articleids
                doi = None
                pmcid = None
                for aid in item.get("articleids", []):
                    id_type = aid.get("idtype", "").lower()
                    if id_type == "doi":
                        doi = aid.get("value")
                    elif id_type == "pmc":
                        pmcid = aid.get("value")

                direct_pdf = None
                avail = FullTextAvailability.ABSTRACT_ONLY

                # Nếu có PMC ID -> Toàn văn miễn phí 100%
                if pmcid:
                    direct_pdf = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/pdf/"
                    avail = FullTextAvailability.OPEN_ACCESS_PMC
                elif doi:
                    # Thử suy luận link PDF từ DOI
                    direct_pdf = derive_direct_pdf_url(f"https://doi.org/{doi}", doi)
                    if direct_pdf:
                        avail = FullTextAvailability.DIRECT_PDF_AVAILABLE
                    else:
                        avail = FullTextAvailability.OPEN_ACCESS_UNPAYWALL

                url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                cand_id = f"pmid_{pmid}"

                results.append(
                    DiscoveredGuideline(
                        guideline_id_candidate=cand_id,
                        title=title,
                        society=config.get("name", source_key),
                        year=year,
                        source_url=url,
                        pdf_url=direct_pdf,
                        direct_pdf_url=direct_pdf,
                        doi=doi,
                        pmcid=pmcid,
                        full_text_availability=avail,
                        category=config.get("category"),
                        adapter_used="PUBMED_API",
                        is_new=True,
                    )
                )

        except Exception:
            pass

        return results
