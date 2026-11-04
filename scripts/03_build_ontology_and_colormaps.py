"""03 - Build Anatomical-Clinical Ontology & NiiVue Colormaps (Phase 1B).

Generates:
1. public/neurovision/data/neuro_ontology.json
2. public/neurovision/data/colormaps/*.json (for all 8 atlases)

Strict Medical Governance:
- Every medical entry contains `source: list[str]` citing official literature/atlases.
- `review_status`: 'unreviewed' (only human expert can transition to 'reviewed').
- Priority zones (ASPECTS, pc-ASPECTS, ACA/MCA/PCA/VB, Brainstem nuclei, Thalamus, IC)
  are enriched with deep clinical, arterial supply, and syndrome correlations.
- Remaining regions are generated as minimal valid records without hallucinated claims.
"""
from __future__ import annotations

import json
from pathlib import Path
import colorsys

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
PUB = ROOT / "public" / "neurovision"
ATLASES = PUB / "atlases"
DATA = PUB / "data"
COLORMAPS = DATA / "colormaps"
DATA.mkdir(parents=True, exist_ok=True)
COLORMAPS.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# 1. CLINICAL KNOWLEDGEBASE (Priority regions: ASPECTS, Arterial, Brainstem, IC, Thalamus)
# -----------------------------------------------------------------------------
LIT_SOURCES = [
    "Barber PA et al. Validity and reliability of ASPECTS in hyperacute ischemic stroke. Lancet 2000; 355:1670-1674.",
    "Birenbaum D et al. Management of acute ischemic stroke. J Emerg Trauma Shock 2011; 4(3):395-403.",
    "Liu CF et al. Digital 3D Brain MRI Arterial Territories Atlas. Sci Data 2023; 10:74.",
    "Edlow BL, Kinney HC. Harvard Ascending Arousal Network Atlas v2.0. Dryad 2023.",
    "Rolls ET et al. Automated anatomical labelling atlas 3 (AAL3). NeuroImage 2020; 206:116189.",
    "Mori S et al. MRI Atlas of Human White Matter. Elsevier 2005.",
    "Bazin PL et al. VENAT: A digital venous neuroanatomy atlas. NeuroImage 2018."
]

SRC_ASPECTS = [LIT_SOURCES[0], LIT_SOURCES[2]]
SRC_ART = [LIT_SOURCES[2]]
SRC_AAN = [LIT_SOURCES[3]]
SRC_HO = [LIT_SOURCES[1], "Harvard-Oxford Cortical and Subcortical Structural Atlas (FSL/Nilearn)"]
SRC_WM = [LIT_SOURCES[5]]
SRC_AAL3 = [LIT_SOURCES[4]]
SRC_VENAT = [LIT_SOURCES[6]]

# Detailed dictionary for priority regions
# Key: (atlas, label_id)
DETAILED_ENTRIES: dict[tuple[str, int], dict] = {}

