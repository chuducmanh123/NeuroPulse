import {
  ClinicalScenario,
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
} from "../types/neuroguide";

export const MOCK_CLINICAL_SCENARIOS: ClinicalScenario[] = [
  {
    id: "ais-ivt-tenecteplase-4.5h",
    titleVi: "Tenecteplase (TNK) thay thế Alteplase trong Tiêu sợi huyết đường tĩnh mạch cửa sổ < 4.5h",
    titleEn: "Tenecteplase vs. Alteplase for Acute Ischemic Stroke within 4.5 Hours",
    subspecialty: "Stroke",
    summaryVi:
      "Chỉ định sử dụng Tenecteplase (liều 0.25 mg/kg, tối đa 25mg) bolus tĩnh mạch duy nhất thay thế Alteplase truyền 1 giờ ở bệnh nhân nhồi máu não cấp đến viện trong 4.5 giờ đầu.",
    keyTags: ["Tenecteplase", "TNK-tPA", "Alteplase", "IV Thrombolysis", "Door-to-Needle"],
    statusBadge: "PRACTICE_CHANGING",
    hasConfAlert: true,
    confAlertText: "Đã có thêm kết quả dài hạn từ AcT và ATTEST-2 xác nhận tính tương đương và an toàn cao",
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "ESO (2024) và Hội Đột quỵ Việt Nam đã nâng TNK lên ngang hàng hoặc ưu tiên hơn Alteplase nhờ tính tiện lợi bolus 5 giây. Bản AHA/ASA (2019) ban đầu chỉ xếp Class IIb do thời điểm xuất bản trước các RCT lớn (AcT, TRACE-2, ORIGINAL); tuy nhiên bản cập nhật AHA/ASA 2026 đã chính thức nâng lên Class I.",
      clinicalBottomLine:
        "Tenecteplase 0.25 mg/kg (tối đa 25 mg) tiêm tĩnh mạch trực tiếp (bolus) 5–10 giây là giải pháp thay thế hợp lý, ưu việt cho Alteplase, đặc biệt tại các trung tâm cần chuyển viện can thiệp lấy huyết khối (Drip-and-Ship).",
      resourceDependency: "Standard Care",
      lastAppraisedAt: "2026-03-15",
    },
    temporalEvolution: [
      {
        society: "AHA/ASA",
        previousYear: 2019,
        previousGrade: "Class IIb, Level B-R",
        currentYear: 2026,
        currentGrade: "Class I, Level A",
        shiftDirection: "UPGRADED",
        drivingTrials: ["AcT (Lancet 2022)", "TRACE-2 (Lancet 2023)", "ORIGINAL (Stroke 2024)"],
        evolutionNarrative:
          "Từ chỗ chỉ được xem xét thận trọng cho trường hợp tắc mạch lớn chuẩn bị can thiệp (2019), các thử nghiệm không thua kém (non-inferiority) quy mô hàng nghìn bệnh nhân đã đưa TNK 0.25mg/kg lên mức khuyến cáo loại I tương đương Alteplase.",
      },
      {
        society: "ESO",
        previousYear: 2021,
        previousGrade: "Weak recommendation, Moderate quality",
        currentYear: 2024,
        currentGrade: "Strong recommendation FOR, High quality",
        shiftDirection: "UPGRADED",
        drivingTrials: ["AcT", "NOR-TEST 2A/2B", "ATTEST-2"],
        evolutionNarrative:
          "ESO Living Guidelines nâng khuyến cáo mạnh mẽ sử dụng TNK 0.25mg/kg cho mọi đối tượng đủ tiêu chuẩn tiêu sợi huyết tĩnh mạch < 4.5h.",
      },
    ],
    ecosystemLinks: [
      {
        app: "NeuroRx",
        href: "#",
        label: "Tính liều TNK theo Cân nặng",
        badge: "0.25 mg/kg",
        description: "Tự động tính liều bolus, kiểm tra giới hạn trần 25mg và hướng dẫn pha dung dịch.",
      },
      {
        app: "NeuroCalc",
        href: "#",
        label: "Đánh giá Thang điểm NIHSS",
        badge: "Chỉ định IVT",
        description: "Tính điểm định lượng khiếm khuyết thần kinh trước và sau tiêm tiêu sợi huyết.",
      },
    ],
  },
  {
    id: "ais-large-core-evt-aspects-3-5",
    titleVi: "Can thiệp lấy huyết khối cơ học (EVT) ở bệnh nhân nhồi máu diện rộng / Lõi lớn (ASPECTS 3–5)",
    titleEn: "Endovascular Thrombectomy for Acute Ischemic Stroke with Large Ischemic Core (ASPECTS 3–5)",
    subspecialty: "Stroke",
    summaryVi:
      "Chỉ định can thiệp nội mạch lấy huyết khối cơ học cho tắc động mạch cảnh trong hoặc đoạn M1 động mạch não giữa có tổn thương thiếu máu diện rộng trên CT/MRI (ASPECTS 3–5 hoặc thể tích lõi nhồi máu ≥50 ml).",
    keyTags: ["Large Core", "ASPECTS 3-5", "EVT", "Thrombectomy", "SELECT2", "TENSION", "LASTE"],
    statusBadge: "UPGRADED",
    hasConfAlert: true,
    confAlertText: "Thử nghiệm LASTE công bố tại ESOC mở rộng chỉ định xuống tận ASPECTS 0–2",
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "Trước năm 2023, cả AHA và ESO đều loại trừ hoặc khuyến cáo dè dặt (Class IIb) với ASPECTS < 6 do lo sợ nguy cơ xuất huyết chuyển dạng sICH và tử vong cao. Chuỗi 6 thử nghiệm RCT pha 3 (RESCUE-JAPAN, SELECT2, ANGEL-ASPECT, TENSION, TESLA, LASTE) đã thay đổi hoàn toàn hướng dẫn điều trị toàn cầu.",
      clinicalBottomLine:
        "Bệnh nhân tắc mạch lớn có ASPECTS 3–5 trong vòng 24 giờ kể từ khi khởi phát NÊN được can thiệp lấy huyết khối cơ học kết hợp điều trị nội khoa tối ưu, mang lại tỷ lệ hồi phục chức năng độc lập (mRS 0–2) vượt trội so với chỉ dùng thuốc thuần túy.",
      resourceDependency: "Requires Advanced Perfusion/AI",
      lastAppraisedAt: "2026-02-20",
    },
    temporalEvolution: [
      {
        society: "AHA/ASA",
        previousYear: 2019,
        previousGrade: "Class IIb, Level B-R (Chưa khuyến cáo thường quy)",
        currentYear: 2026,
        currentGrade: "Class I, Level A",
        shiftDirection: "UPGRADED",
        drivingTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)"],
        evolutionNarrative:
          "Bước chuyển mình lịch sử từ loại trừ bệnh nhân lõi lớn sang khuyến cáo can thiệp mạnh mẽ bậc nhất Class I cho ASPECTS 3–5.",
      },
    ],
    ecosystemLinks: [
      {
        app: "NeuroVision",
        href: "#",
        label: "Phân vùng chấm điểm ASPECTS & Lõi thiếu máu",
        badge: "AI Imaging",
        description: "Xác định 10 vùng nhồi máu động mạch não giữa trên CT không cản quang và CTP.",
      },
      {
        app: "NeuroCase",
        href: "/neurocase",
        label: "Ca lâm sàng: Tắc M1 kèm ASPECTS 4",
        badge: "Lâm sàng",
        description: "Xem lại hình ảnh can thiệp thực tế và diễn tiến lâm sàng của ca bệnh tương đương.",
      },
    ],
  },
  {
    id: "ich-acute-bp-lowering",
    titleVi: "Kiểm soát huyết áp cấp tính trong Xuất huyết não nguyên phát tự phát (ICH)",
    titleEn: "Acute Blood Pressure Lowering in Spontaneous Intracerebral Hemorrhage",
    subspecialty: "Stroke",
    summaryVi:
      "Ngưỡng huyết áp tâm thu mục tiêu trong giai đoạn tối cấp (2-6 giờ đầu) của xuất huyết não để hạn chế khối máu tụ lan rộng mà không làm giảm áp lực tưới máu não nghiêm trọng.",
    keyTags: ["ICH", "Blood Pressure", "Nicardipine", "Target SBP", "Hematoma Expansion"],
    statusBadge: "ESTABLISHED",
    hasConfAlert: false,
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "Cả AHA/ASA, ESO và NCS đều thống nhất mục tiêu SBP an toàn là 130–140 mmHg, đồng thời cảnh báo không được hạ SBP xuống dưới 120 mmHg hoặc giảm đột ngột >60 mmHg/giờ (nguy cơ suy thận cấp và thiếu máu não cục bộ chu vi ổ máu tụ theo kết quả ATACH-2).",
      clinicalBottomLine:
        "Khuyến cáo hạ huyết áp tâm thu nhanh chóng và duy trì ổn định trong khoảng 130–140 mmHg bằng thuốc truyền tĩnh mạch chỉnh liều liên tục (Nicardipine hoặc Labetalol); tránh dao động huyết áp quá lớn.",
      resourceDependency: "Standard Care",
      lastAppraisedAt: "2026-01-10",
    },
    temporalEvolution: [
      {
        society: "AHA/ASA",
        previousYear: 2015,
        previousGrade: "Class I, Level A (Mục tiêu <140 mmHg)",
        currentYear: 2022,
        currentGrade: "Class IIa, Level B-R (Mục tiêu 130-140 mmHg, tránh <130)",
        shiftDirection: "REVISED",
        drivingTrials: ["INTERACT2 (NEJM 2013)", "ATACH-2 (NEJM 2016)"],
        evolutionNarrative:
          "Tinh chỉnh ngưỡng an toàn: loại bỏ việc hạ quá tích cực (<120 mmHg) vì tăng tỷ lệ biến cố thận mà không tăng kết cục thần kinh tốt.",
      },
    ],
    ecosystemLinks: [
      {
        app: "NeuroRx",
        href: "#",
        label: "Phác đồ truyền Nicardipine / Labetalol",
        badge: "Dosing",
        description: "Tính tốc độ truyền mg/h và phác đồ tăng giảm liều theo dõi sát mỗi 5 phút.",
      },
      {
        app: "NeuroCalc",
        href: "#",
        label: "Thang điểm ICH Score",
        badge: "Tiên lượng",
        description: "Dự đoán tỷ lệ tử vong 30 ngày dựa trên GCS, thể tích máu tụ và tràn máu não thất.",
      },
    ],
  },
  {
    id: "status-epilepticus-rse",
    titleVi: "Xử trí Trạng thái Động kinh Kháng trị (Refractory Status Epilepticus - RSE)",
    titleEn: "Management of Refractory and Super-Refractory Status Epilepticus",
    subspecialty: "Epilepsy",
    summaryVi:
      "Phác đồ bậc 2 và bậc 3 khi cơn co giật kéo dài trên 20-30 phút không đáp ứng với Benzodiazepines (Diazepam/Midazolam) và các thuốc chống động kinh đường tĩnh mạch (Levetiracetam, Valproate, Fosphenytoin).",
    keyTags: ["Status Epilepticus", "RSE", "NORSE", "cEEG", "Midazolam Infusion", "Propofol"],
    statusBadge: "ESTABLISHED",
    hasConfAlert: true,
    confAlertText: "Phiên báo cáo AES vừa nhấn mạnh vai trò sớm của Ketamine và theo dõi cEEG liên tục",
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "ILAE, NCS và Hội Thần kinh học Hoa Kỳ đều thống nhất tiếp cận 3 bước: Bước 1 (0–10p: Benzodiazepine), Bước 2 (10–30p: Levetiracetam/Valproate/Fosphenytoin liều tải cao theo ESETT), Bước 3 (>30p: Đặt nội khí quản và truyền thuốc gây mê Propofol/Midazolam/Ketamine để đạt triệt tiêu bùng nổ trên cEEG).",
      clinicalBottomLine:
        "Khi động kinh bước sang trạng thái kháng trị (RSE), cần nhanh chóng đặt ống nội khí quản, khởi động truyền thuốc mê liên tục và bắt buộc theo dõi cEEG để dập tắt cơn lâm sàng lẫn điện não (mục tiêu burst suppression 24–48h).",
      resourceDependency: "Specialized Center Only",
      lastAppraisedAt: "2026-01-25",
    },
    ecosystemLinks: [
      {
        app: "NeuroRx",
        href: "#",
        label: "Tính liều tải Thuốc chống động kinh IV (ASM)",
        badge: "ESETT Protocol",
        description: "Liều Levetiracetam 60mg/kg (max 4.5g), Valproate 40mg/kg (max 3g).",
      },
    ],
  },
  {
    id: "dementia-amyloid-monoclonal",
    titleVi: "Kháng thể đơn dòng kháng Amyloid (Lecanemab, Donanemab) & Giám sát ARIA trong Alzheimer giai đoạn sớm",
    titleEn: "Anti-Amyloid Monoclonal Antibodies and ARIA Safety Monitoring in Early Alzheimer's Disease",
    subspecialty: "Dementia",
    summaryVi:
      "Tiêu chuẩn chọn bệnh dựa trên dấu ấn sinh học Amyloid/Tau và quy trình chụp MRI định kỳ theo dõi phù não / xuất huyết liên quan amyloid (ARIA-E, ARIA-H).",
    keyTags: ["Alzheimer", "Lecanemab", "Donanemab", "ARIA-E", "ARIA-H", "p-Tau217", "ApoE4"],
    statusBadge: "NEW",
    hasConfAlert: true,
    confAlertText: "Báo cáo mới tại AAIC về tính an toàn của phác đồ giám sát ARIA rút gọn",
    aiSynthesisAppraisal: {
      consensusLevel: "MODERATE_VARIATION",
      whyGuidelinesDiffer:
        "AAN (Mỹ) khuyến cáo áp dụng cho bệnh nhân suy giảm nhận thức nhẹ (MCI) hoặc sa sút trí tuệ nhẹ có xác nhận dương tính với Amyloid; trong khi EMA (Châu Âu) ban đầu còn thận trọng vì nguy cơ ARIA ở người mang alen ApoE ε4 đồng hợp tử. Bản đồng thuận mới 2025/2026 đã đưa ra các khuyến cáo chặt chẽ về xét nghiệm gen và lịch chụp MRI giám sát.",
      clinicalBottomLine:
        "Bắt buộc xét nghiệm kiểu gen ApoE ε4 để cảnh báo nguy cơ ARIA cho gia đình bệnh nhân. Thực hiện MRI não tại các mốc tuần 5, 9, 14 đối với Lecanemab để phát hiện sớm ARIA không triệu chứng trước khi tiếp tục truyền thuốc.",
      resourceDependency: "Specialized Center Only",
      lastAppraisedAt: "2026-03-01",
    },
  },
  {
    id: "myasthenia-gravis-refractory",
    titleVi: "Liệu pháp kháng thụ thể FcRn (Efgartigimod) và ức chế Bổ thể trong Nhược cơ kháng trị",
    titleEn: "FcRn Antagonists and Complement Inhibitors in Generalized Refractory Myasthenia Gravis",
    subspecialty: "Neuromuscular",
    summaryVi:
      "Vị trí của các thuốc sinh học thế hệ mới (Efgartigimod, Ravulizumab, Zilucoplan) so với ức chế miễn dịch truyền thống và thay huyết tương ở bệnh nhân nhược cơ toàn thể kháng trị.",
    keyTags: ["Myasthenia Gravis", "Efgartigimod", "FcRn", "Complement Inhibitor", "MG-ADL", "AChR-Ab"],
    statusBadge: "PRACTICE_CHANGING",
    hasConfAlert: false,
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "Các thử nghiệm lâm sàng pha 3 (ADAPT, CHAMPION-MG, RAISE) chứng minh cải thiện điểm MG-ADL nhanh chóng và bền vững mà không gây tác dụng phụ nặng nề như corticoid liều cao dài ngày. Được cả AAN và EAN đưa vào khuyến cáo cho nhóm kháng thuốc.",
      clinicalBottomLine:
        "Ở bệnh nhân nhược cơ toàn thể có kháng thể kháng AChR dương tính không kiểm soát được bằng Corticosteroid và thuốc ức chế miễn dịch cơ bản, kháng thể kháng FcRn (Efgartigimod) hoặc ức chế bổ thể được khuyến cáo như liệu pháp bổ trợ mục tiêu.",
      resourceDependency: "Specialized Center Only",
      lastAppraisedAt: "2026-02-12",
    },
  },
  {
    id: "cns-bacterial-meningitis",
    titleVi: "Kháng sinh kinh nghiệm và Vai trò của Dexamethasone trong Viêm màng não mủ cộng đồng",
    titleEn: "Empirical Antibiotics and Dexamethasone in Community-Acquired Acute Bacterial Meningitis",
    subspecialty: "CNS Infections",
    summaryVi:
      "Thời điểm sử dụng Corticoid (trước hoặc cùng lúc với liều kháng sinh đầu tiên) và phác đồ kháng sinh kinh nghiệm diệt Phế cầu (S. pneumoniae) kháng thuốc và Não mô cầu.",
    keyTags: ["Bacterial Meningitis", "Dexamethasone", "Ceftriaxone", "Vancomycin", "S. pneumoniae"],
    statusBadge: "ESTABLISHED",
    hasConfAlert: false,
    aiSynthesisAppraisal: {
      consensusLevel: "HIGH_CONCORDANCE",
      whyGuidelinesDiffer:
        "Cả IDSA, ESCMID và Hướng dẫn Bộ Y tế Việt Nam đều thống nhất: Dexamethasone 10mg IV phải được tiêm TRƯỚC hoặc ĐỒNG THỜI với liều kháng sinh đầu tiên (giúp giảm đáng kể tỷ lệ mất thính lực và di chứng thần kinh ở viêm màng não do phế cầu; ngưng thuốc nếu kết quả cấy không phải phế cầu).",
      clinicalBottomLine:
        "Không được trì hoãn kháng sinh để chờ chọc dò dịch não tủy hoặc chụp CT nếu bệnh nhân có dấu hiệu suy giảm tri giác hoặc nghi ngờ tăng áp lực nội sọ nặng. Tiêm ngay Dexamethasone 10mg IV kèm Ceftriaxone 2g IV + Vancomycin 15-20mg/kg.",
      resourceDependency: "Standard Care",
      lastAppraisedAt: "2026-01-18",
    },
  },
];

