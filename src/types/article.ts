export interface Article {
  id: string;
  pmid?: string;
  title: string;
  journal: {
    name: string;
    short_name: string;
    badge_bg: string;
    badge_text: string;
  };
  pub_date: string;
  article_type: string;
  article_types?: string[];
  authors: string[];
  doi_url: string;
  neurology_classification: {
    subspecialty: string;
    subspecialties?: string[];
    topics: string[];
  };
  abstract: string;
  ai_takeaways?: {
    conclusion_vi: string;
    clinical_significance?: string;
    ai_verified?: boolean;
  };
}
