const fs = require('fs');
const path = require('path');

const ontoPath = path.join(__dirname, '../public/neurovision/data/neuro_ontology.json');
const raw = fs.readFileSync(ontoPath, 'utf8');
const onto = JSON.parse(raw);

const ARTERIAL_DETAILS = {
  1: { // ACAL
    functions: [
      "Mặt trong thùy trán và thùy đỉnh bên trái (hồi trán trong, tiểu thùy cạnh trung tâm)",
      "Phần trước và thân thể chai, vỏ hồi đai trước",
      "Trung tâm vận động và cảm giác sơ cấp cho chi dưới bên phải (chân và bàn chân phải)",
      "Vùng tiền trán trong kiểm soát chức năng điều hành, động lực hành vi và cơ vòng bàng quang"
    ],
    arterial_supply: {
      primary: [
        "ĐM não trước (ACA - phân nhánh đoạn A2 - A5)",
        "ĐM quanh thể chai (Pericallosal artery)",
        "ĐM viền chai (Callosomarginal artery)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang dọc trên (Superior Sagittal Sinus)",
      "Tĩnh mạch vỏ não trên (Superior Cortical Veins / Vein of Trolard)",
      "Xoang dọc dưới (Inferior Sagittal Sinus)",
      "Tĩnh mạch thể chai (Callosal Veins)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng đột quỵ ACA bán cầu ưu thế",
        description: "Liệt và mất cảm giác nửa người bên phải ưu thế chi dưới (chân phải liệt nặng rõ rệt hơn tay và mặt), tiểu không tự chủ (tiểu dầm do tổn thương tiểu thùy cạnh trung tâm), giảm động lực/mất ý chí (abulia), hội chứng bàn tay lạ (Alien hand syndrome) và phản xạ nắm tay nguyên thủy đối bên."
      }
    ]
  },
  2: { // ACAR
    functions: [
      "Mặt trong thùy trán và thùy đỉnh bên phải (tiểu thùy cạnh trung tâm phải)",
      "Phần trước thể chai và vỏ hồi đai trước bên phải",
      "Trung tâm vận động và cảm giác sơ cấp cho chi dưới bên trái (chân và bàn chân trái)",
      "Vùng kiểm soát khí sắc, động lực khởi phát hành vi và phản xạ ức chế nguyên thủy"
    ],
    arterial_supply: {
      primary: [
        "ĐM não trước (ACA - phân nhánh đoạn A2 - A5)",
        "ĐM quanh thể chai (Pericallosal artery)",
        "ĐM viền chai (Callosomarginal artery)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang dọc trên (Superior Sagittal Sinus)",
      "Tĩnh mạch vỏ não trên (Superior Cortical Veins / Vein of Trolard)",
      "Xoang dọc dưới (Inferior Sagittal Sinus)",
      "Tĩnh mạch thể chai (Callosal Veins)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng đột quỵ ACA bán cầu không ưu thế",
        description: "Liệt và mất cảm giác chân trái nhiều hơn tay trái, rối loạn cơ vòng kiểu trung ương (tiểu không tự chủ), thay đổi nhân cách, mất ức chế hành vi trán, vô cảm (apathy) và giảm động nửa người trái."
      }
    ]
  },
  3: { // MLSL
    functions: [
      "Phần trước dưới đầu nhân đuôi (Caudate head) bên trái",
      "Phần trước dưới nhân bèo sẫm và cầu nhạt ngoài",
      "Trụ trước bao trong (Anterior limb of internal capsule)",
      "Bó trán - cầu não và các đường dẫn truyền trán - dưới vỏ"
    ],
    arterial_supply: {
      primary: ["ĐM não trước (ACA - đoạn A1/A2)"],
      perforators: [
        "ĐM quặt ngược Heubner (Recurrent Artery of Heubner)",
        "Nhánh xuyên vân thể trong (Medial Lenticulostriate Branches)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Tĩnh mạch đồi thị - thể vân trước (Anterior Thalamostriate Vein)",
      "Tĩnh mạch vách trong suốt (Septal Vein)",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng tắc ĐM quặt ngược Heubner bên trái",
        description: "Liệt nhẹ vận động mặt và tay bên phải (do tổn thương phần trước gối bao trong), loạn vận ngôn (dysarthria), thất ngôn vận động xuyên vỏ nhẹ thoáng qua, mất tập trung và thờ ơ (abulia)."
      }
    ]
  },
  4: { // MLSR
    functions: [
      "Phần trước dưới đầu nhân đuôi bên phải",
      "Trụ trước bao trong và phần trước nhân bèo phải",
      "Vòng lặp thần kinh điều hòa hành vi - cảm xúc trán - hạch nền bên phải"
    ],
    arterial_supply: {
      primary: ["ĐM não trước (ACA - đoạn A1/A2)"],
      perforators: [
        "ĐM quặt ngược Heubner (Recurrent Artery of Heubner)",
        "Nhánh xuyên vân thể trong (Medial Lenticulostriate Branches)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Tĩnh mạch đồi thị - thể vân trước (Anterior Thalamostriate Vein)",
      "Tĩnh mạch vách trong suốt (Septal Vein)",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng tắc ĐM quặt ngược Heubner bên phải",
        description: "Liệt mặt và tay bên trái nhẹ, thờ ơ, giảm chú ý nửa không gian trái, biến đổi cảm xúc do gián đoạn vòng lặp nhận thức hạch nền - vỏ não trán ổ mắt."
      }
    ]
  },
  5: { // LLSL
    functions: [
      "Gối và trụ sau bao trong bên trái (chứa bó tháp vận động vỏ - gai và vỏ - hành cho nửa người phải)",
      "Nhân bèo (Putamen và Globus pallidus)",
      "Thân nhân đuôi bên trái",
      "Trạm trung chuyển vận động và tích hợp hạch nền"
    ],
    arterial_supply: {
      primary: ["ĐM não giữa (MCA - đoạn M1 gốc)"],
      perforators: [
        "Nhánh xuyên vân thể ngoài (Lateral Lenticulostriate Arteries / ĐM xuất huyết não Charcot)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch đồi thị - thể vân (Thalamostriate Vein)",
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Tĩnh mạch đáy Rosenthal",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng liệt vận động thuần túy do nhồi máu lỗ khuyết bao trong trái (Pure Motor Stroke)",
        description: "Liệt vận động nửa người phải đồng đều ở mặt, tay và chân không kèm rối loạn cảm giác hay thị trường; hoặc Hội chứng loạn vận ngôn - bàn tay vụng về (Dysarthria-clumsy hand), Hội chứng thất điều - liệt nhẹ (Ataxic hemiparesis)."
      }
    ]
  },
  6: { // LLSR
    functions: [
      "Gối và trụ sau bao trong bên phải (bó tháp điều khiển nửa thân trái)",
      "Nhân bèo và nhân đuôi bên phải",
      "Đường dẫn truyền ly tâm điều hòa vận động tự chủ bên phải"
    ],
    arterial_supply: {
      primary: ["ĐM não giữa (MCA - đoạn M1 gốc)"],
      perforators: [
        "Nhánh xuyên vân thể ngoài (Lateral Lenticulostriate Arteries)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch đồi thị - thể vân (Thalamostriate Vein)",
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Tĩnh mạch đáy Rosenthal",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng liệt vận động thuần túy bên phải (Pure Motor Stroke)",
        description: "Liệt hoàn toàn hoặc không hoàn toàn nửa người trái (mặt, tay, chân đối xứng), không có khiếm khuyết vỏ não (không mất nhận thức ngôn ngữ, không bán manh)."
      }
    ]
  },
  7: { // MCAFL
    functions: [
      "Vỏ não vận động sơ cấp (M1 / Hồi trước trung tâm) phụ trách nửa mặt và tay phải",
      "Trung tâm ngôn ngữ vận động Broca (BA 44/45 / Hồi trán dưới trái)",
      "Vùng mắt trán (Frontal Eye Field - FEF trái)",
      "Vỏ não tiền vận động và tiền trán lưng ngoài điều hành tác vụ"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - thân trên phân nhánh trán M2/M3)",
        "ĐM ổ mắt - trán ngoài (Lateral orbitofrontal)",
        "ĐM trước rãnh trung tâm (Precentral)",
        "ĐM rãnh trung tâm (Central sulcal)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang dọc trên (Superior Sagittal Sinus qua TM Trolard)",
      "Tĩnh mạch não giữa nông (Superficial Middle Cerebral Vein)",
      "Xoang hang / Xoang bướm đỉnh (Cavernous / Sphenoparietal Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng phân nhánh trán MCA trái (Hội chứng Broca & Liệt mặt - tay)",
        description: "Liệt nửa người phải ưu thế mặt và tay (chân ít bị ảnh hưởng), thất ngôn Broca (nói ngập ngừng, khó khăn, mất ngữ pháp nhưng hiểu lời tốt), hai mắt và đầu lệch sang trái do liệt liếc sang phải."
      }
    ]
  },
  8: { // MCAFR
    functions: [
      "Vỏ não vận động sơ cấp (M1) cho nửa mặt và tay bên trái",
      "Vùng mắt trán (FEF phải) điều hòa liếc mắt phối hợp sang trái",
      "Vỏ não tiền trán trán bên phụ trách kiểm soát ức chế vận động và khả năng chú ý"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - thân trên phân nhánh trán M2/M3)",
        "ĐM trước rãnh trung tâm (Precentral)",
        "ĐM rãnh trung tâm (Central sulcal)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang dọc trên (Superior Sagittal Sinus)",
      "Tĩnh mạch não giữa nông (Superficial Middle Cerebral Vein)",
      "Xoang hang (Cavernous Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng phân nhánh trán MCA phải",
        description: "Liệt nửa người trái ưu thế mặt và tay, hai mắt và đầu quay sang phải (hướng về ổ tổn thương), mất khả năng diễn đạt ngữ điệu cảm xúc giọng nói (Motor aprosodia), mất chú ý vận động chi trái."
      }
    ]
  },
  9: { // MCAPL
    functions: [
      "Vỏ não cảm giác thân thể sơ cấp (S1 / Hồi sau trung tâm) cho mặt và tay phải",
      "Tiểu thùy đỉnh dưới bên trái (Hồi trên viền BA 40 và Hồi góc BA 39)",
      "Tích hợp xúc giác, phân biệt hai điểm, định vị cảm giác cơ thể",
      "Kỹ năng tính toán, đọc viết và thực dụng động tác phức tạp"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - nhánh đỉnh trước và sau M2/M3)",
        "ĐM sau rãnh trung tâm (Postcentral artery)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang dọc trên (Superior Sagittal Sinus)",
      "Tĩnh mạch nối trên Trolard",
      "Tĩnh mạch nối dưới Labbé",
      "Xoang ngang (Transverse Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng thùy đỉnh trái & Hội chứng Gerstmann",
        description: "Mất cảm giác nửa người phải (ưu thế mặt - tay), mất nhận biết vật qua sờ (astereognosis); tổn thương hồi góc trái gây Hội chứng Gerstmann: mất tính toán (acalculia), mất viết (agraphia), mất nhận biết ngón tay (finger agnosia), mất phân biệt phải - trái; mất thực dụng động tác (ideomotor apraxia)."
      }
    ]
  },
  10: { // MCAPR
    functions: [
      "Vỏ não cảm giác sơ cấp (S1) cho mặt và tay bên trái",
      "Tiểu thùy đỉnh dưới bên phải (trung tâm tích hợp nhận thức không gian 3 chiều và sơ đồ thân thể)"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - nhánh đỉnh M2/M3)",
        "ĐM sau rãnh trung tâm (Postcentral artery)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang dọc trên (Superior Sagittal Sinus)",
      "Tĩnh mạch nối trên Trolard",
      "Tĩnh mạch nối dưới Labbé",
      "Xoang ngang (Transverse Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng lãng quên nửa không gian (Hemi-spatial Neglect / Anton-Babinski)",
        description: "Mất cảm giác nửa người trái; hội chứng lãng quên nửa thân và nửa không gian trái nặng nề (bỏ qua hoàn toàn các kích thích bên trái), mất nhận thức bệnh tật (anosognosia), mất thực dụng tạo hình (constructional apraxia)."
      }
    ]
  },
  11: { // MCATL
    functions: [
      "Hồi thái dương trên và giữa bên trái (Vỏ thính giác sơ cấp A1 / Vùng Heschl)",
      "Trung tâm hiểu ngôn ngữ Wernicke (BA 22)",
      "Quai Meyer của tia thị giác (Meyer's loop)",
      "Bộ nhớ ngữ nghĩa từ vựng và xử lý thính giác lời nói"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - thân dưới nhánh thái dương M2/M3)",
        "ĐM thái dương trước, giữa và sau (Anterior/Middle/Posterior temporal arteries)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Tĩnh mạch nối dưới Labbé (Inferior Anastomotic Vein)",
      "Xoang ngang (Transverse Sinus)",
      "Tĩnh mạch não giữa nông (Superficial Middle Cerebral Vein)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng thất ngôn Wernicke & Khuyết thị góc trên",
        description: "Thất ngôn cảm thụ Wernicke (nói lưu loát nhưng vô nghĩa, lẫn từ ngữ, không hiểu lời nói của người khác và mất khả năng lặp lại từ), bán manh 1/4 trên đồng danh mắt phải (do tổn thương quai Meyer thùy thái dương)."
      }
    ]
  },
  12: { // MCATR
    functions: [
      "Hồi thái dương ngoài bên phải",
      "Xử lý thính giác phi ngôn ngữ (nhận biết giai điệu, âm sắc âm nhạc và ngữ điệu cảm xúc)",
      "Quai Meyer của tia thị giác bên phải"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - thân dưới nhánh thái dương M2/M3)",
        "ĐM thái dương bên"
      ],
      perforators: []
    },
    venous_drainage: [
      "Tĩnh mạch nối dưới Labbé",
      "Xoang ngang (Transverse Sinus)",
      "Tĩnh mạch não giữa nông"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng thùy thái dương phải & Khuyết thị",
        description: "Bán manh 1/4 trên đồng danh mắt trái (pie in the sky), mất khả năng hiểu ngữ điệu và cảm xúc giọng nói (Sensory aprosodia), giảm khả năng nhận biết âm nhạc (amusia) và trí nhớ thị giác."
      }
    ]
  },
  13: { // MCAOL
    functions: [
      "Vùng ranh giới vỏ não đỉnh - chẩm ngoài bên trái",
      "Dòng xử lý thị giác lưng (Dorsal 'Where' stream) tích hợp chuyển động và không gian thị giác",
      "Vùng hồi góc chuyển tiếp từ vựng thị giác sang âm vị"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - nhánh tận M3/M4)",
        "ĐM góc (Angular artery)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang ngang (Transverse Sinus)",
      "Tĩnh mạch nối dưới Labbé",
      "Xoang dọc trên (phần sau)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng vùng đỉnh - chẩm trái",
        description: "Mất đọc kèm mất viết (Alexia with agraphia), khuyết thị trường góc phần tư dưới bên phải, mất điều hòa thị giác (optic ataxia) nhẹ."
      }
    ]
  },
  14: { // MCAOR
    functions: [
      "Vùng chuyển tiếp đỉnh - chẩm ngoài bên phải",
      "Xử lý không gian thị giác 3 chiều và chú ý thị giác ngoại vi"
    ],
    arterial_supply: {
      primary: [
        "ĐM não giữa (MCA - nhánh tận M3/M4)",
        "ĐM góc (Angular artery)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang ngang (Transverse Sinus)",
      "Tĩnh mạch nối dưới Labbé",
      "Xoang dọc trên (phần sau)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng đỉnh - chẩm bán cầu không ưu thế",
        description: "Bán manh hoặc khuyết thị góc phần tư dưới bên trái, mất định hướng không gian thị giác (visuospatial disorientation), mất khả năng ước lượng khoảng cách vật thể."
      }
    ]
  },
  15: { // MCAIL
    functions: [
      "Vỏ thùy đảo trước và sau bên trái",
      "Vỏ nắp trán - đỉnh - thái dương quanh rãnh Sylvius",
      "Tích hợp cảm giác nội quan (interoception), nhận cảm cảm giác đau và nhiệt độ sâu",
      "Vỏ não vị giác sơ cấp (Primary gustatory cortex)",
      "Phối hợp vận động phát âm (Articulatory planning)"
    ],
    arterial_supply: {
      primary: ["ĐM não giữa (MCA - các nhánh thùy đảo đoạn M2)"],
      perforators: ["Các nhánh ngắn nuôi vỏ thùy đảo và nắp rãnh Sylvius"]
    },
    venous_drainage: [
      "Tĩnh mạch não giữa nông (Sylvian Vein)",
      "Tĩnh mạch sâu thùy đảo (Deep Insular Veins)",
      "Xoang bướm đỉnh và Xoang hang"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng thùy đảo & nắp quanh Sylvius trái",
        description: "Mất thực dụng lời nói (Apraxia of speech / Speech arrest), mất vị giác một bên (hemiageusia), rối loạn nuốt (dysphagia do tổn thương vỏ nắp), rối loạn cảm giác đau tạng."
      }
    ]
  },
  16: { // MCAIR
    functions: [
      "Vỏ thùy đảo bên phải",
      "Trung tâm cao cấp tích hợp phản xạ thần kinh tự chủ giao cảm (điều hòa nhịp tim, huyết áp)",
      "Nhận thức cảm xúc bản thể và nhận thức nội tạng"
    ],
    arterial_supply: {
      primary: ["ĐM não giữa (MCA - các nhánh thùy đảo đoạn M2)"],
      perforators: ["Các nhánh thùy đảo M2"]
    },
    venous_drainage: [
      "Tĩnh mạch não giữa nông (Sylvian Vein)",
      "Tĩnh mạch sâu thùy đảo (Deep Insular Veins)",
      "Xoang bướm đỉnh và Xoang hang"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng thùy đảo phải & Rối loạn thần kinh tự chủ tim mạch",
        description: "Rối loạn nhịp tim cấp tính (nhịp tim nhanh kịch phát, rối loạn dẫn truyền tim do mất cân bằng giao cảm), tăng nguy cơ loạn nhịp tử vong do đột quỵ, mất nhận thức cơ thể (asomatognosia)."
      }
    ]
  },
  17: { // PCATL
    functions: [
      "Mặt dưới thùy thái dương trái (Hồi cạnh hải mã, Hồi lưỡi trước, Hồi thoi)",
      "Cấu trúc hồi hải mã (Hippocampus) bên trái - hình thành và củng cố trí nhớ lời nói dài hạn",
      "Hệ thống đường dẫn truyền thị giác bụng (Ventral 'What' stream) nhận diện đồ vật"
    ],
    arterial_supply: {
      primary: [
        "ĐM não sau (PCA - đoạn P2/P3)",
        "ĐM thái dương trước và sau (Anterior & Posterior temporal branches of PCA)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Tĩnh mạch đáy Rosenthal (Basal Vein)",
      "Tĩnh mạch nối dưới Labbé",
      "Xoang ngang (Transverse Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng thùy thái dương dưới - hải mã trái",
        description: "Mất trí nhớ quên thuận chiều cấp (anterograde verbal amnesia - mất khả năng ghi nhớ từ ngữ mới), mất định danh sự vật bằng hình ảnh (visual object anomia), ảo giác khứu giác / vị giác."
      }
    ]
  },
  18: { // PCATR
    functions: [
      "Mặt dưới thùy thái dương phải (Hồi thoi / Fusiform face area - FFA)",
      "Hồi hải mã và hồi cạnh hải mã bên phải - trí nhớ hình ảnh, khuôn mặt và định hướng địa hình"
    ],
    arterial_supply: {
      primary: [
        "ĐM não sau (PCA - đoạn P2/P3)",
        "ĐM thái dương trước và sau"
      ],
      perforators: []
    },
    venous_drainage: [
      "Tĩnh mạch đáy Rosenthal (Basal Vein)",
      "Tĩnh mạch nối dưới Labbé",
      "Xoang ngang (Transverse Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng mất nhận diện khuôn mặt (Prosopagnosia) & Mất trí nhớ không gian",
        description: "Mất khả năng nhận biết khuôn mặt người quen kể cả người thân (Prosopagnosia do tổn thương hồi thoi bên phải), mất định hướng không gian địa hình (không nhớ đường về nhà)."
      }
    ]
  },
  19: { // PCAOL
    functions: [
      "Vỏ não thị giác sơ cấp (V1 / BA 17 dọc hai bờ khe cựa bên trái)",
      "Vỏ não thị giác liên hợp (V2, V3 thùy chẩm trái)",
      "Lồi thể chai (Splenium of corpus callosum) truyền thông tin thị giác liên bán cầu"
    ],
    arterial_supply: {
      primary: [
        "ĐM não sau (PCA - đoạn P3/P4)",
        "ĐM rãnh cựa (Calcarine artery)",
        "ĐM đỉnh - chẩm (Parieto-occipital artery)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang ngang (Transverse Sinus)",
      "Hội lưu các xoang (Torcular Herophili)",
      "Tĩnh mạch não lớn Galen (Great Cerebral Vein)"
    ],
    clinical_syndromes: [
      {
        name: "Bán manh đồng danh phải & Hội chứng mất đọc không mất viết",
        description: "Bán manh đồng danh mắt phải bảo tồn hoàng điểm (macular sparing do diện hoàng điểm nhận tưới máu kép từ MCA); nếu nhồi máu lan vào lồi thể chai gây Mất đọc không mất viết (Alexia without agraphia do ngắt kết nối thị giác sang trung tâm ngôn ngữ trái)."
      }
    ]
  },
  20: { // PCAOR
    functions: [
      "Vỏ não thị giác sơ cấp (V1 / BA 17) thùy chẩm phải",
      "Vỏ não thị giác liên hợp xử lý màu sắc và chuyển động thị giác bên trái"
    ],
    arterial_supply: {
      primary: [
        "ĐM não sau (PCA - đoạn P3/P4)",
        "ĐM rãnh cựa (Calcarine artery)",
        "ĐM đỉnh - chẩm"
      ],
      perforators: []
    },
    venous_drainage: [
      "Xoang ngang (Transverse Sinus)",
      "Hội lưu các xoang (Torcular Herophili)",
      "Tĩnh mạch não lớn Galen"
    ],
    clinical_syndromes: [
      {
        name: "Bán manh đồng danh mắt trái bảo tồn hoàng điểm",
        description: "Bán manh đồng danh mắt trái còn bảo tồn hoàng điểm, mất cảm nhận màu sắc nửa thị trường (Hemiachromatopsia), ảo thị giác biến dạng hình dạng (Metamorphopsia) hoặc ảo giác thị giác tạo hình."
      }
    ]
  },
  21: { // PCTPL
    functions: [
      "Nhân bụng sau ngoài (VPL) và nhân bụng sau trong (VPM) đồi thị trái (trung tâm cảm giác nửa thân phải)",
      "Đồi chẩm (Pulvinar), Thể gối ngoài (LGB) và Thể gối trong (MGB)",
      "Đám rối màng mạch não thất ba và sừng thái dương não thất bên"
    ],
    arterial_supply: {
      primary: [
        "ĐM não sau (PCA - đoạn P1/P2)",
        "ĐM màng mạch sau trong và sau ngoài (Medial and Lateral posterior choroidal arteries)"
      ],
      perforators: [
        "ĐM đồi thị - gối (Thalamogeniculate arteries)",
        "ĐM đồi thị - thủng (Thalamoperforating arteries)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Tĩnh mạch đáy Rosenthal",
      "Tĩnh mạch não lớn Galen",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng đau đồi thị Dejerine-Roussy trái",
        description: "Mất cảm giác nửa người bên phải (mất xúc giác tinh vi và cảm giác sâu), sau đó tiến triển thành đau loạn cảm đồi thị dữ dội, rát bỏng đề kháng với thuốc giảm đau thông thường (Dejerine-Roussy); kèm thất điều cảm giác chi phải và múa vờn đồi thị."
      }
    ]
  },
  22: { // PCTPR
    functions: [
      "Nhân bụng sau (VPL/VPM) đồi thị phải (trung tâm cảm giác nửa người trái)",
      "Thể gối ngoài và thể gối trong phải",
      "Đám rối màng mạch não thất"
    ],
    arterial_supply: {
      primary: [
        "ĐM não sau (PCA - đoạn P1/P2)",
        "ĐM màng mạch sau trong và sau ngoài"
      ],
      perforators: [
        "ĐM đồi thị - gối",
        "ĐM đồi thị - thủng"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Tĩnh mạch đáy Rosenthal",
      "Tĩnh mạch não lớn Galen",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng đau đồi thị Dejerine-Roussy phải",
        description: "Mất cảm giác nửa người trái sau đó đau rát bỏng nửa người mạn tính, rối loạn cảm giác sâu tư thế khớp, dị cảm kích thích xúc giác (allodynia) nửa thân trái."
      }
    ]
  },
  23: { // ACTPL
    functions: [
      "1/3 sau trụ sau bao trong bên trái (Posterior limb of internal capsule)",
      "Dải thị giác (Optic tract) và phần bên thể gối ngoài",
      "Móc hải mã (Uncus) và phức hợp hạnh nhân (Amygdala) trái",
      "Đám rối màng mạch sừng thái dương não thất bên"
    ],
    arterial_supply: {
      primary: [
        "ĐM màng mạch trước (AChA - Anterior Choroidal Artery) xuất phát từ ĐM cảnh trong (ICA)"
      ],
      perforators: [
        "Các nhánh xuyên bao trong và dải thị (Capsular & Optic tract perforators)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch đáy Rosenthal (Basal Vein)",
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Tam chứng nhồi máu ĐM màng mạch trước (AChA Syndrome) trái",
        description: "Tam chứng kinh điển: (1) Liệt nửa người phải hoàn toàn (do thiếu máu trụ sau bao trong), (2) Mất cảm giác nửa người phải, (3) Bán manh đồng danh mắt phải (do tổn thương dải thị giác hoặc thể gối ngoài)."
      }
    ]
  },
  24: { // ACTPR
    functions: [
      "Trụ sau bao trong bên phải, dải thị giác bên phải, thể gối ngoài",
      "Hạch hạnh nhân và móc hải mã bên phải"
    ],
    arterial_supply: {
      primary: [
        "ĐM màng mạch trước (AChA) xuất phát từ ICA"
      ],
      perforators: [
        "Các nhánh xuyên bao trong và dải thị"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch đáy Rosenthal (Basal Vein)",
      "Tĩnh mạch não trong",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Tam chứng nhồi máu ĐM màng mạch trước (AChA Syndrome) phải",
        description: "Tam chứng kinh điển: Liệt nửa người trái, mất cảm giác nửa người trái và bán manh đồng danh mắt trái đối bên."
      }
    ]
  },
  25: { // BL
    functions: [
      "Nửa trái cầu não (Bó tháp vỏ - gai, nhân cầu não, sợi bắt chéo cầu não)",
      "Nửa trái tegmentum cầu não (Nhân và dây thần kinh sọ VI, VII, VIII bên trái, bó dọc giữa - MLF)",
      "Trung não dưới bên trái và liềm đen",
      "Hệ thống lưới hoạt hóa thức tỉnh truyền lên (ARAS)"
    ],
    arterial_supply: {
      primary: ["Động mạch thân nền (Basilar Artery)"],
      perforators: [
        "Các nhánh xuyên cầu não cạnh đường giữa (Paramedian pontine branches)",
        "Các nhánh chu vi ngắn và dài (Short & Long circumferential branches)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch cầu não và trung não (Pontine & Mesencephalic Veins)",
      "Xoang đá trên và xoang đá dưới (Superior & Inferior Petrosal Sinuses)",
      "Xoang sigma và Xoang thẳng"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng Millard-Gubler & Foville (Cầu não trái)",
        description: "Hội chứng Millard-Gubler: Liệt mặt ngoại biên bên trái (dây VII) và liệt vận nhãn ngoài (dây VI) cùng bên kết hợp liệt nửa người bên phải đối bên. Hội chứng Foville: Liệt liếc phối hợp sang trái kèm liệt nửa người phải. Nguy cơ Hội chứng khóa trong (Locked-in syndrome) nếu tắc thân nền hai bên."
      }
    ]
  },
  26: { // BR
    functions: [
      "Nửa phải cầu não và trung não",
      "Bó tháp vận động cho nửa người trái, nhân dây sọ VI, VII, VIII phải",
      "Hệ thống lưới thức tỉnh thân não"
    ],
    arterial_supply: {
      primary: ["Động mạch thân nền (Basilar Artery)"],
      perforators: [
        "Các nhánh xuyên cầu não cạnh đường giữa",
        "Các nhánh chu vi ngắn và dài"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch cầu não và trung não",
      "Xoang đá trên và xoang đá dưới",
      "Xoang thẳng"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng Weber & Millard-Gubler bên phải",
        description: "Hội chứng Weber: Liệt dây III mắt phải (sụp mi, đồng tử giãn, mắt lé ngoài) kèm liệt nửa người trái. Hội chứng Millard-Gubler phải: Liệt dây VII/VI phải kèm liệt nửa người trái."
      }
    ]
  },
  27: { // SCL
    functions: [
      "Mặt trên bán cầu tiểu não trái và phần trên thùy nhộng (Vermis)",
      "Nhân răng (Dentate nucleus) trái - nhân sâu lớn nhất điều hòa phối hợp vận động",
      "Cuống tiểu não trên (Brachium conjunctivum - đường dẫn truyền ly tâm chính từ tiểu não lên đồi thị/vỏ não)",
      "Phần bên tegmentum cầu não trên"
    ],
    arterial_supply: {
      primary: ["Động mạch tiểu não trên (SCA - Superior Cerebellar Artery)"],
      perforators: [
        "Các nhánh bán cầu tiểu não trên (Superior cerebellar branches)",
        "Nhánh thùy nhộng trên",
        "Nhánh tegmentum lưng"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch tiểu não trên (Superior Cerebellar Veins)",
      "Tĩnh mạch não lớn Galen (Great Cerebral Vein)",
      "Xoang thẳng và Xoang ngang"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng nhồi máu ĐM tiểu não trên (SCA) trái",
        description: "Thất điều tiểu não chi trái nghiêm trọng (mất phối hợp động tác quá tầm - dysmetria, run chủ ý - intention tremor do tổn thương nhân răng), dáng đi thất điều nghiêng ngã sang trái, rung giật nhãn cầu, hội chứng Horner mắt trái; mất cảm giác đau nhiệt nửa người bên phải (tổn thương liềm tủy tegmentum cầu não)."
      }
    ]
  },
  28: { // SCR
    functions: [
      "Mặt trên bán cầu tiểu não phải và nhân răng phải",
      "Cuống tiểu não trên bên phải, điều hòa nhịp nhàng vận động chi trên và thăng bằng dáng đi phải"
    ],
    arterial_supply: {
      primary: ["Động mạch tiểu não trên (SCA - Superior Cerebellar Artery)"],
      perforators: [
        "Các nhánh bán cầu tiểu não trên",
        "Nhánh thùy nhộng"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch tiểu não trên",
      "Tĩnh mạch não lớn Galen",
      "Xoang thẳng và Xoang ngang"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng nhồi máu ĐM tiểu não trên (SCA) phải",
        description: "Thất điều chi và run cố ý tay chân bên phải, rối loạn nhịp động tác (dysdiadochokinesia), chóng mặt, rung giật nhãn cầu, mất cảm giác nhiệt đau nửa người trái đối bên."
      }
    ]
  },
  29: { // ICL
    functions: [
      "Mặt dưới bán cầu tiểu não trái, hạnh nhân tiểu não (Tonsil) và thùy nhộng dưới (thuộc vùng cấp máu PICA)",
      "Vùng lưng bên hành não trái (Dorsolateral medulla: nhân hoài nghi dây IX/X, nhân và bó gai dây V, nhân tiền đình, bó gai - đồi thị, đường giao cảm đi xuống)",
      "Vùng trước dưới tiểu não, cuống tiểu não giữa và góc cầu - tiểu não trái (thuộc vùng cấp máu AICA)"
    ],
    arterial_supply: {
      primary: [
        "Động mạch tiểu não sau dưới (PICA - Posterior Inferior Cerebellar Artery)",
        "Động mạch tiểu não trước dưới (AICA)",
        "Động mạch đốt sống (Vertebral Artery - VA)"
      ],
      perforators: [
        "Các nhánh hành não ngoài (Lateral medullary branches)",
        "Nhánh đám rối màng mạch não thất IV",
        "Động mạch mê đạo tai trong (Internal auditory artery)"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch tiểu não dưới (Inferior Cerebellar Veins)",
      "Xoang đá dưới (Inferior Petrosal Sinus)",
      "Xoang ngang và Xoang sigma (Transverse & Sigmoid Sinuses)",
      "Xoang chẩm"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng Wallenberg (Hành não ngoài trái do tắc PICA) & Hội chứng AICA",
        description: "Hội chứng Wallenberg kinh điển: Mất cảm giác đau nhiệt bắt chéo (mặt trái do tổn thương nhân dây V - thân và chi bên phải do tổn thương bó gai đồi thị), hội chứng Horner mắt trái, nuốt khó, nói khàn (liệt màn hầu dây IX, X), chóng mặt dữ dội, nôn mửa, rung giật nhãn cầu, thất điều tiểu não chi trái. Nếu tắc AICA: kèm liệt mặt ngoại biên và điếc tiếp nhận tai trái."
      }
    ]
  },
  30: { // ICR
    functions: [
      "Mặt dưới bán cầu tiểu não phải, hạnh nhân tiểu não phải",
      "Vùng lưng bên hành não phải (Lateral medulla)",
      "Phần trước dưới tiểu não và cuống tiểu não giữa phải"
    ],
    arterial_supply: {
      primary: [
        "Động mạch tiểu não sau dưới (PICA)",
        "Động mạch tiểu não trước dưới (AICA)",
        "Động mạch đốt sống (VA)"
      ],
      perforators: [
        "Các nhánh hành não bên",
        "Động mạch mê đạo tai trong"
      ]
    },
    venous_drainage: [
      "Tĩnh mạch tiểu não dưới",
      "Xoang đá dưới",
      "Xoang ngang và Xoang sigma",
      "Xoang chẩm"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng Wallenberg (Hành não ngoài phải) & Hội chứng AICA",
        description: "Hội chứng Wallenberg phải: Mất cảm giác đau nhiệt mặt phải - thân trái, hội chứng Horner mắt phải, liệt nuốt, thất ngôn khàn tiếng, chóng mặt xoay tròn, thất điều tiểu não chi phải; điếc và liệt mặt cùng bên nếu tổn thương vùng AICA."
      }
    ]
  },
  31: { // LVL
    functions: [
      "Không gian khoang chứa và lưu thông dịch não tủy (CSF) não thất bên trái (Sừng trán, thân, sừng chẩm và sừng thái dương)",
      "Đám rối màng mạch (Choroid plexus) sản xuất và bài tiết dịch não tủy",
      "Dẫn lưu CSF qua lỗ gian não thất Monro vào não thất ba"
    ],
    arterial_supply: {
      primary: [
        "Đám rối màng mạch não thất bên (Choroid Plexus) - nhận máu từ ĐM màng mạch trước (AChA) & các nhánh ĐM màng mạch sau (PChA)"
      ],
      perforators: []
    },
    venous_drainage: [
      "Tĩnh mạch màng mạch (Choroidal Vein)",
      "Tĩnh mạch đồi thị - thể vân (Thalamostriate Vein)",
      "Tĩnh mạch não trong (Internal Cerebral Vein)",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng tràn dịch não thất & Xuất huyết não thất trái",
        description: "Tắc nghẽn lỗ gian não thất Monro trái hoặc cống não gây não úng thủy áp lực nội sọ tăng (đau đầu dữ dội, nôn vọt, phù gai thị); tràn dịch não thất áp lực bình thường (NPH: Tam chứng Hakim gồm rối loạn dáng đi, sa sút trí tuệ, tiểu không tự chủ); xuất huyết trong não thất (IVH)."
      }
    ]
  },
  32: { // LVR
    functions: [
      "Không gian chứa và lưu thông dịch não tủy não thất bên phải",
      "Đám rối màng mạch sản xuất dịch não tủy và đệm thủy động học chống chấn động nhu mô não"
    ],
    arterial_supply: {
      primary: [
        "Đám rối màng mạch não thất bên - Nhánh từ ĐM màng mạch trước & sau"
      ],
      perforators: []
    },
    venous_drainage: [
      "Tĩnh mạch màng mạch",
      "Tĩnh mạch đồi thị - thể vân",
      "Tĩnh mạch não trong",
      "Xoang thẳng (Straight Sinus)"
    ],
    clinical_syndromes: [
      {
        name: "Hội chứng tràn dịch não thất & Tăng áp lực nội sọ",
        description: "Giãn não thất tắc nghẽn hoặc thông thương, tăng áp lực nội sọ cấp tính đe dọa thoát vị não, xuất huyết màng mạch - não thất."
      }
    ]
  }
};

