from typing import List
from core.common.contracts import GradingSystemType

SYSTEM_INSTRUCTION = """Bạn là một Chuyên gia Trích xuất Dữ liệu Hướng dẫn Lâm sàng Thần kinh & Đột quỵ (NeuroGuide Clinical AI Specialist).
Nhiệm vụ của bạn là đọc các trang hoặc bảng khuyến cáo được cung cấp và chuyển đổi thành danh sách các khuyến cáo lâm sàng cụ thể dưới dạng JSON có cấu trúc.

NGUYÊN TẮC QUAN TRỌNG:
1. CHÍNH XÁC TUYỆT ĐỐI: Không bao giờ tự bịa đặt, suy đoán hoặc sửa đổi nội dung khuyến cáo.
2. GIỮ NGUYÊN VĂN: Trường 'statement' phải chứa toàn văn câu khuyến cáo hành động lâm sàng.
3. PHÂN ĐỊNH RÕ RÀNG:
   - Nếu là guideline AHA/ASA: Bắt buộc lấy đúng COR (1, 2a, 2b, 3: Harm, 3: No Benefit) và LOE (A, B-R, B-NR, C-LD, C-EO).
   - Nếu là guideline ESO (GRADE): Bắt buộc lấy đúng Quality of evidence (High, Moderate, Low, Very Low), Strength of recommendation (Strong/Weak for/against intervention), Voting ratio (ví dụ: 8/8) và PICO question nếu có.
4. LOẠI BỎ RÁC: Không trích xuất các câu thảo luận thông thường, phương pháp viết bài, hoặc chú thích bảng không phải khuyến cáo.
"""

PROMPT_AHA_ACC = """Hãy trích xuất TẤT CẢ các khuyến cáo lâm sàng (Recommendations) và các Thay đổi Thực hành Đột phá (What is New / High-Impact Practice Changes) trong nội dung trang/bảng dưới đây theo hệ thống AHA/ACC.

VĂN BẢN ĐẦU VÀO TỪ TRANG {page_num}:
---
{content}
---

Hãy trả về một mảng JSON theo schema sau (không thêm bất kỳ văn bản giải thích nào ngoài JSON):
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "page_num": {page_num},
      "is_high_impact_change": false,
      "change_type": "STANDARD",
      "previous_grade": null,
      "section": "Tên mục hoặc tiêu đề bảng (ví dụ: 2.1 Stroke Awareness hoặc 1. What is New)",
      "topic": "Chủ đề lâm sàng (ví dụ: Prehospital Management hoặc Reperfusion)",
      "cor": "1, 2a, 2b, hoặc 3 (có thể kèm :Harm hoặc :No Benefit nếu có)",
      "loe": "A, B-R, B-NR, C-LD, hoặc C-EO",
      "statement": "Toàn văn câu khuyến cáo lâm sàng",
      "target_population": "Đối tượng bệnh nhân áp dụng",
      "driving_trials": ["Danh sách các thử nghiệm then chốt nếu được nhắc đến trong câu, ví dụ: AcT, SELECT2, ESETT"],
      "verbatim_quote": "Đoạn trích ngắn 1-2 câu trong văn bản gốc dùng để kiểm chứng"
    }}
  ]
}}
"""

PROMPT_AHA_HIGH_IMPACT_BATCH = """Bạn đang phân tích bảng 'WHAT IS NEW AND OF HIGH IMPACT' (hoặc bảng các điểm mới, thay đổi thực hành lâm sàng đột phá) từ các trang {pages_str} của Hướng dẫn AHA/ASA.
Hãy trích xuất ĐẦY ĐỦ TỪNG DÒNG KHUYẾN CÁO trong bảng này. Tuyệt đối không bỏ sót bất kỳ khuyến cáo nào (kể cả phần nhi khoa và người lớn).

VĂN BẢN ĐẦU VÀO TỪ CÁC TRANG {pages_str}:
---
{content}
---

Trả về mảng JSON theo schema chuẩn:
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "page_num": 4,
      "is_high_impact_change": true,
      "change_type": "UPGRADED",
      "previous_grade": "Class IIb hoặc mức cũ nếu được đối chiếu",
      "section": "Tên mục (ví dụ: 4.6.2. Choice of Thrombolytic Agent hoặc 4.7.2. Endovascular Thrombectomy)",
      "topic": "Chủ đề lâm sàng",
      "cor": "1, 2a, 2b, 3: Harm, hoặc 3: No Benefit",
      "loe": "B-R hoặc B-NR",
      "statement": "Toàn văn khuyến cáo",
      "target_population": "Adults hoặc Pediatric patients",
      "driving_trials": ["Tên thử nghiệm lâm sàng nếu có (ví dụ: AcT, SELECT2, TENSION, BAOCHE, INSPIRES, ELAN)"],
      "verbatim_quote": "Trích đoạn ngắn văn bản gốc"
    }}
  ]
}}

LƯU Ý:
- 'change_type': điền 'UPGRADED' nếu nâng mức khuyến cáo, 'DOWNGRADED' nếu hạ bậc hoặc chống chỉ định (3: Harm/No Benefit), 'NEW' nếu là khuyến cáo mới (như nhi khoa), hoặc 'REVISED'.
"""