export const MOCK_GUIDELINE_DOCS: GuidelineDoc[] = [
  {
    id: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2026,
    title: "2026 Guidelines for the Early Management of Patients with Acute Ischemic Stroke",
    titleVi: "Hướng dẫn Xử trí Sớm Bệnh nhân Đột quỵ Thiếu máu não Cấp tính AHA/ASA 2026",
    officialUrl: "https://www.ahajournals.org/journal/str",
    journalTarget: "Stroke",
    documentType: "Clinical Practice Guideline",
    publishDate: "2026-02-10",
    previousVersionYear: 2019,
    executiveSummaryVi:
      "Bản cập nhật toàn diện nhất trong 7 năm qua của Hiệp hội Tim mạch / Đột quỵ Hoa Kỳ, tích hợp toàn bộ các bằng chứng RCT đột phá về Tenecteplase, can thiệp lấy huyết khối ở bệnh nhân nhồi máu diện rộng (ASPECTS 3–5) và mở rộng cửa sổ tưới máu não.",
    linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h", "ais-large-core-evt-aspects-3-5"],
    allPracticeChanges: [
      {
        id: "chg-aha-1",
        scenarioId: "ais-ivt-tenecteplase-4.5h",
        category: "Reperfusion / IVT",
        topic: "Tenecteplase thay thế Alteplase cửa sổ < 4.5h",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R",
        currentGrade: "Class I, Level A",
        previousText: "Tenecteplase có thể được xem xét hợp lý cho bệnh nhân đủ điều kiện lấy huyết khối.",
        currentText:
          "Tenecteplase (0.25 mg/kg, liều tối đa 25 mg tiêm tĩnh mạch trực tiếp) được khuyến cáo như một lựa chọn thay thế an toàn và hiệu quả ngang bằng với Alteplase cho tất cả bệnh nhân đột quỵ thiếu máu cấp trong vòng 4.5 giờ kể từ khi khởi phát.",
        drivingTrials: ["AcT (Lancet 2022)", "TRACE-2 (Lancet 2023)", "ORIGINAL (Stroke 2024)"],
      },
      {
        id: "chg-aha-2",
        scenarioId: "ais-large-core-evt-aspects-3-5",
        category: "Neurointervention / EVT",
        topic: "Lấy huyết khối ở nhồi máu não diện rộng (ASPECTS 3–5)",
        changeType: "UPGRADED",
        previousGrade: "Class IIb, Level B-R (Chưa khuyến cáo thường quy)",
        currentGrade: "Class I, Level A",
        previousText: "Hiệu quả của can thiệp lấy huyết khối cơ học ở bệnh nhân có ASPECTS < 6 vẫn chưa được xác lập chắc chắn.",
        currentText:
          "Đối với bệnh nhân tắc động mạch cảnh trong hoặc đoạn M1 động mạch não giữa có tổn thương thiếu máu diện rộng (ASPECTS 3–5 trên CT không cản quang hoặc thể tích lõi nhồi máu CTP ≥50 mL) trong cửa sổ 0–24 giờ, can thiệp lấy huyết khối cơ học kết hợp điều trị nội khoa được khuyến cáo mạnh mẽ để cải thiện kết cục chức năng.",
        drivingTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)", "TESLA (JAMA 2024)"],
      },
      {
        id: "chg-aha-3",
        category: "Secondary Prevention",
        topic: "Thời gian điều trị kháng kết tập tiểu cầu kép (DAPT) trong đột quỵ nhẹ / TIA nguy cơ cao",
        changeType: "REVISED",
        previousGrade: "Class I, Level A (21 ngày)",
        currentGrade: "Class I, Level A (Rút ngắn còn 21 ngày và chuyển sang đơn trị liệu)",
        previousText: "DAPT Aspirin + Clopidogrel nên bắt đầu trong 24 giờ và duy trì 21 ngày hoặc tối đa 90 ngày.",
        currentText:
          "Khuyến cáo giới hạn thời gian DAPT nghiêm ngặt trong đúng 21 ngày đầu sau đột quỵ nhẹ (NIHSS ≤3) hoặc TIA nguy cơ cao (ABCD2 ≥4), sau đó bắt buộc chuyển sang đơn trị liệu để tránh nguy cơ xuất huyết tiêu hóa và xuất huyết nội sọ.",
        drivingTrials: ["CHANCE", "POINT", "THALES"],
      },
      {
        id: "chg-aha-4",
        category: "Blood Pressure",
        topic: "Ngưỡng huyết áp trước khi tiêm thuốc tiêu sợi huyết",
        changeType: "REVISED",
        previousGrade: "Class I, Level B-NR",
        currentGrade: "Class I, Level B-NR",
        currentText: "Huyết áp phải được hạ xuống dưới 185/110 mmHg trước khi khởi đầu IVT và duy trì dưới 180/105 mmHg trong ít nhất 24 giờ sau điều trị.",
      },
    ],
  },
  {
    id: "eso-ais-2024",
    society: "ESO",
    year: 2024,
    title: "European Stroke Organisation (ESO) Expedited Recommendation on Intravenous Thrombolysis and Thrombectomy",
    titleVi: "Khuyến cáo Cập nhật Nhanh của Hội Đột quỵ Châu Âu (ESO 2024) về Tiêu sợi huyết và Can thiệp Nội mạch",
    officialUrl: "https://journals.sagepub.com/home/eso",
    journalTarget: "Eur Stroke J",
    documentType: "Focused Update",
    publishDate: "2024-05-18",
    previousVersionYear: 2021,
    executiveSummaryVi:
      "Tập trung vào 2 chỉ định mang tính thời đại: Chính thức công nhận Tenecteplase 0.25 mg/kg là lựa chọn hàng đầu, và mở rộng can thiệp lấy huyết khối cho toàn bộ bệnh nhân có tổn thương lõi nhồi máu lớn (Large Core) theo hệ thống đánh giá GRADE.",
    linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h", "ais-large-core-evt-aspects-3-5"],
    allPracticeChanges: [
      {
        id: "chg-eso-1",
        scenarioId: "ais-ivt-tenecteplase-4.5h",
        category: "Reperfusion",
        topic: "Khuyến cáo mạnh mẽ cho Tenecteplase 0.25 mg/kg",
        changeType: "UPGRADED",
        previousGrade: "Weak recommendation, Moderate quality",
        currentGrade: "Strong recommendation FOR, High quality",
        previousText: "Tenecteplase có thể được xem xét sử dụng ở những nơi đã có kinh nghiệm hoặc bệnh nhân chuẩn bị chuyển can thiệp.",
        currentText:
          "Ở bệnh nhân đột quỵ thiếu máu não cấp đủ điều kiện tiêu sợi huyết trong 4.5 giờ, chúng tôi khuyến cáo mạnh mẽ dùng Tenecteplase liều 0.25 mg/kg (liều tối đa 25 mg) thay thế cho Alteplase 0.9 mg/kg.",
        drivingTrials: ["AcT", "TRACE-2", "NOR-TEST 2A"],
      },
      {
        id: "chg-eso-2",
        scenarioId: "ais-large-core-evt-aspects-3-5",
        category: "Reperfusion",
        topic: "Lấy huyết khối cho bệnh nhân lõi lớn (Large Ischemic Core)",
        changeType: "UPGRADED",
        previousGrade: "Expert Consensus Statement",
        currentGrade: "Strong recommendation FOR, High quality",
        currentText:
          "Ở bệnh nhân nhồi máu não cấp do tắc động mạch cảnh trong hoặc M1 có tổn thương lõi lớn (ASPECTS 3–5 hoặc thể tích lõi ≥50ml), chúng tôi khuyến cáo mạnh mẽ can thiệp lấy huyết khối cơ học kết hợp điều trị nội khoa.",
        drivingTrials: ["SELECT2", "ANGEL-ASPECT", "TENSION", "LASTE"],
      },
    ],
  },
  {
    id: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    title: "Hướng dẫn Chẩn đoán và Xử trí Đột quỵ Não - Bộ Y tế & Hội Đột quỵ Việt Nam",
    titleVi: "Hướng dẫn Chẩn đoán và Điều trị Đột quỵ Não (Bộ Y tế & Hội Đột quỵ Việt Nam)",
    officialUrl: "https://kcb.vn",
    journalTarget: "BYT / VNSO",
    documentType: "Clinical Practice Guideline",
    publishDate: "2025-08-20",
    executiveSummaryVi:
      "Văn bản pháp quy chuẩn hóa thực hành đột quỵ tại các bệnh viện Việt Nam: Đưa Tenecteplase vào danh mục thanh toán bảo hiểm y tế cho chỉ định nhồi máu não cấp và chuẩn hóa quy trình can thiệp lấy huyết khối mạch não.",
    linkedScenarioIds: ["ais-ivt-tenecteplase-4.5h", "ais-large-core-evt-aspects-3-5"],
    allPracticeChanges: [
      {
        id: "chg-vn-1",
        scenarioId: "ais-ivt-tenecteplase-4.5h",
        category: "Tiêu sợi huyết",
        topic: "Phê duyệt Tenecteplase trong thực hành lâm sàng",
        changeType: "NEW",
        currentGrade: "Khuyến cáo Áp dụng (Tương đương Class I)",
        currentText:
          "Chấp thuận Tenecteplase 0.25 mg/kg (tối đa 25mg) bolus tĩnh mạch như thuốc tiêu sợi huyết chuẩn tại các trung tâm và đơn vị đột quỵ trên toàn quốc, đặc biệt ưu tiên chuyển tuyến can thiệp.",
      },
    ],
  },
];