let updatedCount = 0;
onto.entries = onto.entries.map((entry) => {
  if (entry.atlas === 'arterial' && ARTERIAL_DETAILS[entry.label_id]) {
    const d = ARTERIAL_DETAILS[entry.label_id];
    updatedCount++;
    return {
      ...entry,
      category: entry.label_id === 31 || entry.label_id === 32 ? 'subcortical' : 'vascular_territory',
      functions: d.functions,
      arterial_supply: d.arterial_supply,
      venous_drainage: d.venous_drainage,
      clinical_syndromes: d.clinical_syndromes,
      evidence_level: 'approximate',
      source: [
        "Liu CF et al., Digital 3D Brain MRI Arterial Territories Atlas, Sci Data 10:74 (2023), doi:10.1038/s41597-022-01923-0",
        "Radiopaedia: Venous territories of the brain (SSS, ISS, Deep/Straight, TS, Cavernous, Infratentorial)",
        "Bousser MG, Ferro JM. Cerebral venous thrombosis. Lancet Neurol 2007; 6:162-70"
      ]
    };
  }
  return entry;
});

console.log(`Updated ${updatedCount} arterial entries in ontology.`);
fs.writeFileSync(ontoPath, JSON.stringify(onto, null, 2), 'utf8');
console.log('Successfully written updated neuro_ontology.json');