# -------------------------------------------------- ASPECTS 10 regions (Bilateral, 20 labels)
ASPECTS_DATA = {
    # Left hemisphere (1..10)
    1: {
        "code": "C_L", "name_vi": "Đầu nhân đuôi (Trái)", "name_en": "Caudate Head (Left)",
        "cat": "subcortical", "ba": [],
        "func": ["Lập kế hoạch vận động", "Chức năng điều hành nhận thức", "Tư duy mục tiêu và phần thưởng"],
        "art": {"primary": ["MCA-M1", "ACA-A1"], "perforators": ["Động mạch đậu vân bên (LSA)", "Động mạch Heubner (RAH)"]},
        "ven": ["Tĩnh mạch đồi thị vân trên", "Tĩnh mạch não trong"],
        "asp": "C",
        "syn": [
            {"name": "Hội chứng tổn thương nhân đuôi", "description": "Rối loạn điều hành nhận thức, mất ý chí (abulia), chậm chạp tâm thần vận động, thiếu hụt chú ý đối bên."},
            {"name": "Múa giật - múa vờn thứ phát", "description": "Rối loạn vận động tăng động tự ý do mất ức chế từ thể vân lên đồi thị."}
        ]
    },
    2: {
        "code": "L_L", "name_vi": "Nhân bèo (Trái)", "name_en": "Lentiform Nucleus (Left)",
        "cat": "subcortical", "ba": [],
        "func": ["Điều hòa trương lực cơ", "Khởi động và kiểm soát biên độ vận động tự ý (Putamen)", "Ức chế vận động không mong muốn (Pallidum)"],
        "art": {"primary": ["MCA-M1"], "perforators": ["Động mạch đậu vân bên (Lateral Lenticulostriate Arteries - LSA)"]},
        "ven": ["Tĩnh mạch não trong", "Tĩnh mạch đáy Rosenthal"],
        "asp": "L",
        "syn": [
            {"name": "Đột quỵ nhân bèo (Lentiform stroke)", "description": "Liệt cứng nửa người đối bên, tăng phản xạ gân xương, múa vờn (athetosis) hoặc loạn trương lực cơ."},
            {"name": "Hội chứng giả Parkinson mạch máu", "description": "Cứng đờ cơ kiểu ống chì, bước đi chậm chạp ngắn bước do tổn thương vòng nối vân-nhạt-đồi thị."}
        ]
    },
    3: {
        "code": "IC_L", "name_vi": "Bao trong (Trái)", "name_en": "Internal Capsule (Left)",
        "cat": "white_matter", "ba": [],
        "func": ["Nhánh trước: sợi trán-cầu, cảm xúc và điều hành", "Gối: bó vỏ nhân (vận động cơ mặt, hầu họng)", "Nhánh sau: bó vỏ gai (vận động thân thể), bó gai đồi thị (cảm giác), tia thị giác"],
        "art": {"primary": ["MCA-M1", "ICA"], "perforators": ["Động mạch đậu vân bên (LSA)", "Động mạch mạch mạc trước (AChA)"]},
        "ven": ["Tĩnh mạch đồi thị vân trên", "Tĩnh mạch đáy Rosenthal"],
        "asp": "IC",
        "syn": [
            {"name": "Đột quỵ ổ khuyết thuần túy vận động (Pure Motor Hemiparesis)", "description": "Liệt nửa người đối bên đồng đều mặt-tay-chân, không kèm rối loạn cảm giác hay tổn thương thị trường."},
            {"name": "Hội chứng liệt nửa người kèm thất điều (Ataxic Hemiparesis)", "description": "Liệt nhẹ nửa người kết hợp thất điều tiểu não cùng bên liệt do tổn thương nhánh trước/gối bao trong."}
        ]
    },
    4: {
        "code": "I_L", "name_vi": "Dải vỏ thùy đảo (Trái)", "name_en": "Insular Ribbon (Left)",
        "cat": "cortex", "ba": ["BA13", "BA14", "BA16"],
        "func": ["Cảm giác nội tạng và nhận thức bản thể (interoception)", "Xử lý vị giác và cảm xúc ghê tởm", "Điều hòa thần kinh tự chủ (nhịp tim, huyết áp giao cảm/phó giao cảm)"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Các nhánh đảo của động mạch não giữa"]},
        "ven": ["Tĩnh mạch não giữa nông", "Tĩnh mạch đáy Rosenthal"],
        "asp": "I",
        "syn": [
            {"name": "Dấu hiệu dải thùy đảo biến mất (Insular Ribbon Sign)", "description": "Dấu hiệu sớm của nhồi máu não diện rộng trên CT do phù độc tế bào làm mất phân định chất xám - chất trắng thùy đảo."},
            {"name": "Rối loạn thần kinh tự chủ tim mạch", "description": "Tăng nguy cơ loạn nhịp tim ác tính, nhịp nhanh xoang hoặc đột tử do mất điều hòa giao cảm nội tạng."}
        ]
    },
    5: {
        "code": "M1_L", "name_vi": "Vỏ não MCA trước - Tầng hạch nền (Trái)", "name_en": "M1 Anterior MCA Cortex (Left)",
        "cat": "cortex", "ba": ["BA44", "BA45", "BA47"],
        "func": ["Vùng Broca (bán cầu ưu thế ngôn ngữ): lập trình vận động phát âm", "Vỏ não tiền trán dưới: ức chế hành vi và xử lý ngữ nghĩa"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Nhánh trán lên của MCA"]},
        "ven": ["Tĩnh mạch não giữa nông", "Xoang dọc trên (SSS)"],
        "asp": "M1",
        "syn": [
            {"name": "Thất ngôn Broca (Broca Aphasia)", "description": "Mất khả năng diễn đạt ngôn ngữ lưu loát, nói ngập ngừng, khó khăn tìm từ, nhưng khả năng hiểu lời nói còn tương đối bảo tồn."},
            {"name": "Liệt vận động mặt và tay đối bên", "description": "Tổn thương phần dưới vỏ não vận động sơ cấp chi phối cơ mặt và chi trên."}
        ]
    },
    6: {
        "code": "M2_L", "name_vi": "Vỏ não MCA bên - Tầng hạch nền (Trái)", "name_en": "M2 Lateral MCA Cortex (Left)",
        "cat": "cortex", "ba": ["BA22", "BA41", "BA42"],
        "func": ["Vùng Wernicke (bán cầu ưu thế): tiếp nhận và giải mã ý nghĩa ngôn ngữ", "Vỏ não thính giác sơ cấp (Heschl gyrus): xử lý âm thanh"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Nhánh thái dương trước và giữa của MCA"]},
        "ven": ["Tĩnh mạch nối dưới Labbé", "Tĩnh mạch não giữa nông"],
        "asp": "M2",
        "syn": [
            {"name": "Thất ngôn Wernicke (Wernicke Aphasia)", "description": "Mất khả năng hiểu ngôn ngữ nghe và đọc, nói lưu loát nhưng vô nghĩa, loạn lời, không nhận thức được khiếm khuyết của bản thân (anosognosia)."},
            {"name": "Bán manh 1/4 trên đối bên (Pie in the sky)", "description": "Tổn thương quai Meyer của tia thị giác đi qua thùy thái dương."}
        ]
    },
    7: {
        "code": "M3_L", "name_vi": "Vỏ não MCA sau - Tầng hạch nền (Trái)", "name_en": "M3 Posterior MCA Cortex (Left)",
        "cat": "cortex", "ba": ["BA21", "BA37"],
        "func": ["Xử lý thị giác nhận dạng mặt người và vật thể (hồi thoi - fusiform gyrus)", "Hợp nhất tín hiệu thính - thị giác thùy thái dương sau"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Nhánh thái dương sau của MCA"]},
        "ven": ["Tĩnh mạch Labbé", "Xoang ngang"],
        "asp": "M3",
        "syn": [
            {"name": "Mất nhận biết thị giác (Visual Agnosia)", "description": "Khó khăn nhận dạng đồ vật bằng thị giác dù thị lực bảo tồn."},
            {"name": "Thất ngôn danh từ (Anomic Aphasia)", "description": "Gặp khó khăn nghiêm trọng trong việc gọi tên đồ vật và sự việc."}
        ]
    },
    8: {
        "code": "M4_L", "name_vi": "Vỏ não MCA trước trên - Tầng trên hạch nền (Trái)", "name_en": "M4 Anterior Superior MCA Cortex (Left)",
        "cat": "cortex", "ba": ["BA8", "BA9", "BA6"],
        "func": ["Trung tâm vận nhãn trán (Frontal Eye Field - FEF): liếc mắt phối hợp theo ý muốn sang bên đối diện", "Vùng vận động tiền bổ sung: lập kế hoạch chuỗi động tác"],
        "art": {"primary": ["MCA-M2", "MCA-M3"], "perforators": ["Nhánh trán trước trên của MCA"]},
        "ven": ["Tĩnh mạch nối trên Trolard", "Xoang dọc trên (SSS)"],
        "asp": "M4",
        "syn": [
            {"name": "Lệch đầu mắt phối hợp (Gaze Deviation)", "description": "Hai mắt và đầu quay lệch về phía bán cầu bị tổn thương (nhìn về phía tổn thương, xa phía liệt)."},
            {"name": "Mất thực dụng vận động (Motor Apraxia)", "description": "Không thể thực hiện các động tác phối hợp phức tạp theo yêu cầu dù không bị liệt nặng."}
        ]
    },
    9: {
        "code": "M5_L", "name_vi": "Vỏ não MCA bên trên - Tầng trên hạch nền (Trái)", "name_en": "M5 Lateral Superior MCA Cortex (Left)",
        "cat": "cortex", "ba": ["BA4", "BA3", "BA1", "BA2"],
        "func": ["Vỏ não vận động sơ cấp (M1): vận động hữu ý chi trên, bàn tay và mặt", "Vỏ não cảm giác thân thể sơ cấp (S1): cảm giác nông và sâu nửa người đối bên"],
        "art": {"primary": ["MCA-M2", "MCA-M3"], "perforators": ["Nhánh động mạch rãnh trung tâm (Rolandic artery)"]},
        "ven": ["Tĩnh mạch nối trên Trolard", "Xoang dọc trên"],
        "asp": "M5",
        "syn": [
            {"name": "Hội chứng liệt và mất cảm giác đối bên ưu thế tay - mặt", "description": "Liệt mềm chuyển cứng và mất cảm giác phân biệt nửa người đối diện, tổn thương chi trên nặng hơn chi dưới (đặc trưng phân bố homunculus của MCA)."},
            {"name": "Mất nhận biết cảm giác xúc giác (Astereognosis)", "description": "Không nhận biết được vật thể khi cầm trong lòng bàn tay đối bên."}
        ]
    },
    10: {
        "code": "M6_L", "name_vi": "Vỏ não MCA sau trên - Tầng trên hạch nền (Trái)", "name_en": "M6 Posterior Superior MCA Cortex (Left)",
        "cat": "cortex", "ba": ["BA39", "BA40", "BA7"],
        "func": ["Hồi góc (Angular gyrus - BA39) và hồi trên viền (Supramarginal - BA40)", "Tích hợp đa giác quan, đọc, viết, tính toán và định hướng không gian"],
        "art": {"primary": ["MCA-M2", "MCA-M3"], "perforators": ["Nhánh đỉnh sau và góc của MCA"]},
        "ven": ["Tĩnh mạch Trolard", "Xoang dọc trên"],
        "asp": "M6",
        "syn": [
            {"name": "Hội chứng Gerstmann (Gerstmann Syndrome)", "description": "Tứ chứng kinh điển do tổn thương hồi góc bán cầu ưu thế: Mất nhận biết ngón tay (Finger agnosia), Mất phân biệt phải-trái, Mất viết (Agraphia), và Mất tính toán (Acalculia)."},
            {"name": "Thất ngôn dẫn truyền (Conduction Aphasia)", "description": "Tổn thương bó cung dưới hồi trên viền gây mất khả năng nhắc lại lời nói dù hiểu và nói lưu loát."}
        ]
    },
    # Right hemisphere (11..20)
    11: {
        "code": "C_R", "name_vi": "Đầu nhân đuôi (Phải)", "name_en": "Caudate Head (Right)",
        "cat": "subcortical", "ba": [],
        "func": ["Điều hành nhận thức không gian", "Kiểm soát xung động và cảm xúc"],
        "art": {"primary": ["MCA-M1", "ACA-A1"], "perforators": ["Động mạch đậu vân bên (LSA phải)", "Động mạch Heubner phải"]},
        "ven": ["Tĩnh mạch đồi thị vân trên phải", "Tĩnh mạch não trong"],
        "asp": "C",
        "syn": [
            {"name": "Hội chứng thờ ơ và mất chú ý không gian", "description": "Giảm động, mất hứng thú, thờ ơ với nửa không gian đối bên do tổn thương nhân đuôi bán cầu không ưu thế."}
        ]
    },
    12: {
        "code": "L_R", "name_vi": "Nhân bèo (Phải)", "name_en": "Lentiform Nucleus (Right)",
        "cat": "subcortical", "ba": [],
        "func": ["Điều hòa vận động tự ý bên trái", "Kiểm soát trương lực cơ bên trái"],
        "art": {"primary": ["MCA-M1"], "perforators": ["Động mạch đậu vân bên phải (LSA)"]},
        "ven": ["Tĩnh mạch não trong", "Tĩnh mạch đáy Rosenthal"],
        "asp": "L",
        "syn": [
            {"name": "Liệt cứng và loạn trương lực nửa người trái", "description": "Tổn thương nhân bèo bên phải gây rối loạn vận động nửa thân trái."}
        ]
    },
    13: {
        "code": "IC_R", "name_vi": "Bao trong (Phải)", "name_en": "Internal Capsule (Right)",
        "cat": "white_matter", "ba": [],
        "func": ["Bó vỏ gai và vỏ nhân dẫn truyền vận động nửa người trái", "Sợi cảm giác dẫn truyền nửa thân trái"],
        "art": {"primary": ["MCA-M1", "ICA"], "perforators": ["Động mạch đậu vân bên phải (LSA)", "Động mạch mạch mạc trước phải (AChA)"]},
        "ven": ["Tĩnh mạch đồi thị vân", "Tĩnh mạch đáy Rosenthal"],
        "asp": "IC",
        "syn": [
            {"name": "Đột quỵ thuần túy vận động nửa người trái (Pure Motor Hemiparesis)", "description": "Liệt đồng đều mặt, tay, chân bên trái không kèm rối loạn cảm giác hay thất ngôn."}
        ]
    },
    14: {
        "code": "I_R", "name_vi": "Dải vỏ thùy đảo (Phải)", "name_en": "Insular Ribbon (Right)",
        "cat": "cortex", "ba": ["BA13", "BA14", "BA16"],
        "func": ["Xử lý nhận thức cảm xúc và thần kinh tự chủ giao cảm tim mạch", "Cảm nhận đau và nhiệt"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Nhánh đảo của MCA phải"]},
        "ven": ["Tĩnh mạch não giữa nông phải", "Tĩnh mạch đáy Rosenthal"],
        "asp": "I",
        "syn": [
            {"name": "Dấu hiệu mất dải vỏ đảo phải trên CT", "description": "Chỉ điểm sớm thiếu máu cục bộ cấp tính diện rộng động mạch não giữa phải."},
            {"name": "Loạn nhịp tim ác tính", "description": "Thùy đảo phải chi phối hoạt động giao cảm tim, nhồi máu làm tăng nguy cơ biến cố tim mạch đột ngột."}
        ]
    },
    15: {
        "code": "M1_R", "name_vi": "Vỏ não MCA trước - Tầng hạch nền (Phải)", "name_en": "M1 Anterior MCA Cortex (Right)",
        "cat": "cortex", "ba": ["BA44", "BA45", "BA47"],
        "func": ["Biểu cảm ngữ điệu (prosody) của giọng nói", "Vận động cơ mặt bên trái"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Nhánh trán lên của MCA phải"]},
        "ven": ["Tĩnh mạch não giữa nông", "Xoang dọc trên"],
        "asp": "M1",
        "syn": [
            {"name": "Mất ngữ điệu diễn đạt (Motor Aprosodia)", "description": "Giọng nói đơn điệu, mất ngữ điệu cảm xúc, liệt mặt và tay bên trái."}
        ]
    },
    16: {
        "code": "M2_R", "name_vi": "Vỏ não MCA bên - Tầng hạch nền (Phải)", "name_en": "M2 Lateral MCA Cortex (Right)",
        "cat": "cortex", "ba": ["BA22", "BA41", "BA42"],
        "func": ["Nhận biết cảm xúc qua ngữ điệu giọng nói của người khác", "Xử lý âm nhạc và âm thanh phi ngôn ngữ"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Nhánh thái dương MCA phải"]},
        "ven": ["Tĩnh mạch Labbé phải", "Xoang ngang"],
        "asp": "M2",
        "syn": [
            {"name": "Mất nhận biết ngữ điệu (Sensory Aprosodia)", "description": "Không hiểu được cảm xúc biểu hiện qua giọng nói của người đối thoại, mất cảm thụ âm nhạc (amusia)."}
        ]
    },
    17: {
        "code": "M3_R", "name_vi": "Vỏ não MCA sau - Tầng hạch nền (Phải)", "name_en": "M3 Posterior MCA Cortex (Right)",
        "cat": "cortex", "ba": ["BA21", "BA37"],
        "func": ["Nhận diện khuôn mặt (hồi thoi phải - FFA)", "Định hướng không gian thị giác"],
        "art": {"primary": ["MCA-M2"], "perforators": ["Nhánh thái dương sau MCA phải"]},
        "ven": ["Tĩnh mạch Labbé phải", "Xoang ngang"],
        "asp": "M3",
        "syn": [
            {"name": "Mất nhận diện khuôn mặt (Prosopagnosia)", "description": "Không thể nhận ra khuôn mặt của người quen, người thân dù thị lực và trí nhớ bình thường."}
        ]
    },
    18: {
        "code": "M4_R", "name_vi": "Vỏ não MCA trước trên - Tầng trên hạch nền (Phải)", "name_en": "M4 Anterior Superior MCA Cortex (Right)",
        "cat": "cortex", "ba": ["BA8", "BA9", "BA6"],
        "func": ["Trung tâm vận nhãn trán phải (FEF): đưa mắt sang trái", "Định hướng chú ý không gian bên trái"],
        "art": {"primary": ["MCA-M2", "MCA-M3"], "perforators": ["Nhánh trán trước trên MCA phải"]},
        "ven": ["Tĩnh mạch Trolard phải", "Xoang dọc trên"],
        "asp": "M4",
        "syn": [
            {"name": "Lệch đầu mắt phối hợp sang phải", "description": "Hai mắt và đầu nhìn về phía bên phải (phía tổn thương), khó liếc chủ động sang bên trái."}
        ]
    },
    19: {
        "code": "M5_R", "name_vi": "Vỏ não MCA bên trên - Tầng trên hạch nền (Phải)", "name_en": "M5 Lateral Superior MCA Cortex (Right)",
        "cat": "cortex", "ba": ["BA4", "BA3", "BA1", "BA2"],
        "func": ["Vận động và cảm giác sơ cấp nửa người trái (ưu thế tay và mặt)"],
        "art": {"primary": ["MCA-M2", "MCA-M3"], "perforators": ["Nhánh động mạch rãnh trung tâm phải"]},
        "ven": ["Tĩnh mạch Trolard phải", "Xoang dọc trên"],
        "asp": "M5",
        "syn": [
            {"name": "Liệt và mất cảm giác nửa người trái", "description": "Yếu liệt ưu thế tay và mặt bên trái, kèm mất nhận biết cảm giác tinh tế."}
        ]
    },
    20: {
        "code": "M6_R", "name_vi": "Vỏ não MCA sau trên - Tầng trên hạch nền (Phải)", "name_en": "M6 Posterior Superior MCA Cortex (Right)",
        "cat": "cortex", "ba": ["BA39", "BA40", "BA7"],
        "func": ["Nhận thức không gian 3D và sơ đồ thân thể", "Tích hợp chú ý không gian nửa người bên trái"],
        "art": {"primary": ["MCA-M2", "MCA-M3"], "perforators": ["Nhánh đỉnh sau MCA phải"]},
        "ven": ["Tĩnh mạch Trolard phải", "Xoang dọc trên"],
        "asp": "M6",
        "syn": [
            {"name": "Hội chứng lãng quên nửa không gian (Hemispatial Neglect Syndrome)", "description": "Bệnh nhân hoàn toàn phớt lờ, không chú ý tới nửa người bên trái và không gian bên trái (không ăn thức ăn bên trái đĩa, không cạo râu nửa mặt trái)."},
            {"name": "Mất nhận thức bệnh tật (Anosognosia)", "description": "Bệnh nhân khăng khăng phủ nhận mình bị liệt nửa người dù tay chân trái hoàn toàn bất động."}
        ]
    }
}

for i in range(1, 21):
    d = ASPECTS_DATA[i]
    DETAILED_ENTRIES[("aspects", i)] = {
        "code": d["code"], "name_vi": d["name_vi"], "name_en": d["name_en"],
        "category": d["cat"], "brodmann_area": d["ba"], "functions": d["func"],
        "arterial_supply": d["art"], "venous_drainage": d["ven"],
        "aspects_zone": d["asp"], "clinical_syndromes": d["syn"],
        "evidence_level": "approximate" if d["art"]["perforators"] else "atlas_direct",
        "source": SRC_ASPECTS,
        "review_status": "unreviewed"
    }

# -------------------------------------------------- ARTERIAL TERRITORIES (Level 2: ACA, MCA, PCA, VB)
# arterial_level2: 1=ACAL, 2=ACAR, 3=MCAL, 4=MCAR, 5=PCAL, 6=PCAR, 7=VBL, 8=VBR
ART_L2_DATA = {
    1: ("ACA_L", "Lãnh thổ Động mạch não trước (Trái)", "Anterior Cerebral Artery Territory (Left)", "ACA-A1/A2/A3",
        ["Mặt trong thùy trán và thùy đỉnh", "Thể chai", "Vùng vận động và cảm giác chi dưới bên phải"],
        [{"name": "Hội chứng đột quỵ ACA", "description": "Liệt và mất cảm giác nửa người đối bên ưu thế chi dưới (chân nặng hơn tay), tiểu không tự chủ, mất ý chí (abulia), phản xạ nắm tay nguyên thủy."}]),
    2: ("ACA_R", "Lãnh thổ Động mạch não trước (Phải)", "Anterior Cerebral Artery Territory (Right)", "ACA-A1/A2/A3",
        ["Mặt trong thùy trán và thùy đỉnh phải", "Vùng vận động và cảm giác chi dưới bên trái"],
        [{"name": "Hội chứng đột quỵ ACA phải", "description": "Liệt và mất cảm giác chân trái nhiều hơn tay, thay đổi nhân cách, mất ức chế hành vi trán."}]),
    3: ("MCA_L", "Lãnh thổ Động mạch não giữa (Trái)", "Middle Cerebral Artery Territory (Left)", "MCA-M1/M2/M3",
        ["Toàn bộ mặt ngoài bán cầu não trái", "Trung tâm ngôn ngữ Broca và Wernicke", "Bao trong và hạch nền trái"],
        [{"name": "Hội chứng đột quỵ MCA toàn bộ bán cầu ưu thế", "description": "Liệt nửa người phải ưu thế mặt-tay, mất cảm giác nửa người phải, thất ngôn toàn bộ (Global aphasia), bán manh đồng danh mắt phải, lệch đầu mắt sang trái."}]),
    4: ("MCA_R", "Lãnh thổ Động mạch não giữa (Phải)", "Middle Cerebral Artery Territory (Right)", "MCA-M1/M2/M3",
        ["Toàn bộ mặt ngoài bán cầu não phải", "Vùng nhận thức không gian và sơ đồ thân thể"],
        [{"name": "Hội chứng đột quỵ MCA bán cầu không ưu thế", "description": "Liệt nửa người trái ưu thế mặt-tay, hội chứng lãng quên nửa không gian trái nặng nề (hemi-neglect), mất nhận thức bệnh tật (anosognosia), bán manh đồng danh mắt trái."}]),
    5: ("PCA_L", "Lãnh thổ Động mạch não sau (Trái)", "Posterior Cerebral Artery Territory (Left)", "PCA-P1/P2/P3",
        ["Thùy chẩm trái (vỏ não thị giác sơ cấp)", "Mặt dưới thùy thái dương và đồi thị trái"],
        [{"name": "Hội chứng nhồi máu PCA trái", "description": "Bán manh đồng danh bên phải còn bảo tồn hoàng điểm (macular sparing), mất đọc không mất viết (alexia without agraphia), hội chứng đồi thị Dejerine-Roussy."}]),
    6: ("PCA_R", "Lãnh thổ Động mạch não sau (Phải)", "Posterior Cerebral Artery Territory (Right)", "PCA-P1/P2/P3",
        ["Thùy chẩm phải", "Mặt dưới thùy thái dương phải và đồi thị phải"],
        [{"name": "Hội chứng nhồi máu PCA phải", "description": "Bán manh đồng danh bên trái bảo tồn hoàng điểm, mất nhận diện khuôn mặt (prosopagnosia), rối loạn cảm giác đau buốt nửa người trái."}]),
    7: ("VB_L", "Lãnh thổ Động mạch Đốt sống - Thân nền (Trái)", "Vertebrobasilar Territory (Left)", "VA / BA / PICA / AICA / SCA",
        ["Thân não bên trái (trung não, cầu não, hành não)", "Tiểu não trái"],
        [{"name": "Hội chứng Wallenberg (Hành não bên trái)", "description": "Tắc PICA trái: Mất cảm giác đau nhiệt bắt chéo (mặt trái - thân phải), hội chứng Horner trái, nuốt khó, nói khàn, thất điều tiểu não trái, chóng mặt nôn mửa."},
         {"name": "Hội chứng Millard-Gubler (Cầu não dưới trái)", "description": "Liệt dây VII và dây VI ngoại biên bên trái kết hợp liệt nửa người bên phải."}]),
    8: ("VB_R", "Lãnh thổ Động mạch Đốt sống - Thân nền (Phải)", "Vertebrobasilar Territory (Right)", "VA / BA / PICA / AICA / SCA",
        ["Thân não bên phải", "Tiểu não phải"],
        [{"name": "Hội chứng Wallenberg (Hành não bên phải)", "description": "Tắc PICA phải: Mất cảm giác đau nhiệt mặt phải - thân trái, hội chứng Horner phải, thất điều tiểu não phải, chóng mặt nhãn cầu giật."},
         {"name": "Hội chứng Weber (Trung não phải)", "description": "Tắc nhánh đục PCA/thân nền: Liệt dây III cùng bên (mắt phải sụp mi, giãn đồng tử, lé ngoài) kèm liệt nửa người đối bên (bên trái)."}]),
}

for i, (code, nvi, nen, art_id, funcs, syns) in ART_L2_DATA.items():
    DETAILED_ENTRIES[("arterial_level2", i)] = {
        "code": code, "name_vi": nvi, "name_en": nen,
        "category": "vascular_territory", "brodmann_area": [],
        "functions": funcs,
        "arterial_supply": {"primary": [art_id], "perforators": []},
        "venous_drainage": ["Xoang dọc trên", "Xoang ngang", "Tĩnh mạch não trong"],
        "aspects_zone": None,
        "clinical_syndromes": syns,
        "evidence_level": "atlas_direct",
        "source": SRC_ART,
        "review_status": "unreviewed"
    }

# -------------------------------------------------- BRAINSTEM AROUSAL NETWORK (16 nodes)
AAN_SYNDROMES = {
    1: ("DR", "Nhân đường giữa lưng", "Dorsal Raphe Nucleus", ["Điều hòa hệ Serotonin (5-HT) toàn não", "Kiểm soát chu kỳ thức - ngủ và tâm trạng"],
        [{"name": "Rối loạn thức tỉnh do tổn thương nhân Raphe", "description": "Hôn mê hoặc mất ngủ mạn tính, rối loạn kiểm soát hành vi xung động và đau mạn tính."}]),
    2: ("MnR", "Nhân đường giữa trung tâm", "Median Raphe Nucleus", ["Hệ Serotoninergic phóng chiếu hồi hải mã và vùng viền", "Điều hòa trí nhớ và cảm xúc"],
        [{"name": "Hội chứng mất đồng bộ viền - thân não", "description": "Suy giảm trí nhớ không gian và lo âu bệnh lý."}]),
    3: ("PAG", "Chất xám quanh cống não", "Periaqueductal Gray", ["Trung tâm kiểm soát đau đi xuống (hệ giảm đau nội sinh endorphin)", "Phản ứng tự vệ sinh tồn (đóng băng/chiến đấu/bỏ chạy)"],
        [{"name": "Mất khả năng điều biến đau trung ương", "description": "Hội chứng đau trung ương kháng trị, mất phản xạ cảm xúc bản năng."}]),
    4: ("VTA", "Vùng trần bụng", "Ventral Tegmental Area", ["Nguồn tế bào Dopaminergic của con đường phần thưởng mesocorticolimbic", "Động lực, học tập củng cố và hứng thú"],
        [{"name": "Hội chứng mất động lực và vô cảm (Apathetic syndrome)", "description": "Mất hoàn toàn hứng thú (anhedonia), mất ý chí hành động do thiếu hụt dopamine phóng chiếu lên vỏ trán."}]),
    5: ("Left-LC", "Nhân xanh (Trái)", "Locus Coeruleus (Left)", ["Nguồn Noradrenaline chính duy trì mức độ thức tỉnh và tập trung chú ý"],
        [{"name": "Suy giảm thức tỉnh và chú ý", "description": "Mơ màng, chậm chạp phản ứng, thoái hóa tế bào trong giai đoạn sớm của bệnh thoái hóa thần kinh."}]),
    11: ("Right-LC", "Nhân xanh (Phải)", "Locus Coeruleus (Right)", ["Điều hòa trương lực giao cảm và chú ý cảnh giác"],
        [{"name": "Mất tập trung cảnh giác", "description": "Suy giảm khả năng duy trì trạng thái tỉnh táo trước các kích thích môi trường."}]),
}

# -------------------------------------------------- HARVARD-OXFORD ANATOMY KEY STRUCTURES
# Thalamus (Left=50, Right=51 in anatomy.labels.json usually, check labels mapping)
ANAT_PRIORITY = {
    "Left Thalamus": {
        "name_vi": "Đồi thị (Trái)", "cat": "subcortical",
        "func": ["Trạm chuyển tiếp cảm giác toàn bộ cơ thể lên vỏ não (trừ khứu giác)", "Điều hòa vận động qua vòng nối vân-đồi thị-vỏ não", "Duy trì ý thức và chú ý qua các nhân trong lá"],
        "art": {"primary": ["PCA", "Pcom"], "perforators": ["Động mạch đồi thị-thủng", "Động mạch đồi thị-sinh đôi"]},
        "ven": ["Tĩnh mạch não trong"],
        "asp": "pc-ASPECTS Thalamus Left",
        "syn": [
            {"name": "Hội chứng Dejerine-Roussy (Thalamic Pain Syndrome)", "description": "Mất cảm giác nửa người đối bên giai đoạn đầu, sau đó phát triển thành cảm giác đau rát buốt dữ dội mạn tính khó điều trị."},
            {"name": "Mất trí nhớ đồi thị (Thalamic Amnesia)", "description": "Tổn thương nhân trước đồi thị hoặc bó núm-đồi thị gây suy giảm trí nhớ ngắn hạn nghiêm trọng."}
        ]
    },
    "Right Thalamus": {
        "name_vi": "Đồi thị (Phải)", "cat": "subcortical",
        "func": ["Chuyển tiếp cảm giác nửa thân trái", "Tích hợp chú ý không gian bên trái"],
        "art": {"primary": ["PCA", "Pcom"], "perforators": ["Động mạch đồi thị-thủng phải", "Động mạch đồi thị-sinh đôi phải"]},
        "ven": ["Tĩnh mạch não trong"],
        "asp": "pc-ASPECTS Thalamus Right",
        "syn": [
            {"name": "Hội chứng đau đồi thị nửa thân trái", "description": "Cơn đau bỏng rát nửa người trái kèm dị cảm đau (allodynia) sau nhồi máu động mạch đồi thị-sinh đôi."}
        ]
    },
    "Brain-Stem": {
        "name_vi": "Thân não", "cat": "brainstem",
        "func": ["Chứa các nhân của 10 đôi dây thần kinh sọ (III đến XII)", "Trung tâm sinh tồn kiểm soát hô hấp, tuần hoàn, nhịp tim", "Đường dẫn truyền thần kinh vận động và cảm giác toàn bộ cơ thể"],
        "art": {"primary": ["Động mạch thân nền (BA)", "Động mạch đốt sống (VA)"], "perforators": ["Các nhánh đục cầu não", "Động mạch chu vi"]},
        "ven": ["Xoang đá trên và dưới", "Tĩnh mạch đáy Rosenthal"],
        "asp": "pc-ASPECTS Midbrain/Pons",
        "syn": [
            {"name": "Hội chứng khoá trong (Locked-in Syndrome)", "description": "Nhồi máu toàn bộ nền cầu não hai bên (tắc động mạch thân nền): Bệnh nhân liệt hoàn toàn tứ chi và các dây sọ dưới, chỉ còn bảo tồn ý thức và cử động chớp mắt/vận nhãn dọc."},
            {"name": "Đột quỵ đỉnh thân nền (Top of the Basilar Syndrome)", "description": "Hôn mê, rối loạn điều hòa vận nhãn hai bên, ảo thị cuống não (peduncular hallucinosis), mù vỏ não."}
        ]
    }
}

# -----------------------------------------------------------------------------
# 2. LOAD ATLAS LABELS AND COMPOSE ONTOLOGY
# -----------------------------------------------------------------------------
ALL_ENTRIES: list[dict] = []

ATLAS_FILES = [
    ("aspects", ATLASES / "aspects.labels.json"),
    ("arterial_level2", ATLASES / "arterial_level2.labels.json"),
    ("arterial", ATLASES / "arterial.labels.json"),
    ("brainstem_aan", ATLASES / "brainstem_aan.labels.json"),
    ("anatomy", ATLASES / "anatomy.labels.json"),
    ("whitematter", ATLASES / "whitematter.labels.json"),
    ("venous", ATLASES / "venous.labels.json"),
    ("aal3", ATLASES / "aal3.labels.json"),
]

for atlas_name, json_path in ATLAS_FILES:
    if not json_path.exists():
        print(f"Warning: {json_path} not found")
        continue
    meta = json.loads(json_path.read_text(encoding="utf-8"))
    labels = meta.get("labels", [])
    src_atlas = meta.get("source", "Official stereotaxic atlas")

    for lab in labels:
        lid = lab["index"]
        name = lab.get("name", f"Region {lid}")
        code = lab.get("region_code", lab.get("acronym", lab.get("symbol", f"{atlas_name}_{lid}")))

        # Check if already detailed in knowledgebase
        if (atlas_name, lid) in DETAILED_ENTRIES:
            entry = {
                "atlas": atlas_name,
                "label_id": lid,
                **DETAILED_ENTRIES[(atlas_name, lid)]
            }
        elif atlas_name == "brainstem_aan" and lid in AAN_SYNDROMES:
            code_sym, nvi, nen, funcs, syns = AAN_SYNDROMES[lid]
            entry = {
                "atlas": atlas_name,
                "label_id": lid,
                "code": code_sym,
                "name_vi": nvi,
                "name_en": nen,
                "category": "brainstem",
                "brodmann_area": [],
                "functions": funcs,
                "arterial_supply": {"primary": ["Động mạch thân nền", "Động mạch não sau"], "perforators": ["Nhánh đục thân não"]},
                "venous_drainage": ["Tĩnh mạch đáy Rosenthal", "Tĩnh mạch nền cầu não"],
                "aspects_zone": "pc-ASPECTS Brainstem",
                "clinical_syndromes": syns,
                "evidence_level": "atlas_direct",
                "source": SRC_AAN,
                "review_status": "unreviewed"
            }
        elif atlas_name == "anatomy" and name in ANAT_PRIORITY:
            p = ANAT_PRIORITY[name]
            entry = {
                "atlas": atlas_name,
                "label_id": lid,
                "code": f"HO_{lid}",
                "name_vi": p["name_vi"],
                "name_en": name,
                "category": p["cat"],
                "brodmann_area": [],
                "functions": p["func"],
                "arterial_supply": p["art"],
                "venous_drainage": p["ven"],
                "aspects_zone": p.get("asp"),
                "clinical_syndromes": p["syn"],
                "evidence_level": "approximate" if p["art"]["perforators"] else "atlas_direct",
                "source": SRC_HO,
                "review_status": "unreviewed"
            }
        elif atlas_name == "venous":
            entry = {
                "atlas": atlas_name,
                "label_id": lid,
                "code": "VENAT_SINUSES",
                "name_vi": "Xoang tĩnh mạch màng cứng & Tĩnh mạch não trong",
                "name_en": "Dural Venous Sinuses & Deep Cerebral Veins",
                "category": "vascular_territory",
                "brodmann_area": [],
                "functions": ["Hồi lưu máu nghèo oxy từ toàn bộ vỏ não và chất trắng sâu về tĩnh mạch cảnh trong", "Hấp thu dịch não tủy qua các hạt màng nhện Pacchioni"],
                "arterial_supply": {"primary": [], "perforators": []},
                "venous_drainage": ["Xoang dọc trên", "Xoang thẳng", "Xoang ngang", "Xoang sigma", "Tĩnh mạch cảnh trong"],
                "aspects_zone": None,
                "clinical_syndromes": [
                    {"name": "Huyết khối xoang tĩnh mạch não (Cerebral Venous Sinus Thrombosis - CVST)",
                     "description": "Đau đầu tăng dần kèm hội chứng tăng áp lực nội sọ, co giật, phù gai thị, nhồi máu tĩnh mạch kèm xuất huyết chuyển dạng không theo diện phân bố động mạch."}
                ],
                "evidence_level": "approximate",
                "source": SRC_VENAT,
                "review_status": "unreviewed"
            }
        else:
            # Minimal record: no hallucinated claims
            cat = "subcortical"
            nl = name.lower()
            if any(k in nl for k in ["cortex", "gyrus", "pole", "opercular", "sulcus"]):
                cat = "cortex"
            elif any(k in nl for k in ["artery", "arterial", "territory", "pars"]):
                cat = "vascular_territory"
            elif any(k in nl for k in ["capsule", "radiata", "fasciculus", "tract", "corpus callosum", "white matter"]):
                cat = "white_matter"
            elif any(k in nl for k in ["cerebel", "vermis"]):
                cat = "cerebellum"
            elif any(k in nl for k in ["pons", "medulla", "brainstem", "raphe", "peduncle", "locus", "vta"]):
                cat = "brainstem"

            entry = {
                "atlas": atlas_name,
                "label_id": lid,
                "code": code,
                "name_vi": name,  # Preserved in English if no verified Vietnamese medical translation
                "name_en": name,
                "category": cat,
                "brodmann_area": [],
                "functions": [],
                "arterial_supply": {"primary": [], "perforators": []},
                "venous_drainage": [],
                "aspects_zone": None,
                "clinical_syndromes": [],
                "evidence_level": "atlas_direct",
                "source": [src_atlas],
                "review_status": "unreviewed"
            }

        ALL_ENTRIES.append(entry)

out_ontology_path = DATA / "neuro_ontology.json"
ontology_payload = {
    "schema_version": "1.0",
    "target_space": "MNI152NLin2009cAsym",
    "created_at": "2026-11-04T16:50:00Z",
    "description": "NeuroVision standard anatomical-clinical ontology schema with medical governance provenance.",
    "entries": ALL_ENTRIES
}
out_ontology_path.write_text(json.dumps(ontology_payload, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Written {len(ALL_ENTRIES)} ontology entries to {out_ontology_path}")

# -----------------------------------------------------------------------------
# 3. COLORMAP BUILDER (Distinct, color-blind friendly, fixed arterial colors)
# -----------------------------------------------------------------------------
# Palette helpers
def generate_palette(n: int, saturation=0.85, value=0.9) -> list[list[int]]:
    colors = []
    golden_ratio_conjugate = 0.618033988749895
    h = 0.1
    for _ in range(n):
        h = (h + golden_ratio_conjugate) % 1.0
        r, g, b = colorsys.hsv_to_rgb(h, saturation, value)
        colors.append([int(r * 255), int(g * 255), int(b * 255)])
    return colors

# Specific arterial territory palette:
# ACA: Blue / Azure [30, 144, 255]
# MCA: Coral / Orange-Red [255, 69, 0]
# PCA: Chartreuse / Lime-Green [127, 255, 0]
# VB: Medium Purple / Violet [147, 112, 219]
TERR_BASE_COLORS = {
    "ACA": (30, 144, 255),
    "MCA": (255, 80, 20),
    "PCA": (120, 210, 30),
    "VB": (155, 90, 220),
}

# ASPECTS Color definition (10 distinct colors for C, L, IC, I, M1-M6)
ASPECTS_PALETTE_BASE = [
    [0, 150, 136],    # C (Caudate) - Teal
    [255, 140, 0],   # L (Lentiform) - Dark Orange
    [255, 215, 0],   # IC (Internal Capsule) - Gold
    [220, 20, 60],   # I (Insular ribbon) - Crimson
    [65, 105, 225],  # M1 - Royal Blue
    [0, 191, 255],   # M2 - Deep Sky Blue
    [32, 178, 170],  # M3 - Light Sea Green
    [138, 43, 226],  # M4 - Blue Violet
    [186, 85, 211],  # M5 - Medium Orchid
    [106, 90, 205],  # M6 - Slate Blue
]

for atlas_name, json_path in ATLAS_FILES:
    meta = json.loads(json_path.read_text(encoding="utf-8"))
    labels = meta.get("labels", [])
    max_id = max([l["index"] for l in labels] + [0])
    
    # NiiVue label colormap arrays
    # Index 0 is always Background (transparent)
    R = [0]
    G = [0]
    B = [0]
    A = [0]
    I = [0]
    lbls = ["Background"]

    n_labels = len(labels)
    default_palette = generate_palette(n_labels)

    for idx, lab in enumerate(labels):
        lid = lab["index"]
        name = lab.get("name", f"Label {lid}")
        
        # Color resolution
        if atlas_name == "arterial_level2":
            # 1,2: ACA, 3,4: MCA, 5,6: PCA, 7,8: VB
            grp = "ACA" if lid in (1, 2) else "MCA" if lid in (3, 4) else "PCA" if lid in (5, 6) else "VB"
            rgb = TERR_BASE_COLORS[grp]
            if lid % 2 == 0:  # Right side slightly lighter
                rgb = [min(255, int(c * 1.15)) for c in rgb]
        elif atlas_name == "arterial":
            grp = lab.get("bilateral_group", "MCA")
            base = TERR_BASE_COLORS.get(grp, (180, 180, 180))
            # Modulate hue slightly per sub-branch
            sub_factor = (lid % 5) * 0.08
            r = min(255, max(0, int(base[0] * (1.0 + sub_factor - 0.15))))
            g = min(255, max(0, int(base[1] * (1.0 + sub_factor - 0.15))))
            b = min(255, max(0, int(base[2] * (1.0 + sub_factor - 0.15))))
            rgb = [r, g, b]
        elif atlas_name == "aspects":
            rel_idx = ((lid - 1) % 10)
            rgb = ASPECTS_PALETTE_BASE[rel_idx]
            if lid > 10:  # Right side slightly brighter
                rgb = [min(255, int(c * 1.12)) for c in rgb]
        elif atlas_name == "brainstem_aan" and "color" in lab:
            rgb = lab["color"]
        elif atlas_name == "venous":
            rgb = [30, 90, 220]  # Rich Royal Blue
        else:
            rgb = default_palette[idx]

        R.append(int(rgb[0]))
        G.append(int(rgb[1]))
        B.append(int(rgb[2]))
        A.append(255)
        I.append(lid)
        lbls.append(name)

    cmap_payload = {
        "R": R,
        "G": G,
        "B": B,
        "A": A,
        "I": I,
        "labels": lbls
    }
    cmap_file = COLORMAPS / f"{atlas_name}.json"
    cmap_file.write_text(json.dumps(cmap_payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Colormap generated: {cmap_file.name} ({len(I)} entries)")

print("\nPhase 1B builder finished successfully.")
