from typing import Dict, Any, List

# Cấu hình danh mục 12 hiệp hội & tạp chí thần kinh hàng đầu
DISCOVERY_SOURCES: Dict[str, Dict[str, Any]] = {
    "AHA_ASA": {
        "name": "American Heart Association / American Stroke Association",
        "category": "Stroke",
        "adapter": "PUBMED_API",
        "query": '("Stroke"[Journal] OR "Circulation"[Journal]) AND ("American Heart Association" OR "American Stroke Association") AND ("guideline" OR "guidelines")',
        "epmc_query": 'TITLE:"Guideline" AND (JOURNAL:"Stroke" OR JOURNAL:"Circulation") AND ("American Heart Association" OR "American Stroke Association") NOT TITLE:"Correction"',
    },
    "ESO": {
        "name": "European Stroke Organisation",
        "category": "Stroke",
        "adapter": "HTML_DIRECTORY",
        "url": "https://eso-stroke.org/guidelines/eso-guideline-directory",
        "link_patterns": [r"guideline", r"eso.*guidelines"],
    },
    "ILAE_REP": {
        "name": "International League Against Epilepsy (Reports)",
        "category": "Epilepsy",
        "adapter": "HTML_DIRECTORY",
        "url": "https://www.ilae.org/guidelines/guidelines-and-reports",
        "link_patterns": [r"guidelines", r"management", r"clinical.*practice"],
    },
    "ILAE_DEF": {
        "name": "International League Against Epilepsy (Definitions)",
        "category": "Epilepsy",
        "adapter": "HTML_DIRECTORY",
        "url": "https://www.ilae.org/guidelines/definition-and-classification",
        "link_patterns": [r"definition", r"classification"],
    },
    "AES": {
        "name": "American Epilepsy Society",
        "category": "Epilepsy",
        "adapter": "HTML_DIRECTORY",
        "url": "https://aesnet.org/clinical-care/clinical-guidance/guidelines",
        "link_patterns": [r"guidelines", r"clinical.*guidance"],
    },
    "PNS": {
        "name": "Peripheral Nerve Society",
        "category": "Peripheral Nerve",
        "adapter": "HTML_DIRECTORY",
        "url": "https://pnsociety.com/resources/guidelines/",
        "link_patterns": [r"guideline", r"neuropathy", r"management"],
    },
    "AHS": {
        "name": "American Headache Society",
        "category": "Headache",
        "adapter": "HTML_DIRECTORY",
        "url": "https://americanheadachesociety.org/resources/clinicians/guidelines",
        "link_patterns": [r"guidelines", r"consensus", r"headache"],
    },
    "EAN": {
        "name": "European Academy of Neurology",
        "category": "General Neurology",
        "adapter": "HTML_DIRECTORY",
        "url": "https://www.ean.org/research/ean-guidelines/guideline-reference-center",
        "link_patterns": [r"guidelines", r"reference"],
    },
    "NCS": {
        "name": "Neurocritical Care Society",
        "category": "Neurocritical Care",
        "adapter": "HTML_DIRECTORY",
        "url": "https://www.neurocriticalcare.org/Resources-Publications/Neurocritical-Care-Guidelines",
        "link_patterns": [r"guideline", r"neurocritical"],
    },
    "AAN": {
        "name": "American Academy of Neurology",
        "category": "General Neurology",
        "adapter": "HTML_DIRECTORY",
        "url": "https://www.aan.com/guidelines/home/allguidelines",
        "link_patterns": [r"guidelines", r"statements"],
    },
    "ALZ_WILEY": {
        "name": "Alzheimer's & Dementia (Wiley / PubMed Channel)",
        "category": "Dementia",
        "adapter": "PUBMED_API",
        "query": '("Alzheimers Dement"[Journal] OR "Alzheimer\'s & Dementia"[Journal]) AND (guideline[Title] OR criteria[Title] OR recommendation*[Title])',
    },
    "MDS_WILEY": {
        "name": "Movement Disorders (Wiley / PubMed Channel)",
        "category": "Movement Disorders",
        "adapter": "PUBMED_API",
        "query": '("Mov Disord"[Journal] OR "Movement Disorders"[Journal]) AND (guideline[Title] OR criteria[Title] OR consensus[Title])',
    },
    "NICE_NEURO": {
        "name": "NICE Neurological Conditions (UK / PubMed Channel)",
        "category": "General Neurology",
        "adapter": "PUBMED_API",
        "query": '("National Institute for Health and Care Excellence"[Corporate Author] OR "NICE guideline"[Title]) AND (stroke OR epilepsy OR parkinson OR headache OR dementia)',
    },
}
