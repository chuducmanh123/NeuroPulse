/**
 * ASPECTS and pc-ASPECTS Anatomical Configuration
 *
 * NOTE: The Z coordinates (in MNI mm) for standard axial CT slice levels
 * are default stereotaxic approximations.
 * GHI CHÚ: 'cần bác sĩ chẩn đoán hình ảnh xác nhận' và để người dùng tùy chỉnh.
 */

export interface AspectsLevelConfig {
  ganglionic_z_mm: number;      // Tầng hạch nền: C, L, IC, I, M1, M2, M3
  supraganglionic_z_mm: number;  // Tầng trên hạch nền: M4, M5, M6
  note: string;
}

export const ASPECTS_LEVELS: AspectsLevelConfig = {
  // GHI CHÚ: cần bác sĩ chẩn đoán hình ảnh xác nhận và hiệu chỉnh theo ca lâm sàng
  ganglionic_z_mm: 8.0,        // Mức hạch nền (cắt qua lỗ Monro, đầu nhân đuôi, đồi thị)
  supraganglionic_z_mm: 30.0,   // Mức trên hạch nền (ngay trên đỉnh não thất bên)
  note: "Tọa độ Z chuẩn MNI152 (cần bác sĩ chẩn đoán hình ảnh xác nhận và điều chỉnh khi cần).",
};

export interface AspectsRegionMeta {
  key: string;              // e.g. 'C', 'L', 'IC', 'I', 'M1'...'M6'
  label_vi: string;
  label_en: string;
  tier: 'ganglionic' | 'supraganglionic';
  left_label_id: number;    // ID in aspects.nii.gz
  right_label_id: number;   // ID in aspects.nii.gz
  description_vi: string;
  clinical_deficit: string;
}

export const ASPECTS_REGIONS: AspectsRegionMeta[] = [
  // 1. Tầng Hạch Nền (Ganglionic level)
  {
    key: "C",
    label_vi: "Đầu nhân đuôi (Caudate)",
    label_en: "Caudate head",
    tier: "ganglionic",
    left_label_id: 1,
    right_label_id: 11,
    description_vi: "Đầu nhân đuôi tiếp giáp sừng trước não thất bên, nhận máu từ nhánh xuyên ACA/MCA.",
    clinical_deficit: "Rối loạn nhận thức, mất chú ý, suy giảm trí nhớ làm việc, vận động chậm.",
  },
  {
    key: "L",
    label_vi: "Nhân bèo (Lentiform)",
    label_en: "Lentiform nucleus (Putamen + Pallidum)",
    tier: "ganglionic",
    left_label_id: 2,
    right_label_id: 12,
    description_vi: "Nhân bèo gồm bèo sẫm (putamen) và cầu nhạt (globus pallidus), cấp máu bởi nhánh lenticulostriate (M1).",
    clinical_deficit: "Yếu liệt đối bên, loạn trương lực cơ, rối loạn phối hợp vận động vô thức.",
  },
  {
    key: "IC",
    label_vi: "Bao trong (Internal Capsule)",
    label_en: "Internal capsule (Anterior + Posterior limbs)",
    tier: "ganglionic",
    left_label_id: 3,
    right_label_id: 13,
    description_vi: "Trục dẫn truyền vận động chính (dải vỏ gai ở trụ sau bao trong).",
    clinical_deficit: "Liệt nửa người đối bên thuần túy vận động, liệt mặt trung ương nặng nề.",
  },
  {
    key: "I",
    label_vi: "Vỏ đảo / Dải ruy băng thùy đảo (Insula)",
    label_en: "Insular ribbon",
    tier: "ganglionic",
    left_label_id: 4,
    right_label_id: 14,
    description_vi: "Dấu hiệu xóa dải ruy băng thùy đảo (loss of insular ribbon) là dấu hiệu sớm nhạy nhất của thiếu máu MCA.",
    clinical_deficit: "Mất cảm giác vị giác, rối loạn thần kinh thực vật, mất chú ý không gian đối bên.",
  },
  {
    key: "M1",
    label_vi: "Vỏ MCA trước (M1 cortex)",
    label_en: "Anterior MCA cortex",
    tier: "ganglionic",
    left_label_id: 5,
    right_label_id: 15,
    description_vi: "Vỏ não thùy trán trước bên thuộc lãnh thổ phân nhánh trên của MCA.",
    clinical_deficit: "Liệt vận động nửa người ưu thế mặt - tay, mất phối hợp nhìn liên hợp.",
  },
  {
    key: "M2",
    label_vi: "Vỏ MCA bên (M2 cortex)",
    label_en: "Lateral MCA cortex (temporal)",
    tier: "ganglionic",
    left_label_id: 6,
    right_label_id: 16,
    description_vi: "Vỏ não thái dương bên liền kề rãnh Sylvius.",
    clinical_deficit: "Mất ngôn ngữ Wernicke (nếu bán cầu ưu thế), giảm thính lực, rối loạn định hướng âm thanh.",
  },
  {
    key: "M3",
    label_vi: "Vỏ MCA sau (M3 cortex)",
    label_en: "Posterior MCA cortex (parietal/occipital junction)",
    tier: "ganglionic",
    left_label_id: 7,
    right_label_id: 17,
    description_vi: "Vỏ não thùy thái dương sau - đỉnh.",
    clinical_deficit: "Bán manh đồng danh đối bên, hội chứng Gerstmann (nếu bán cầu ưu thế).",
  },

  // 2. Tầng Trên Hạch Nền (Supraganglionic level)
  {
    key: "M4",
    label_vi: "Vỏ MCA trên trước (M4 cortex)",
    label_en: "Anterior supraganglionic MCA cortex",
    tier: "supraganglionic",
    left_label_id: 8,
    right_label_id: 18,
    description_vi: "Vỏ não thùy trán trên (phía trên tầng M1), bao gồm vùng vận động phụ.",
    clinical_deficit: "Liệt ưu thế chi trên, mất ngôn ngữ Broca (nếu bên trái), thờ ơ vận động.",
  },
  {
    key: "M5",
    label_vi: "Vỏ MCA trên bên (M5 cortex)",
    label_en: "Lateral supraganglionic MCA cortex",
    tier: "supraganglionic",
    left_label_id: 9,
    right_label_id: 19,
    description_vi: "Vỏ não thùy đỉnh bên, trung tâm cảm giác thân thể (S1) và hồi sau trung tâm.",
    clinical_deficit: "Mất cảm giác nửa người đối bên (vị trí, phân biệt hai điểm), mất thực dụng.",
  },
  {
    key: "M6",
    label_vi: "Vỏ MCA trên sau (M6 cortex)",
    label_en: "Posterior supraganglionic MCA cortex",
    tier: "supraganglionic",
    left_label_id: 10,
    right_label_id: 20,
    description_vi: "Vỏ não thùy đỉnh sau (phía trên tầng M3).",
    clinical_deficit: "Hội chứng phớt lờ nửa thân (hemispatial neglect, bên phải), mất nhận thức bệnh tật.",
  },
];