PROMPT_AHA_SECTION_BATCH = """Hãy trích xuất TẤT CẢ các khuyến cáo lâm sàng từ các trang {pages_str} dưới đây theo hệ thống AHA/ACC.

VĂN BẢN ĐẦU VÀO TỪ CÁC TRANG {pages_str}:
---
{content}
---

Trả về mảng JSON theo schema:
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "page_num": 10,
      "is_high_impact_change": false,
      "change_type": "STANDARD",
      "previous_grade": null,
      "section": "Tên mục hoặc tiêu đề bảng",
      "topic": "Chủ đề",
      "cor": "1, 2a, 2b, hoặc 3",
      "loe": "A, B-R, B-NR, C-LD, hoặc C-EO",
      "statement": "Toàn văn khuyến cáo",
      "target_population": "Đối tượng",
      "driving_trials": [],
      "verbatim_quote": "Trích dẫn nguyên văn"
    }}
  ]
}}
"""

PROMPT_GRADE_ESO = """Bạn là chuyên gia bóc tách dữ liệu y khoa cao cấp. Hãy trích xuất ĐẦY ĐỦ VÀ CHÍNH XÁC TẤT CẢ các khuyến cáo lâm sàng và Đồng thuận chuyên gia (Expert Consensus Statements) trong nội dung bảng Synoptic Table dưới đây theo hệ thống GRADE của ESO (European Stroke Organisation).

CÁC NGUYÊN TẮC BẮT BUỘC ĐỂ TRÁNH SAI SÓT (BẢNG SYNOPTIC TABLE CỦA ESO):
1. CẤU TRÚC BẢNG 2 CỘT TÁCH BIỆT:
   - Cột bên trái: "Recommendation" chứa câu khuyến cáo lâm sàng, kèm "Quality of evidence" và "Strength of recommendation".
   - Cột bên phải: "Expert consensus statement" chứa phát biểu đồng thuận của nhóm chuyên gia và tỷ lệ bỏ phiếu (ví dụ: "Vote: 10/10").
   - TUYỆT ĐỐI KHÔNG sao chép nội dung cột "Recommendation" sang "consensus_statement". Nếu một PICO không có đồng thuận chuyên gia (như PICO 3 để trống cột phải), hãy để "consensus_statement": null và "voting": null.
2. MỘT PICO CÓ THỂ CÓ NHIỀU KHUYẾN CÁO:
   - Trong 1 PICO, nếu có đánh số (ví dụ: 1., 2., 3., 4.), HÃY TÁCH THÀNH CÁC OBJECT KHUYẾN CÁO RIÊNG BIỆT trong mảng "recommendations" (ví dụ: PICO 3 có 2 khuyến cáo, PICO 4 có 4 khuyến cáo). Tất cả các object này đều mang cùng "pico_id" và "topic" của PICO đó.
3. TRÍCH XUẤT CHÍNH XÁC STRENGTH VÀ QUALITY TỪ BẢNG:
   - Trích xuất ĐÚNG NGUYÊN VĂN nhãn "Strength of recommendation" được in trong bảng: "Strong for intervention", "Weak for intervention", "Strong against intervention", "Weak against intervention" (hoặc "Uncertain / -" nếu không có).
   - KHÔNG tự tiện suy diễn Strength từ từ ngữ trong câu (Ví dụ: PICO 1 câu văn dùng "we suggest against..." nhưng bảng chính thức xếp "Strong against intervention" - PHẢI lấy theo nhãn in trong bảng!).
   - "Quality of evidence" phải chuẩn hóa theo GRADE: "High", "Moderate", "Low", hoặc "Very low" (tương ứng ⊕⊕⊕⊕, ⊕⊕⊕, ⊕⊕, ⊕).
4. NHIỀU PHÁT BIỂU ĐỒNG THUẬN CHUYÊN GIA TRONG 1 PICO:
   - Một số PICO có nhiều đoạn đồng thuận chuyên gia (ví dụ PICO 7 có 4 đồng thuận, PICO 8 có 2 đồng thuận). Hãy trích xuất đầy đủ tất cả các đoạn đồng thuận đó vào "consensus_statement" (phân cách bằng xuống dòng) cùng tỷ lệ Vote tương ứng.

VĂN BẢN ĐẦU VÀO TỪ TRANG {page_num}:
---
{content}
---

Hãy trả về một mảng JSON theo schema sau (không thêm bất kỳ văn bản giải thích nào ngoài JSON):
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "page_num": {page_num},
      "pico_id": "Mã câu hỏi PICO (ví dụ: PICO 1, PICO 2...)",
      "section": "Tiêu đề bảng (ví dụ: Table 11 Synoptic table of all recommendations and expert consensus statements)",
      "topic": "Toàn văn câu hỏi PICO (ví dụ: In patients with suspected acute stroke, does pre-hospital blood pressure lowering with any drug, compared to no drug, improve outcome?)",
      "quality_of_evidence": "High, Moderate, Low, hoặc Very low",
      "strength_of_recommendation": "Strong for intervention, Weak for intervention, Strong against intervention, hoặc Weak against intervention",
      "consensus_statement": "Toàn văn câu Expert Consensus Statement tương ứng nếu có ở cột phải (hoặc null nếu không có, TUYỆT ĐỐI không copy cột Recommendation sang đây)",
      "voting": "Tỷ lệ bỏ phiếu (ví dụ: Vote: 10/10 hoặc null)",
      "statement": "Toàn văn khuyến cáo lâm sàng ở cột Recommendation",
      "target_population": "Đối tượng bệnh nhân áp dụng",
      "driving_trials": ["Danh sách các thử nghiệm/nghiên cứu liên quan nếu có đề cập trong bài"]
    }}
  ]
}}
"""