export const MOCK_RECOMMENDATION_ATOMS: RecommendationAtom[] = [
  // Scenario 1: ais-ivt-tenecteplase-4.5h
  {
    id: "rec-aha-2026-tnk",
    scenarioId: "ais-ivt-tenecteplase-4.5h",
    guidelineDocId: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2026,
    originalGrade: "Class I, Level of Evidence A",
    normalizedTier: 1,
    recommendationText:
      "Tenecteplase (0.25 mg/kg bolus duy nhất, tối đa 25 mg) được khuyến cáo là một lựa chọn thay thế an toàn và hiệu quả tương đương Alteplase cho bệnh nhân nhồi máu não cấp trong 4.5 giờ đầu.",
    eligibilityCriteria: "Khởi phát < 4.5h, loại trừ xuất huyết não trên CT/MRI, huyết áp < 185/110 mmHg, INR ≤ 1.7.",
    citedTrials: ["AcT (Lancet 2022)", "TRACE-2 (Lancet 2023)", "ORIGINAL (Stroke 2024)"],
    isLatestForSociety: true,
    notesVi: "Tiêm bolus duy nhất trong 5-10 giây, giúp rút ngắn thời gian Door-to-Needle khoảng 15-20 phút so với Alteplase.",
  },
  {
    id: "rec-eso-2024-tnk",
    scenarioId: "ais-ivt-tenecteplase-4.5h",
    guidelineDocId: "eso-ais-2024",
    society: "ESO",
    year: 2024,
    originalGrade: "Strong recommendation FOR, High quality evidence",
    normalizedTier: 1,
    recommendationText:
      "ESO khuyến cáo mạnh mẽ dùng Tenecteplase 0.25 mg/kg (tối đa 25 mg) thay thế cho Alteplase 0.9 mg/kg cho bệnh nhân nhồi máu não cấp < 4.5h.",
    eligibilityCriteria: "Áp dụng cho cả bệnh nhân tắc mạch nhánh nhỏ và bệnh nhân có tắc mạch lớn chuẩn bị chuyển can thiệp lấy huyết khối.",
    citedTrials: ["AcT", "TRACE-2", "NOR-TEST 2A"],
    isLatestForSociety: true,
    notesVi: "Mức khuyến cáo cao nhất trong hệ thống GRADE của Châu Âu.",
  },
  {
    id: "rec-vn-2025-tnk",
    scenarioId: "ais-ivt-tenecteplase-4.5h",
    guidelineDocId: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    originalGrade: "Khuyến cáo Áp dụng Thực hành (Mức độ A)",
    normalizedTier: 1,
    recommendationText:
      "Bộ Y tế & Hội Đột quỵ Việt Nam thống nhất khuyến cáo sử dụng Tenecteplase 0.25 mg/kg (tối đa 25mg) bolus tĩnh mạch 5 giây, ưu tiên áp dụng tại các cơ sở chuyển viện can thiệp (Drip and Ship).",
    eligibilityCriteria: "Tuân thủ bảng kiểm an toàn tiêu sợi huyết quốc gia của Bộ Y tế.",
    citedTrials: ["AcT", "TRACE-2", "Dữ liệu đa trung tâm Việt Nam"],
    isLatestForSociety: true,
    notesVi: "Đã có trong danh mục hướng dẫn điều trị chuẩn tại các bệnh viện tuyến tỉnh và trung ương.",
  },

  // Scenario 2: ais-large-core-evt-aspects-3-5
  {
    id: "rec-aha-2026-largecore",
    scenarioId: "ais-large-core-evt-aspects-3-5",
    guidelineDocId: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2026,
    originalGrade: "Class I, Level of Evidence A",
    normalizedTier: 1,
    recommendationText:
      "Can thiệp lấy huyết khối cơ học kết hợp điều trị nội khoa được khuyến cáo mạnh mẽ cho bệnh nhân tắc ICA hoặc M1 có ASPECTS 3–5 hoặc thể tích lõi nhồi máu ≥50 ml trong vòng 24 giờ.",
    eligibilityCriteria: "ASPECTS 3–5 trên NCCT hoặc MRI DWI; mRS trước đột quỵ 0–1; không có xuất huyết nội sọ.",
    citedTrials: ["SELECT2 (NEJM 2023)", "ANGEL-ASPECT (NEJM 2023)", "TENSION (Lancet 2023)"],
    isLatestForSociety: true,
    notesVi: "Số bệnh nhân cần điều trị (NNT) để có thêm 1 bệnh nhân hồi phục độc lập chức năng chỉ là 5–6.",
  },
  {
    id: "rec-eso-2024-largecore",
    scenarioId: "ais-large-core-evt-aspects-3-5",
    guidelineDocId: "eso-ais-2024",
    society: "ESO",
    year: 2024,
    originalGrade: "Strong recommendation FOR, High quality evidence",
    normalizedTier: 1,
    recommendationText:
      "Chúng tôi khuyến cáo mạnh mẽ thực hiện lấy huyết khối cơ học cho bệnh nhân tổn thương lõi nhồi máu lớn (ASPECTS 3–5 hoặc thể tích ≥50ml) trong vòng 24h.",
    eligibilityCriteria: "Tắc động mạch nội sọ đoạn gần (ICA hoặc M1/M2), tuổi ≥18.",
    citedTrials: ["SELECT2", "ANGEL-ASPECT", "TENSION", "LASTE"],
    isLatestForSociety: true,
    notesVi: "Đặc biệt nhấn mạnh việc không nên từ chối can thiệp chỉ dựa trên hình ảnh tổn thương rộng đơn thuần nếu bệnh nhân đến sớm.",
  },
  {
    id: "rec-vn-2025-largecore",
    scenarioId: "ais-large-core-evt-aspects-3-5",
    guidelineDocId: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    originalGrade: "Khuyến cáo Thực hiện (Mức độ A)",
    normalizedTier: 1,
    recommendationText:
      "Khuyến cáo thực hiện can thiệp lấy huyết khối cơ học tại các trung tâm đột quỵ có năng lực hồi sức thần kinh cho bệnh nhân có ASPECTS 3–5.",
    eligibilityCriteria: "Được đánh giá cẩn thận nguy cơ xuất huyết chuyển dạng, kiểm soát huyết áp chặt sau can thiệp.",
    citedTrials: ["SELECT2", "TENSION", "Kinh nghiệm lâm sàng Bệnh viện Bạch Mai, Chợ Rẫy, 115"],
    isLatestForSociety: true,
    notesVi: "Cần theo dõi sát phù não ác tính trong 72 giờ đầu sau can thiệp.",
  },

  // Scenario 3: ich-acute-bp-lowering
  {
    id: "rec-aha-2022-ich-bp",
    scenarioId: "ich-acute-bp-lowering",
    guidelineDocId: "aha-ais-2026",
    society: "AHA/ASA",
    year: 2022,
    originalGrade: "Class IIa, Level of Evidence B-R",
    normalizedTier: 2,
    recommendationText:
      "Ở bệnh nhân xuất huyết não cấp tính có huyết áp tâm thu 150-220 mmHg, việc hạ huyết áp tâm thu an toàn về đích 130-140 mmHg nhanh chóng trong vài giờ đầu là hợp lý và có thể cải thiện kết cục chức năng.",
    eligibilityCriteria: "Khởi phát < 6h, tránh hạ huyết áp tâm thu đột ngột > 60 mmHg trong 1 giờ hoặc hạ SBP < 130 mmHg.",
    citedTrials: ["INTERACT2 (NEJM 2013)", "ATACH-2 (NEJM 2016)"],
    isLatestForSociety: true,
    notesVi: "Ưu tiên thuốc truyền tĩnh mạch chỉnh liều chính xác như Nicardipine.",
  },
  {
    id: "rec-eso-2021-ich-bp",
    scenarioId: "ich-acute-bp-lowering",
    guidelineDocId: "eso-ais-2024",
    society: "ESO",
    year: 2021,
    originalGrade: "Weak recommendation FOR, Moderate quality",
    normalizedTier: 2,
    recommendationText:
      "Hạ huyết áp tâm thu xuống dưới 140 mmHg (nhưng không dưới 130 mmHg) trong 24 giờ đầu sau khởi phát xuất huyết não.",
    eligibilityCriteria: "Bệnh nhân không có dấu hiệu tăng áp lực nội sọ đe dọa tụt não.",
    citedTrials: ["INTERACT2", "ATACH-2 Meta-analysis"],
    isLatestForSociety: true,
  },
  {
    id: "rec-vn-2025-ich-bp",
    scenarioId: "ich-acute-bp-lowering",
    guidelineDocId: "vn-moh-stroke-2025",
    society: "VN-MOH",
    year: 2025,
    originalGrade: "Khuyến cáo Áp dụng (Mức độ IIa)",
    normalizedTier: 2,
    recommendationText:
      "Hạ huyết áp tâm thu nhanh chóng đạt mục tiêu 130–140 mmHg trong 1–2 giờ đầu bằng Nicardipine truyền tĩnh mạch và duy trì ổn định.",
    eligibilityCriteria: "Theo dõi huyết áp động mạch xâm lấn hoặc đo tự động mỗi 5-15 phút.",
    citedTrials: ["INTERACT2", "Phác đồ Bộ Y tế"],
    isLatestForSociety: true,
  },
];

