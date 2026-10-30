import fitz
import re
import json

def parse_aha_guideline(pdf_path):
    doc = fitz.open(pdf_path)
    
    # 1. Parse Top 10 Take-Home Messages (Page 3)
    p3 = doc[2].get_text('text')
    top10_start = p3.find('TOP TAKE-HOME MESSAGES')
    top10_text = p3[top10_start:] if top10_start != -1 else ""
    raw_takeaways = re.findall(r'(\d+)\.\s+([\s\S]+?)(?=\n\s*\d+\.|\n\s*Disclosures|\Z)', top10_text)
    
    top_takeaways = []
    for num, text in raw_takeaways:
        cleaned = ' '.join(text.split())
        cleaned = cleaned.replace('\x08', '').replace('\u2003', ' ').replace('\u2002', ' ')
        top_takeaways.append({
            "number": int(num),
            "text": cleaned
        })
        
    print(f"Parsed {len(top_takeaways)} Top Take-Home Messages.")

    # 2. Parse Table 3: WHAT IS NEW AND OF HIGH IMPACT (Pages 4 and 5)
    high_impact_recs = []
    
    # P4 parsing
    p4_blocks = doc[3].get_text('blocks')
    p5_blocks = doc[4].get_text('blocks')
    
    current_category = "Pediatric Recommendations"
    current_section = ""
    
    for page_idx, blocks in [(4, p4_blocks), (5, p5_blocks)]:
        for b in blocks:
            t = b[4].strip()
            # Ignore header / footer blocks
            if not t or 'CLINICAL STATEMENTS' in t or 'Prabhakaran' in t or 'Stroke. 2026' in t or 'TBD 2026' in t:
                continue
            if 'WHAT IS NEW' in t or 'This Table highlights' in t or 'Section title' in t or 'Downloaded from' in t or 'AIS indicates' in t:
                continue
            if 'the delivery of quality cerebrovascular care' in t or 'Nerissa Ko' in t or 'Oversight Committee' in t or '(Continued' in t:
                continue
                
            if 'New and impactful pediatric recommendations' in t:
                current_category = "Pediatric Recommendations"
                continue
            if 'New and impactful general recommendations' in t or 'New and impactful adult recommendations' in t:
                current_category = "Adult & Systems Recommendations"
                continue
                
            # Check combined section header and COR
            combined_match = re.match(r'^(\d+\.\d+(?:\.\d+)?\.?\s+[A-Za-z\s,\-–\(\)]+?)\s+(COR\s+[\s\S]+)$', t)
            if combined_match:
                current_section = ' '.join(combined_match.group(1).split())
                cor_and_stmt = combined_match.group(2).strip()
            elif t.startswith('COR '):
                cor_and_stmt = t
            elif re.match(r'^\d+\.\d+(?:\.\d+)?\.?\s+', t):
                current_section = ' '.join(t.split())
                continue
            else:
                continue
                
            # Now parse cor_and_stmt
            cor_match = re.match(r'^COR\s+([^.]+)\.\s+([\s\S]+)$', cor_and_stmt)
            if cor_match:
                cor_raw = cor_match.group(1).strip()
                statement = ' '.join(cor_match.group(2).split())
            else:
                cor_raw = "COR"
                statement = ' '.join(cor_and_stmt.split())
                
            statement = statement.replace('\x08', '').replace('\u2003', ' ').replace('\u2002', ' ')
            
            high_impact_recs.append({
                "id": f"aha-2026-hi-{len(high_impact_recs) + 1}",
                "category": current_category,
                "section": current_section,
                "cor": cor_raw,
                "statement": statement,
                "page": page_idx
            })

    print(f"Parsed {len(high_impact_recs)} High-Impact Practice Changes from Table 3 (Target: 27).")

    # 3. Parse Full Recommendations from Clinical Sections (Pages 10 to 85)
    section_recs = []
    current_rec_table_title = ""
    
    for page_idx in range(9, min(86, len(doc))):
        page_num = page_idx + 1
        page_text = doc[page_idx].get_text('text')
        
        lines = [l.strip() for l in page_text.split('\n') if l.strip()]
        cor_pattern = re.compile(r'^(1|2a|2b|3:\s*Harm|3:\s*No\s*Benefit|3:\s*Harm\s*\(Harm\)|3:\s*No\s*Benefit\s*\(No\s*Benefit\))$', re.IGNORECASE)
        loe_pattern = re.compile(r'^(A|B-R|B-NR|C-LD|C-EO)$', re.IGNORECASE)
        
        i = 0
        while i < len(lines):
            line = lines[i]
            if "Recommendations for " in line:
                current_rec_table_title = line.replace(" (Continued)", "").strip()
            
            if cor_pattern.match(line) and i + 2 < len(lines) and loe_pattern.match(lines[i+1]):
                cor_val = line
                loe_val = lines[i+1]
                
                stmt_lines = []
                j = i + 2
                while j < len(lines):
                    next_l = lines[j]
                    if cor_pattern.match(next_l) and j + 1 < len(lines) and loe_pattern.match(lines[j+1]):
                        break
                    if "Recommendation-Specific Supportive Text" in next_l or "Recommendations for " in next_l or "Table " in next_l:
                        break
                    if "CLINICAL STATEMENTS" in next_l or "Prabhakaran et al" in next_l or "Stroke. 2026" in next_l:
                        j += 1
                        continue
                    stmt_lines.append(next_l)
                    j += 1
                
                full_stmt = ' '.join(stmt_lines).strip()
                if len(full_stmt) > 20 and re.match(r'^\d+\.', full_stmt):
                    cleaned_stmt = re.sub(r'[\d\–\-,]+$', '', full_stmt).strip()
                    cleaned_stmt = cleaned_stmt.replace('\x08', '').replace('\u2003', ' ').replace('\u2002', ' ')
                    
                    section_recs.append({
                        "rec_id": f"aha2026-rec-{len(section_recs) + 1}",
                        "section": current_rec_table_title or "General Clinical Management",
                        "cor": cor_val,
                        "loe": loe_val,
                        "statement": cleaned_stmt,
                        "page_num": page_num
                    })
                i = j
            else:
                i += 1

    print(f"Parsed {len(section_recs)} Section Recommendations from pages 10-85.")
    
    return {
        "top_takeaways": top_takeaways,
        "high_impact_recs": high_impact_recs,
        "section_recs": section_recs
    }

if __name__ == "__main__":
    pdf_path = r"C:/Users/Manh/.gemini/antigravity/brain/642a91a5-b335-4769-933a-ae19395b97d6/.user_uploaded/media_1793356883384_4af55b59.pdf"
    data = parse_aha_guideline(pdf_path)
    with open("data/aha_2026_parsed_full.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Done! Saved to data/aha_2026_parsed_full.json")