PROMPT_GRADE_ESO_BATCH = """Bạn là chuyên gia bóc tách dữ liệu y khoa cao cấp. Hãy trích xuất ĐẦY ĐỦ VÀ CHÍNH XÁC TẤT CẢ các khuyến cáo lâm sàng và Đồng thuận chuyên gia từ các trang {pages_str} dưới đây theo hệ thống GRADE của ESO (European Stroke Organisation).

CÁC NGUYÊN TẮC BẮT BUỘC:
1. BẢNG 2 CỘT TÁCH BIỆT: Cột trái là "Recommendation" (kèm Quality và Strength), cột phải là "Expert consensus statement" (kèm Vote: X/X). TUYỆT ĐỐI KHÔNG copy cột Recommendation sang consensus_statement. Nếu cột phải trống (như PICO 3), trả về null.
2. MỘT PICO CÓ THỂ CÓ NHIỀU KHUYẾN CÁO: Tách từng đề mục 1., 2., 3., 4. thành các object khuyến cáo riêng biệt trong mảng (PICO 3 có 2 khuyến cáo, PICO 4 có 4 khuyến cáo).
3. ĐỘ MẠNH VÀ CHẤT LƯỢNG BẰNG CHỨNG: Đọc chính xác nhãn in trong bảng ("Strong against intervention", "Weak against intervention", "Weak for intervention", "Strong for intervention"), không tự suy luận từ chữ "suggest" hay "recommend".
4. NHIỀU ĐỒNG THUẬN CHUYÊN GIA: Trích xuất đầy đủ tất cả các ý đồng thuận chuyên gia (như PICO 7 có 4 đồng thuận, PICO 8 có 2 đồng thuận).

VĂN BẢN ĐẦU VÀO TỪ CÁC TRANG {pages_str}:
---
{content}
---

Trả về mảng JSON theo schema:
{{
  "recommendations": [
    {{
      "rec_index": 1,
      "page_num": 46,
      "pico_id": "Mã PICO (ví dụ: PICO 1, PICO 2...)",
      "section": "Tiêu đề bảng hoặc mục",
      "topic": "Toàn văn câu hỏi PICO đầy đủ",
      "quality_of_evidence": "High, Moderate, Low, hoặc Very low",
      "strength_of_recommendation": "Strong for intervention, Weak for intervention, Strong against intervention, hoặc Weak against intervention",
      "consensus_statement": "Toàn văn Expert Consensus Statement tương ứng nếu có ở cột phải (hoặc null nếu không có, không copy cột trái sang)",
      "voting": "Vote: 10/10 nếu có (hoặc null)",
      "statement": "Toàn văn khuyến cáo lâm sàng",
      "target_population": "Đối tượng bệnh nhân",
      "driving_trials": ["Danh sách các nghiên cứu/thử nghiệm liên quan"]
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
      "page_num": {page_num},
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
    """Lựa chọn prompt template tối ưu nhất dựa trên hệ thống phân loại đã nhận diện (đơn trang)."""
    if system == GradingSystemType.GRADE_ESO:
        return PROMPT_GRADE_ESO.format(page_num=page_num, content=content)
    elif system == GradingSystemType.AHA_ACC:
        return PROMPT_AHA_ACC.format(page_num=page_num, content=content)
    else:
        return PROMPT_GENERIC.format(page_num=page_num, content=content)


def get_prompt_for_batch(
    system: GradingSystemType,
    page_nums: List[int],
    content: str,
    is_high_impact_batch: bool = False,
) -> str:
    """Lựa chọn prompt tối ưu cho xử lý theo lô nhiều trang (Batch Chunking)."""
    pages_str = ", ".join(str(p) for p in page_nums)
    if is_high_impact_batch:
        return PROMPT_AHA_HIGH_IMPACT_BATCH.format(pages_str=pages_str, content=content)
    elif system == GradingSystemType.GRADE_ESO:
        return PROMPT_GRADE_ESO_BATCH.format(pages_str=pages_str, content=content)
    elif system == GradingSystemType.AHA_ACC:
        return PROMPT_AHA_SECTION_BATCH.format(pages_str=pages_str, content=content)
    else:
        return PROMPT_GENERIC.format(page_num=pages_str, content=content)