export const MOCK_CONFERENCE_EVENTS: ConferenceEvent[] = [
  {
    id: "conf-esoc-2026",
    acronym: "ESOC 2026",
    name: "12th European Stroke Organisation Conference",
    subspecialties: ["Stroke"],
    dates: "May 20–22, 2026",
    location: "Munich, Germany",
    status: "LIVE",
    officialUrl: "https://esocstroke.org",
    executiveSummary:
      "Hội nghị Đột quỵ lớn nhất Châu Âu năm nay quy tụ hơn 4.500 đại biểu với tâm điểm là các thử nghiệm can thiệp lấy huyết khối ở vùng tranh tối tranh sáng cực đại, phẫu thuật xâm lấn tối thiểu trong xuất huyết não và các thuốc ức chế Factor XIa thế hệ mới.",
    stats: {
      totalLateBreakingTrials: 14,
      positiveTrials: 9,
      practiceChangingCount: 5,
    },
    lateBreakingTrials: [
      {
        id: "trial-laste",
        trialAcronym: "LASTE",
        title: "Large Stroke Therapy Evaluation: Thrombectomy in Extremely Large Core Infarctions",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "NEJM",
        fullTextUrl: "https://www.nejm.org",
        populationSummary: "N = 333 bệnh nhân nhồi máu não cấp do tắc đoạn gần với ASPECTS cực thấp (0–2 trên NCCT/MRI) hoặc thể tích lõi nhồi máu >50 mL.",
        interventionGroup: "Lấy huyết khối cơ học (EVT) kết hợp điều trị nội khoa tối ưu.",
        controlGroup: "Điều trị nội khoa tối ưu đơn thuần.",
        primaryOutcome: "Tỷ lệ mRS 0–2 hoặc phục hồi chức năng có ý nghĩa tại 90 ngày: 38.2% vs 14.5% (RR 2.63; 95% CI 1.68–4.11; p < 0.001).",
        safetyOutcome: "Xuất huyết não có triệu chứng (sICH): 4.8% vs 2.2% (p = 0.21); Tử vong 90 ngày: 36.1% vs 55.4% (p = 0.005).",
        bottomLineTakeaway:
          "Can thiệp lấy huyết khối cơ học đem lại lợi ích phục hồi chức năng và giảm tỷ lệ tử vong ngay cả ở những bệnh nhân có tổn thương não cực rộng (ASPECTS 0–2), chính thức xóa bỏ rào cản từ chối can thiệp do điểm ASPECTS quá thấp.",
        impactedScenarioId: "ais-large-core-evt-aspects-3-5",
        guidelineImpactWarning:
          "Bằng chứng đột phá này dự kiến sẽ thúc đẩy các hiệp hội (AHA, ESO) mở rộng phạm vi khuyến cáo từ ASPECTS 3–5 xuống tới tận ASPECTS 0–2.",
      },
      {
        id: "trial-escape-mevo",
        trialAcronym: "ESCAPE-MeVO",
        title: "Endovascular Treatment to Improve Outcomes for Medium Vessel Occlusions",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "Lancet",
        populationSummary: "N = 530 bệnh nhân tắc mạch não nhánh xa và kích thước trung bình (M2/M3, A2/A3, P2/P3) trong vòng 12 giờ.",
        interventionGroup: "Can thiệp lấy huyết khối bằng stent retriever nhỏ và catheter hút mềm + Nội khoa.",
        controlGroup: "Điều trị nội khoa tối ưu (bao gồm IVT nếu đủ tiêu chuẩn).",
        primaryOutcome: "Tỷ lệ mRS 0–1 tại 90 ngày: 51.4% vs 40.2% (aOR 1.61; 95% CI 1.15–2.26; p = 0.006).",
        safetyOutcome: "Thủng mạch / rách mạch: 1.9%; sICH: 3.1% vs 2.4% (p = 0.58).",
        bottomLineTakeaway:
          "Lấy huyết khối ở tắc mạch nhánh xa MeVO an toàn và cải thiện kết cục vượt trội khi được thực hiện bởi bác sĩ can thiệp có kinh nghiệm với dụng cụ vi can thiệp thế hệ mới.",
        guidelineImpactWarning:
          "Cung cấp chứng cứ cấp độ A đầu tiên cho can thiệp tắc nhánh xa, vốn trước đây chỉ được ESO xếp mức Weak/Low Quality.",
      },
      {
        id: "trial-oceanic-stroke",
        trialAcronym: "OCEANIC-STROKE",
        title: "Asundexian (Factor XIa Inhibitor) for Secondary Prevention After Non-Cardioembolic Ischemic Stroke",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "NEUTRAL",
        isPracticeChanging: false,
        publishedJournal: "Stroke",
        populationSummary: "N = 9,300 bệnh nhân đột quỵ thiếu máu não không do nguồn gốc từ tim.",
        interventionGroup: "Thuốc ức chế Factor XIa Asundexian 50mg/ngày + Kháng kết tập tiểu cầu chuẩn.",
        controlGroup: "Giả dược + Kháng kết tập tiểu cầu chuẩn.",
        primaryOutcome: "Tái phát đột quỵ thiếu máu não: 6.2% vs 6.8% (HR 0.91; 95% CI 0.78–1.06; p = 0.22 - Không đạt ý nghĩa thống kê).",
        safetyOutcome: "Xuất huyết nặng (ISTH Major Bleeding): Tương đương giữa hai nhóm (1.4% vs 1.3%).",
        bottomLineTakeaway:
          "Thuốc ức chế Factor XIa chứng minh độ an toàn xuất huyết rất cao, tuy nhiên chưa chứng minh được sự vượt trội rõ rệt trong việc ngăn ngừa tái phát đột quỵ thiếu máu não ngoài tim trên nền DAPT/SAPT.",
      },
    ],
  },
  {
    id: "conf-isc-2026",
    acronym: "ISC 2026",
    name: "International Stroke Conference 2026",
    subspecialties: ["Stroke"],
    dates: "February 4–6, 2026",
    location: "Los Angeles, CA, USA",
    status: "RECENT",
    officialUrl: "https://professional.heart.org",
    executiveSummary:
      "Hội nghị Đột quỵ Quốc tế thường niên của AHA/ASA công bố các kết quả theo dõi dài hạn của AcT, thử nghiệm mở rộng thời gian tiêu sợi huyết TIMELESS và các kỹ thuật phẫu thuật nội soi hút khối máu tụ xuất huyết não.",
    stats: {
      totalLateBreakingTrials: 18,
      positiveTrials: 11,
      practiceChangingCount: 4,
    },
    lateBreakingTrials: [
      {
        id: "trial-trace-3",
        trialAcronym: "TRACE-III",
        title: "Tenecteplase for Patients with Wake-Up or Late-Window Acute Ischemic Stroke",
        studyDesign: "Phase 3 RCT",
        subspecialty: "Stroke",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "NEJM",
        populationSummary: "N = 516 bệnh nhân đột quỵ khi ngủ dậy (wake-up stroke) hoặc trong cửa sổ 4.5–24 giờ có bất tương xứng mô lành (Penumbra Mismatch) nhưng không thể can thiệp lấy huyết khối ngay.",
        interventionGroup: "Tenecteplase 0.25 mg/kg.",
        controlGroup: "Điều trị nội khoa chuẩn.",
        primaryOutcome: "mRS 0–1 tại 90 ngày: 33.0% vs 24.2% (RR 1.37; p = 0.03).",
        safetyOutcome: "sICH: 3.0% vs 0.8% (p = 0.07); Tử vong 90 ngày tương đương.",
        bottomLineTakeaway:
          "Tenecteplase mở rộng cửa sổ lên tới 24 giờ cho bệnh nhân có mismatch trên hình ảnh học tưới máu tại các cơ sở y tế không có can thiệp mạch tại chỗ.",
        impactedScenarioId: "ais-ivt-tenecteplase-4.5h",
        guidelineImpactWarning:
          "Dẫn đầu xu hướng tiêu sợi huyết cửa sổ mở rộng bằng Tenecteplase.",
      },
    ],
  },
  {
    id: "conf-aan-2026",
    acronym: "AAN 2026",
    name: "American Academy of Neurology Annual Meeting",
    subspecialties: ["All Subspecialties", "Dementia", "Neuromuscular", "Epilepsy", "Movement Disorders"],
    dates: "April 18–24, 2026",
    location: "Chicago, IL, USA",
    status: "UPCOMING",
    officialUrl: "https://www.aan.com/conferences",
    executiveSummary:
      "Đại hội Thần kinh học Hoa Kỳ quy mô lớn nhất thế giới, cập nhật các thử nghiệm pha 3 trong Sa sút trí tuệ (Donanemab thực tế lâm sàng), Nhược cơ (FcRn thế hệ 2) và liệu pháp gen trong teo cơ tủy / loạn dưỡng cơ.",
    stats: {
      totalLateBreakingTrials: 22,
      positiveTrials: 15,
      practiceChangingCount: 7,
    },
    lateBreakingTrials: [
      {
        id: "trial-donanemab-realworld",
        trialAcronym: "TRAILBLAZER-EXT",
        title: "Real-World Multi-Center Registry of Donanemab and ARIA Management Protocol",
        studyDesign: "Prospective Registry",
        subspecialty: "Dementia",
        verdict: "POSITIVE",
        isPracticeChanging: true,
        publishedJournal: "Neurology",
        populationSummary: "N = 2,400 bệnh nhân Alzheimer giai đoạn sớm tại 45 trung tâm y khoa.",
        interventionGroup: "Donanemab truyền hàng tháng kèm quy trình giám sát ARIA có sự hỗ trợ của AI MRI.",
        controlGroup: "Đối chứng lịch sử.",
        primaryOutcome: "Tỷ lệ ARIA-E có triệu chứng giảm 42% nhờ phát hiện sớm trên MRI thường quy.",
        safetyOutcome: "Tử vong liên quan ARIA: 0.08%.",
        bottomLineTakeaway:
          "Giám sát MRI nghiêm ngặt kết hợp xét nghiệm sàng lọc ApoE ε4 giúp kiểm soát tối đa biến chứng ARIA khi áp dụng rộng rãi kháng thể kháng amyloid ngoài đời thực.",
        impactedScenarioId: "dementia-amyloid-monoclonal",
      },
    ],
  },
  {
    id: "conf-aaic-2026",
    acronym: "AAIC 2026",
    name: "Alzheimer's Association International Conference",
    subspecialties: ["Dementia"],
    dates: "July 26–30, 2026",
    location: "Toronto, Canada",
    status: "UPCOMING",
    officialUrl: "https://alz.org/aaic",
    executiveSummary:
      "Tập trung vào xét nghiệm dấu ấn sinh học máu (p-Tau217 huyết tương) để chẩn đoán Alzheimer sớm ngay tại phòng khám ngoại trú mà không cần chọc dò dịch não tủy hay chụp PET Amyloid.",
    stats: {
      totalLateBreakingTrials: 16,
      positiveTrials: 12,
      practiceChangingCount: 6,
    },
    lateBreakingTrials: [],
  },
  {
    id: "conf-aes-2026",
    acronym: "AES 2026",
    name: "American Epilepsy Society Annual Meeting",
    subspecialties: ["Epilepsy", "Neurocritical Care"],
    dates: "December 4–8, 2026",
    location: "Orlando, FL, USA",
    status: "UPCOMING",
    officialUrl: "https://aesnet.org",
    executiveSummary:
      "Hội nghị chuyên ngành Động kinh hàng đầu thế giới, cập nhật các phác đồ kiểm soát co giật tối cấp và dữ liệu dài hạn về thiết bị kích thích vỏ não đáp ứng (RNS).",
    stats: {
      totalLateBreakingTrials: 12,
      positiveTrials: 8,
      practiceChangingCount: 3,
    },
    lateBreakingTrials: [],
  },
];