export interface PcAspectsRegionMeta {
  key: string;
  points: number; // 1 or 2
  label_vi: string;
  label_en: string;
  target_z_mm: number;
  description_vi: string;
  clinical_deficit: string;
}

export const PC_ASPECTS_REGIONS: PcAspectsRegionMeta[] = [
  {
    key: "midbrain",
    points: 2,
    label_vi: "Trung não (Midbrain)",
    label_en: "Midbrain",
    target_z_mm: -12.0,
    description_vi: "Chứa cuống đại não (dải vỏ gai), nhân dây thần kinh III, nhân đỏ, chất đen.",
    clinical_deficit: "Hội chứng Weber (liệt dây III cùng bên + liệt nửa người đối bên), hội chứng Benedikt, hôn mê nếu tổn thương ARAS.",
  },
  {
    key: "pons",
    points: 2,
    label_vi: "Cầu não (Pons)",
    label_en: "Pons",
    target_z_mm: -28.0,
    description_vi: "Chứa dải vỏ gai, nhân dây V, VI, VII, VIII, hệ thống lưới thức tỉnh.",
    clinical_deficit: "Hội chứng khóa trong (Locked-in), hội chứng Millard-Gubler, liệt mặt ngoại biên đối bên liệt người, rung giật nhãn cầu.",
  },
  {
    key: "thalamus_left",
    points: 1,
    label_vi: "Đồi thị Trái (Left Thalamus)",
    label_en: "Left Thalamus",
    target_z_mm: 4.0,
    description_vi: "Trạm chuyển tiếp cảm giác toàn bộ cơ thể, nhân VPL/VPM cấp máu bởi nhánh paramedian PCA.",
    clinical_deficit: "Hội chứng Dejerine-Roussy (đau đồi thị trung ương dữ dội, mất cảm giác toàn bộ nửa người phải).",
  },
  {
    key: "thalamus_right",
    points: 1,
    label_vi: "Đồi thị Phải (Right Thalamus)",
    label_en: "Right Thalamus",
    target_z_mm: 4.0,
    description_vi: "Trạm chuyển tiếp cảm giác bên phải, tích hợp cảm giác và tri giác không gian.",
    clinical_deficit: "Mất cảm giác nửa người trái, hội chứng đau đồi thị, thờ ơ không gian.",
  },
  {
    key: "cerebellum_left",
    points: 1,
    label_vi: "Bán cầu Tiểu não Trái (Left Cerebellum)",
    label_en: "Left Cerebellar hemisphere",
    target_z_mm: -36.0,
    description_vi: "Cấp máu bởi PICA và AICA bên trái, điều hòa thăng bằng và trương lực cơ chi cùng bên.",
    clinical_deficit: "Thất điều chi trái, quá tầm, run khi chủ ý, chóng mặt dữ dội.",
  },
  {
    key: "cerebellum_right",
    points: 1,
    label_vi: "Bán cầu Tiểu não Phải (Right Cerebellum)",
    label_en: "Right Cerebellar hemisphere",
    target_z_mm: -36.0,
    description_vi: "Cấp máu bởi PICA và AICA bên phải, kiểm soát phối hợp vận động cùng bên.",
    clinical_deficit: "Thất điều chi phải, mất liên động, rung giật nhãn cầu hướng bên tổn thương.",
  },
  {
    key: "pca_left",
    points: 1,
    label_vi: "Vùng PCA Trái / Thùy chẩm (Left PCA Territory)",
    label_en: "Left PCA territory (Occipital / Calcarine)",
    target_z_mm: 4.0,
    description_vi: "Vỏ thị giác sơ cấp (V1) xung quanh rãnh cựa, cấp máu bởi động mạch não sau (PCA) trái.",
    clinical_deficit: "Bán manh đồng danh bên phải (bảo tồn hoàng điểm), mất nhận thức thị giác chữ viết (Alexia without agraphia).",
  },
  {
    key: "pca_right",
    points: 1,
    label_vi: "Vùng PCA Phải / Thùy chẩm (Right PCA Territory)",
    label_en: "Right PCA territory (Occipital / Calcarine)",
    target_z_mm: 4.0,
    description_vi: "Vỏ thị giác sơ cấp bán cầu phải, nhận thông tin nửa thị trường trái.",
    clinical_deficit: "Bán manh đồng danh bên trái, mất khả năng nhận diện khuôn mặt (Prosopagnosia).",
  },
];
