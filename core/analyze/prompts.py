from core.common.contracts import GradingSystemType

SYSTEM_INSTRUCTION = """Bạn là một Chuyên gia Trích xuất Dữ liệu Hướng dẫn Lâm sàng Thần kinh & Đột quỵ (NeuroGuide Clinical AI Specialist).
Nhiệm vụ của bạn là đọc các trang hoặc bảng khuyến cáo được cung cấp và chuyển đổi thành danh sách các khuyến cáo lâm sàng cụ thể dưới dạng JSON có cấu trúc.

NGUYÊN TẮC QUAN TRỌNG:
1. CHÍNH XÁC TUYỆT ĐỐI: Không bao giờ tự bịa đặt, suy đoán hoặc sửa đổi nội dung khuyến cáo.
2. GIỮ NGUYÊN VĂN: Trường 'statement' phải chứa toàn văn câu khuyến cáo hành động lâm sàng.
3. PHÂN ĐỊNH RÕ RÀNG:
   - Nếu là guideline AHA/ASA: Bắt buộc lấy đúng COR (1, 2a, 2b, 3) và LOE (A, B-R, B-NR, C-LD, C-EO).
   - Nếu là guideline ESO (GRADE): Bắt buộc lấy đúng Quality of evidence (High, Moderate, Low, Very Low), Strength of recommendation (Strong/Weak for/against intervention), Voting ratio (ví dụ: 8/8) và PICO question nếu có.
4. LOẠI BỎ RÁC: Không trích xuất các câu thảo luận thông thường, phương pháp viết bài, hoặc chú thích bảng không phải khuyến cáo.
"""

PROMPT_AHA_ACC = """Hãy trích xuất TẤT CẢ các khuyến cáo lâm sàng (Recommendations) trong nội dung trang/bảng dưới đây theo hệ thống AHA/ACC (COR/LOE).

VĂN BẢN ĐẦU VÀO TỪ TRANG {page_num}:
---
{content}
---

Hãy trả về một mảng JSON theo schema sau (không thêm bất kỳ văn bản giải thích nào ngoài JSON):
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "section": "Tên mục hoặc tiêu đề bảng (ví dụ: 2.1 Stroke Awareness)",
      "topic": "Chủ đề lâm sàng (ví dụ: Prehospital Management)",
      "cor": "1, 2a, 2b, hoặc 3",
      "loe": "A, B-R, B-NR, C-LD, hoặc C-EO",
      "statement": "Toàn văn câu khuyến cáo lâm sàng",
      "target_population": "Đối tượng bệnh nhân áp dụng",
      "driving_trials": ["Danh sách các thử nghiệm then chốt nếu được nhắc đến trong câu, ví dụ: FAST-ED, RACE"],
      "verbatim_quote": "Đoạn trích ngắn 1-2 câu trong văn bản gốc dùng để kiểm chứng"
    }}
  ]
}}
"""

PROMPT_GRADE_ESO = """Hãy trích xuất TẤT CẢ các khuyến cáo lâm sàng và Đồng thuận chuyên gia (Expert Consensus Statements) trong nội dung trang/bảng dưới đây theo hệ thống GRADE của ESO (European Stroke Organisation).

VĂN BẢN ĐẦU VÀO TỪ TRANG {page_num}:
---
{content}
---

Hãy trả về một mảng JSON theo schema sau (không thêm bất kỳ văn bản giải thích nào ngoài JSON):
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "pico_id": "Mã câu hỏi PICO nếu có (ví dụ: PICO 5)",
      "section": "Tiêu đề bảng hoặc mục (ví dụ: Table 8 - Stroke Associated Pneumonia)",
      "topic": "Chủ đề lâm sàng",
      "quality_of_evidence": "High, Moderate, Low, hoặc Very Low",
      "strength_of_recommendation": "Strong for intervention, Weak for intervention, Strong against intervention, hoặc Weak against intervention",
      "consensus_statement": "Nội dung câu đồng thuận nếu là Expert Consensus Statement (hoặc null nếu là recommendation thông thường)",
      "voting": "Tỷ lệ bỏ phiếu của hội đồng nếu có (ví dụ: 8/8, 9/10, hoặc Unanimous)",
      "statement": "Toàn văn khuyến cáo lâm sàng hoặc ý kiến đồng thuận",
      "target_population": "Đối tượng áp dụng (ví dụ: Hospitalised adults with acute ischaemic stroke within 7 days)",
      "driving_trials": ["Danh sách thử nghiệm lâm sàng nếu có"],
      "verbatim_quote": "Đoạn trích ngắn nguyên văn để kiểm chứng"
    }}
  ]
}}
"""

PROMPT_GENERIC = """Hãy trích xuất TẤT CẢ các khuyến cáo lâm sàng trong nội dung trang/bảng dưới đây.

VĂN BẢN ĐẦU VÀO TỪ TRANG {page_num}:
---
{content}
---

Hãy trả về một mảng JSON theo schema sau:
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "section": "Tiêu đề mục hoặc bảng",
      "topic": "Chủ đề khuyến cáo",
      "statement": "Toàn văn câu khuyến cáo",
      "level": "Mức độ khuyến cáo nếu có (ví dụ: Level A, Grade B, Class I)",
      "target_population": "Đối tượng bệnh nhân",
      "driving_trials": [],
      "verbatim_quote": "Đoạn trích ngắn nguyên văn"
    }}
  ]
}}
"""


def get_prompt_for_grading_system(system: GradingSystemType, page_num: int, content: str) -> str:
    """Lựa chọn prompt template tối ưu nhất dựa trên hệ thống phân loại đã nhận diện."""
    if system == GradingSystemType.GRADE_ESO:
        return PROMPT_GRADE_ESO.format(page_num=page_num, content=content)
    elif system == GradingSystemType.AHA_ACC:
        return PROMPT_AHA_ACC.format(page_num=page_num, content=content)
    else:
        return PROMPT_GENERIC.format(page_num=page_num, content=content)
