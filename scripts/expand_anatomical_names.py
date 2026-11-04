"""
Script to expand all anatomical abbreviations into full, elegant Vietnamese and English names
in public/neurovision/data/neuro_ontology.json and colormaps/*.json
"""

import json
import re

# Comprehensive dictionary for AAL3 (170 regions)
AAL3_MAP = {
    # Cortical Left / Right
    "Precentral": ("Hồi trước trung tâm (Vỏ não vận động sơ cấp - M1)", "Precentral Gyrus (Primary Motor Cortex - M1)"),
    "Frontal_Sup_2": ("Hồi trán trên", "Superior Frontal Gyrus"),
    "Frontal_Mid_2": ("Hồi trán giữa", "Middle Frontal Gyrus"),
    "Frontal_Inf_Oper": ("Hồi trán dưới - phần nắp (Vùng Broca)", "Inferior Frontal Gyrus, Opercular Part (Broca's Area)"),
    "Frontal_Inf_Tri": ("Hồi trán dưới - phần tam giác (Vùng Broca)", "Inferior Frontal Gyrus, Triangular Part (Broca's Area)"),
    "Frontal_Inf_Orb_2": ("Hồi trán dưới - phần ổ mắt", "Inferior Frontal Gyrus, Orbital Part"),
    "Rolandic_Oper": ("Nắp cuốn Rolandic (Nắp trán đỉnh)", "Rolandic Operculum (Fronto-parietal Operculum)"),
    "Supp_Motor_Area": ("Vùng vận động bổ sung (SMA)", "Supplementary Motor Area (SMA)"),
    "Olfactory": ("Vỏ não khứu giác & hành khứu", "Olfactory Cortex & Bulb"),
    "Frontal_Sup_Medial": ("Hồi trán trên phần trong (Mặt trong thùy trán)", "Superior Frontal Gyrus, Medial Part"),
    "Frontal_Med_Orb": ("Hồi trán trong phần ổ mắt", "Medial Frontal Gyrus, Orbital Part"),
    "Rectus": ("Hồi thẳng (Gyrus Rectus)", "Gyrus Rectus"),
    "OFCant": ("Vỏ não trán ổ mắt trước (OFC trước)", "Anterior Orbitofrontal Cortex"),
    "OFCpost": ("Vỏ não trán ổ mắt sau (OFC sau)", "Posterior Orbitofrontal Cortex"),
    "OFCmed": ("Vỏ não trán ổ mắt trong (OFC trong)", "Medial Orbitofrontal Cortex"),
    "OFClat": ("Vỏ não trán ổ mắt ngoài (OFC ngoài)", "Lateral Orbitofrontal Cortex"),
    "Insula": ("Vỏ não thùy đảo (Insula)", "Insular Cortex"),
    "Cingulate_Ant": ("Hồi đai trước (ACC)", "Anterior Cingulate Gyrus (ACC)"),
    "Cingulate_Mid": ("Hồi đai giữa (MCC)", "Middle Cingulate Gyrus (MCC)"),
    "Cingulate_Post": ("Hồi đai sau (PCC)", "Posterior Cingulate Gyrus (PCC)"),
    "Hippocampus": ("Hải mã (Hồi hải mã - Trí nhớ & Định hướng)", "Hippocampus (Memory & Spatial Navigation)"),
    "ParaHippocampal": ("Hồi cạnh hải mã", "Parahippocampal Gyrus"),
    "Amygdala": ("Hạch hạnh nhân (Xử lý cảm xúc & sợ hãi)", "Amygdala (Emotional Processing)"),
    "Calcarine": ("Vỏ não quanh rãnh cựa (Vỏ não thị giác sơ cấp - V1)", "Calcarine Cortex (Primary Visual Cortex - V1)"),
    "Cuneus": ("Hồi chêm (Vỏ não thị giác liên hợp)", "Cuneus (Visual Association Cortex)"),
    "Lingual": ("Hồi lưỡi (Vỏ não thị giác nhận diện từ & màu sắc)", "Lingual Gyrus (Word & Color Recognition)"),
    "Occipital_Sup": ("Hồi chẩm trên", "Superior Occipital Gyrus"),
    "Occipital_Mid": ("Hồi chẩm giữa", "Middle Occipital Gyrus"),
    "Occipital_Inf": ("Hồi chẩm dưới", "Inferior Occipital Gyrus"),
    "Fusiform": ("Hồi thoi (Hồi chẩm - thái dương ngoài / Nhận diện khuôn mặt)", "Fusiform Gyrus (Fusiform Face Area)"),
    "Postcentral": ("Hồi sau trung tâm (Vỏ não cảm giác sơ cấp - S1)", "Postcentral Gyrus (Primary Somatosensory Cortex - S1)"),
    "Parietal_Sup": ("Tiểu thùy đỉnh trên (Xử lý không gian & thị giác không gian)", "Superior Parietal Lobule (Visuospatial Processing)"),
    "Parietal_Inf": ("Tiểu thùy đỉnh dưới", "Inferior Parietal Lobule"),
    "Supramarginal": ("Hồi trên viền (Xử lý âm vị & ngữ âm)", "Supramarginal Gyrus (Phonological Processing)"),
    "Angular": ("Hồi góc (Vùng Wernicke / Đọc hiểu & tính toán)", "Angular Gyrus (Wernicke's Area / Reading & Math)"),
    "Precuneus": ("Hồi trước chêm (Mạng mặc định DMN & tự ý thức)", "Precuneus (Default Mode Network & Self-awareness)"),
    "Paracentral_Lobule": ("Tiểu thùy cạnh trung tâm (Vận động & cảm giác chi dưới)", "Paracentral Lobule (Lower Extremity Motor & Sensory)"),
    "Caudate": ("Nhân đuôi (Hạch nền - Kiểm soát vận động & nhận thức)", "Caudate Nucleus (Basal Ganglia)"),
    "Putamen": ("Nhân bèo sẫm / Putamen (Hạch nền - Điều hòa vận động tinh)", "Putamen (Basal Ganglia - Motor Regulation)"),
    "Pallidum": ("Cầu nhạt / Globus Pallidus (Hạch nền - Đường ra tiền vận động)", "Globus Pallidus (Basal Ganglia Output)"),
    "Heschl": ("Hồi Heschl (Hồi thái dương ngang - Vỏ não thính giác sơ cấp A1)", "Heschl's Gyrus (Transverse Temporal - Primary Auditory Cortex A1)"),
    "Temporal_Sup": ("Hồi thái dương trên (Vùng Wernicke thính giác)", "Superior Temporal Gyrus (Auditory Association / Wernicke)"),
    "Temporal_Pole_Sup": ("Cực thái dương phần trên (Xử lý cảm xúc xã hội & ngữ nghĩa)", "Temporal Pole, Superior Part (Social Semantics)"),
    "Temporal_Mid": ("Hồi thái dương giữa (Xử lý ngữ nghĩa & từ vựng)", "Middle Temporal Gyrus (Lexical Semantics)"),
    "Temporal_Pole_Mid": ("Cực thái dương phần giữa", "Temporal Pole, Middle Part"),
    "Temporal_Inf": ("Hồi thái dương dưới (Con đường thị giác bụng 'Cái gì')", "Inferior Temporal Gyrus (Ventral Visual Stream)"),

    # Thalamic Subnuclei
    "Thal_AV": ("Đồi thị - Nhân trước bụng (AV) (Vòng mạch Papez - Trí nhớ)", "Thalamus - Anteroventral Nucleus (AV) (Papez Circuit)"),
    "Thal_LP": ("Đồi thị - Nhân sau bên (LP) (Liên hợp thị giác không gian)", "Thalamus - Lateral Posterior Nucleus (LP)"),
    "Thal_VA": ("Đồi thị - Nhân trước bụng (VA) (Tiền vận động & Hạch nền)", "Thalamus - Ventral Anterior Nucleus (VA) (Motor Relay)"),
    "Thal_VL": ("Đồi thị - Nhân bên bụng (VL) (Chuyển tiếp tiểu não - vận động)", "Thalamus - Ventral Lateral Nucleus (VL) (Cerebellar Relay)"),
    "Thal_VPL": ("Đồi thị - Nhân bụng sau bên (VPL) (Chuyển tiếp cảm giác thân & chi)", "Thalamus - Ventral Posterolateral Nucleus (VPL) (Body Somatosensory)"),
    "Thal_VPM": ("Đồi thị - Nhân bụng sau trong (VPM) (Chuyển tiếp cảm giác mặt & vị giác)", "Thalamus - Ventral Posteromedial Nucleus (VPM) (Facial Somatosensory & Taste)"),
    "Thal_IL": ("Đồi thị - Các nhân trong lá (Intralaminar) (Hệ thống thức tỉnh lưới ARAS)", "Thalamus - Intralaminar Nuclei (Arousal & Consciousness)"),
    "Thal_Re": ("Đồi thị - Nhân hợp (Reuniens) (Kết nối hồi hải mã - vỏ não trước trán)", "Thalamus - Nucleus Reuniens (Hippocampal-Prefrontal Connector)"),
    "Thal_MD": ("Đồi thị - Nhân lưng giữa (MD) (Chức năng điều hành & cảm xúc trán)", "Thalamus - Mediodorsal Nucleus (MD) (Executive & Emotional Relay)"),
    "Thal_Hab": ("Đồi thị - Nhân cuống khuy (Habenula) (Đánh giá phần thưởng âm tính)", "Thalamus - Habenular Nucleus (Negative Reward Evaluation)"),
    "Thal_MGN": ("Đồi thị - Thể gối trong (MGN) (Trạm chuyển tiếp thính giác)", "Thalamus - Medial Geniculate Nucleus (MGN) (Auditory Relay)"),
    "Thal_LGN": ("Đồi thị - Thể gối ngoài (LGN) (Trạm chuyển tiếp thị giác)", "Thalamus - Lateral Geniculate Nucleus (LGN) (Visual Relay)"),
    "Thal_PuA": ("Đồi thị - Nhân đệm trước (PuA)", "Thalamus - Anterior Pulvinar Nucleus (PuA)"),
    "Thal_PuM": ("Đồi thị - Nhân đệm trong (PuM) (Chú ý đa giác quan)", "Thalamus - Medial Pulvinar Nucleus (PuM) (Multisensory Attention)"),
    "Thal_PuL": ("Đồi thị - Nhân đệm ngoài (PuL) (Thị giác & định hướng không gian)", "Thalamus - Lateral Pulvinar Nucleus (PuL) (Visual Orientation)"),
    "Thal_PuI": ("Đồi thị - Nhân đệm dưới (PuI) (Kết nối vỏ não chẩm)", "Thalamus - Inferior Pulvinar Nucleus (PuI) (Occipital Connector)"),

    # Anterior Cingulate sub-regions & Nucleus Accumbens
    "ACC_sub": ("Vỏ não đai trước dưới gối (Subgenual ACC - BA 25 / Cảm xúc trầm cảm)", "Subgenual Anterior Cingulate Cortex (sgACC - Mood Regulation)"),
    "ACC_pre": ("Vỏ não đai trước trước gối (Pregenual ACC - BA 24/32)", "Pregenual Anterior Cingulate Cortex (pgACC)"),
    "ACC_sup": ("Vỏ não đai trước trên thể chai (Supracallosal ACC)", "Supracallosal Anterior Cingulate Cortex"),
    "N_Acc": ("Nhân nằm / Thể vân bụng (Nucleus Accumbens - Vùng trung tâm phần thưởng)", "Nucleus Accumbens (Reward & Motivation Center)"),

    # Brainstem Neuromodulatory & Arousal Nuclei
    "VTA": ("Vùng trần bụng Tsai (VTA - Nguồn tế bào thần kinh Dopaminergic)", "Ventral Tegmental Area (VTA - Mesolimbic Dopamine Origin)"),
    "SN_pc": ("Liềm đen - phần đặc (SNc - Tế bào thần kinh Dopamine / Bệnh Parkinson)", "Substantia Nigra, Pars Compacta (SNc - Nigrostriatal Dopamine)"),
    "SN_pr": ("Liềm đen - phần lưới (SNr - Nhân ức chế GABAergic hạch nền)", "Substantia Nigra, Pars Reticulata (SNr - GABAergic Output)"),
    "Red_N": ("Nhân đỏ (Trung não - Điều hòa trương lực cơ & vận động ngoại tháp)", "Red Nucleus (Midbrain Rubrospinal System)"),
    "LC": ("Nhân lục (Locus Coeruleus - Trung tâm tiết Noradrenaline não bộ)", "Locus Coeruleus (Norepinephrine System Origin)"),
    "Raphe_D": ("Nhân đường giữa lưng (Dorsal Raphe - Trung tâm Serotonin não bộ)", "Dorsal Raphe Nucleus (Serotonergic System Origin)"),
    "Raphe_M": ("Nhân đường giữa trung tâm (Median Raphe - Điều hòa nhịp sinh học)", "Median Raphe Nucleus (Circadian & Arousal Regulation)"),

    # Cerebellum Hemispheres & Vermis
    "Cerebelum_Crus1": ("Bán cầu tiểu não - Thùy Crus I (Nhận thức & ngôn ngữ)", "Cerebellar Hemisphere - Crus I (Cognitive & Language)"),
    "Cerebelum_Crus2": ("Bán cầu tiểu não - Thùy Crus II (Mạng điều hành trung tâm)", "Cerebellar Hemisphere - Crus II (Executive Network)"),
    "Cerebelum_3": ("Bán cầu tiểu não - Tiểu thùy III (Vận động cảm giác chi dưới)", "Cerebellar Hemisphere - Lobule III (Sensorimotor)"),
    "Cerebelum_4_5": ("Bán cầu tiểu não - Tiểu thùy IV - V (Vận động cảm giác chi trên)", "Cerebellar Hemisphere - Lobule IV-V (Sensorimotor)"),
    "Cerebelum_6": ("Bán cầu tiểu não - Tiểu thùy VI (Phối hợp vận động mắt & tay)", "Cerebellar Hemisphere - Lobule VI (Oculomotor & Hand Coordination)"),
    "Cerebelum_7b": ("Bán cầu tiểu não - Tiểu thùy VIIb (Nhận thức liên hợp)", "Cerebellar Hemisphere - Lobule VIIb (Cognitive)"),
    "Cerebelum_8": ("Bán cầu tiểu não - Tiểu thùy VIII (Bản đồ vận động thứ cấp)", "Cerebellar Hemisphere - Lobule VIII (Secondary Sensorimotor)"),
    "Cerebelum_9": ("Bán cầu tiểu não - Tiểu thùy IX (Tiền đình - tiểu não)", "Cerebellar Hemisphere - Lobule IX (Vestibulocerebellum)"),
    "Cerebelum_10": ("Bán cầu tiểu não - Tiểu thùy X / Thùy nhung nốt (Thăng bằng tiền đình)", "Cerebellar Hemisphere - Lobule X / Flocculonodular (Balance)"),
    "Vermis_1_2": ("Thùy giun tiểu não - Tiểu thùy I - II (Điều hòa thắt lưng & chân)", "Cerebellar Vermis - Lobule I-II"),
    "Vermis_3": ("Thùy giun tiểu não - Tiểu thùy III (Trương lực cơ trục thân)", "Cerebellar Vermis - Lobule III"),
    "Vermis_4_5": ("Thùy giun tiểu não - Tiểu thùy IV - V (Thăng bằng đứng thẳng)", "Cerebellar Vermis - Lobule IV-V"),
    "Vermis_6": ("Thùy giun tiểu não - Tiểu thùy VI (Cử động nhãn cầu giật cầu saccade)", "Cerebellar Vermis - Lobule VI (Saccadic Eye Movement)"),
    "Vermis_7": ("Thùy giun tiểu não - Tiểu thùy VII (Điều chỉnh thị giác - vận động)", "Cerebellar Vermis - Lobule VII"),
    "Vermis_8": ("Thùy giun tiểu não - Tiểu thùy VIII (Phản xạ tiền đình tủy sống)", "Cerebellar Vermis - Lobule VIII"),
    "Vermis_9": ("Thùy giun tiểu não - Tiểu thùy IX (Phản xạ chỉnh thế tiền đình)", "Cerebellar Vermis - Lobule IX"),
    "Vermis_10": ("Thùy giun tiểu não - Tiểu thùy X (Thùy nốt - Phản xạ tiền đình mắt VOR)", "Cerebellar Vermis - Lobule X (Nodulus - Vestibulo-ocular Reflex)")
}

# White matter tracts (JHU DTI-81 50 tracts)
WHITEMATTER_MAP = {
    1: ("Cuống tiểu não giữa (MCP) (Kết nối cầu não - vỏ tiểu não)", "Middle cerebellar peduncle (MCP)"),
    2: ("Dải bắt chéo cầu não (Một phần của MCP)", "Pontine crossing tract (a part of MCP)"),
    3: ("Gối thể chai (Genu of CC) (Nối vỏ não trán hai bên)", "Genu of corpus callosum"),
    4: ("Thân thể chai (Body of CC) (Nối vỏ não vận động & đỉnh hai bên)", "Body of corpus callosum"),
    5: ("Lồi thể chai (Splenium of CC) (Nối vỏ não thái dương & chẩm hai bên)", "Splenium of corpus callosum"),
    6: ("Vòm não (Cột và thân vòm não - Mạch Papez trí nhớ)", "Fornix (column and body of fornix)"),
    7: ("Dải vỏ gai (Bó tháp) (Phải) (Đường vận động chủ ý thân & chi)", "Corticospinal tract (Right)"),
    8: ("Dải vỏ gai (Bó tháp) (Trái) (Đường vận động chủ ý thân & chi)", "Corticospinal tract (Left)"),
    9: ("Dải liềm trong (Phải) (Đường dẫn truyền cảm giác sâu có ý thức)", "Medial lemniscus (Right)"),
    10: ("Dải liềm trong (Trái) (Đường dẫn truyền cảm giác sâu có ý thức)", "Medial lemniscus (Left)"),
    11: ("Cuống tiểu não dưới (Phải) (Dẫn truyền tủy sống - tiểu não)", "Inferior cerebellar peduncle (Right)"),
    12: ("Dẫn truyền cuống tiểu não dưới (Trái)", "Inferior cerebellar peduncle (Left)"),
    13: ("Cuống tiểu não trên (Phải) (Đường ly tâm tiểu não - nhân đỏ - đồi thị)", "Superior cerebellar peduncle (Right)"),
    14: ("Cuống tiểu não trên (Trái) (Đường ly tâm tiểu não - nhân đỏ - đồi thị)", "Superior cerebellar peduncle (Left)"),
    15: ("Cuống đại não (Phải) (Chứa bó tháp, bó vỏ cầu)", "Cerebral peduncle (Right)"),
    16: ("Cuống đại não (Trái) (Chứa bó tháp, bó vỏ cầu)", "Cerebral peduncle (Left)"),
    17: ("Trụ trước bao trong (Phải) (Đường trán - cầu não & tia đồi thị trước)", "Anterior limb of internal capsule (Right)"),
    18: ("Trụ trước bao trong (Trái) (Đường trán - cầu não & tia đồi thị trước)", "Anterior limb of internal capsule (Left)"),
    19: ("Trụ sau bao trong (Phải) (Bó tháp & tia cảm giác đồi thị)", "Posterior limb of internal capsule (Right)"),
    20: ("Trụ sau bao trong (Trái) (Bó tháp & tia cảm giác đồi thị)", "Posterior limb of internal capsule (Left)"),
    21: ("Phần sau nhân bèo bao trong (Phải) (Tia thị giác & tia thính giác)", "Retrolenticular part of internal capsule (Right)"),
    22: ("Phần sau nhân bèo bao trong (Trái) (Tia thị giác & tia thính giác)", "Retrolenticular part of internal capsule (Left)"),
    23: ("Vành tia trước (Phải) (Sợi phóng chiếu trán)", "Anterior corona radiata (Right)"),
    24: ("Vành tia trước (Trái) (Sợi phóng chiếu trán)", "Anterior corona radiata (Left)"),
    25: ("Vành tia trên (Phải) (Sợi phóng chiếu vận động - cảm giác đỉnh)", "Superior corona radiata (Right)"),
    26: ("Vành tia trên (Trái) (Sợi phóng chiếu vận động - cảm giác đỉnh)", "Superior corona radiata (Left)"),
    27: ("Vành tia sau (Phải) (Sợi phóng chiếu chẩm)", "Posterior corona radiata (Right)"),
    28: ("Vành tia sau (Trái) (Sợi phóng chiếu chẩm)", "Posterior corona radiata (Left)"),
    29: ("Tia đồi thị sau (Bao gồm tia thị giác) (Phải)", "Posterior thalamic radiation (include optic radiation) (Right)"),
    30: ("Tia đồi thị sau (Bao gồm tia thị giác) (Trái)", "Posterior thalamic radiation (include optic radiation) (Left)"),
    31: ("Lớp bó dọc (Gồm bó dọc dưới & bó trán chẩm dưới) (Phải)", "Sagittal stratum (Right)"),
    32: ("Lớp bó dọc (Gồm bó dọc dưới & bó trán chẩm dưới) (Trái)", "Sagittal stratum (Left)"),
    33: ("Bao ngoài (Phải)", "External capsule (Right)"),
    34: ("Bao ngoài (Trái)", "External capsule (Left)"),
    35: ("Bó đai (Phần hồi đai) (Phải) (Kết nối hệ viền limbic)", "Cingulum (cingulate gyrus) (Right)"),
    36: ("Bó đai (Phần hồi đai) (Trái) (Kết nối hệ viền limbic)", "Cingulum (cingulate gyrus) (Left)"),
    37: ("Bó đai (Phần hải mã) (Phải)", "Cingulum (hippocampus) (Right)"),
    38: ("Bó đai (Phần hải mã) (Trái)", "Cingulum (hippocampus) (Left)"),
    39: ("Trụ vòm não / Vân tận cùng (Phải)", "Fornix (crus) / Stria terminalis (Right)"),
    40: ("Trụ vòm não / Vân tận cùng (Trái)", "Fornix (crus) / Stria terminalis (Left)"),
    41: ("Bó dọc trên (SLF) (Phải) (Mạng lưới chú ý không gian)", "Superior longitudinal fasciculus (Right)"),
    42: ("Bó dọc trên (SLF) (Trái) (Bó cung ngôn ngữ Broca - Wernicke)", "Superior longitudinal fasciculus (Left)"),
    43: ("Bó trán - chẩm trên (Phải)", "Superior fronto-occipital fasciculus (Right)"),
    44: ("Bó trán - chẩm trên (Trái)", "Superior fronto-occipital fasciculus (Left)"),
    45: ("Bó trán - chẩm dưới (IFOF) (Phải) (Xử lý thị giác ngữ nghĩa)", "Inferior fronto-occipital fasciculus (Right)"),
    46: ("Bó trán - chẩm dưới (IFOF) (Trái) (Xử lý thị giác ngữ nghĩa & đọc)", "Inferior fronto-occipital fasciculus (Left)"),
    47: ("Bó móc (Uncinate fasciculus) (Phải) (Nối cực thái dương & trán ổ mắt)", "Uncinate fasciculus (Right)"),
    48: ("Bó móc (Uncinate fasciculus) (Trái) (Nối cực thái dương & trán ổ mắt)", "Uncinate fasciculus (Left)"),
    49: ("Bó thảm thể chai (Tapetum) (Phải)", "Tapetum (Right)"),
    50: ("Bó thảm thể chai (Tapetum) (Trái)", "Tapetum (Left)")
}

# Arterial Territories (JHU 32)
ARTERIAL_MAP = {
    "ACAL": ("Động mạch não trước (ACA - Trái) (Mặt trong thùy trán & đỉnh)", "Anterior Cerebral Artery territory (Left)"),
    "ACAR": ("Động mạch não trước (ACA - Phải) (Mặt trong thùy trán & đỉnh)", "Anterior Cerebral Artery territory (Right)"),
    "MCAL": ("Động mạch não giữa (MCA - Trái) (Mặt ngoài bán cầu đại não & vùng ngôn ngữ)", "Middle Cerebral Artery territory (Left)"),
    "MCAR": ("Động mạch não giữa (MCA - Phải) (Mặt ngoài bán cầu đại não & chú ý không gian)", "Middle Cerebral Artery territory (Right)"),
    "PCAL": ("Động mạch não sau (PCA - Trái) (Thùy chẩm & mặt dưới thùy thái dương)", "Posterior Cerebral Artery territory (Left)"),
    "PCAR": ("Động mạch não sau (PCA - Phải) (Thùy chẩm & mặt dưới thùy thái dương)", "Posterior Cerebral Artery territory (Right)"),
    "MLSL": ("Nhánh vân thể trong (ĐM não trước) (Trái) (Đầu nhân đuôi & trụ trước bao trong)", "Medial Lenticulostriate Artery territory (Left)"),
    "MLSR": ("Nhánh vân thể trong (ĐM não trước) (Phải) (Đầu nhân đuôi & trụ trước bao trong)", "Medial Lenticulostriate Artery territory (Right)"),
    "LLSL": ("Nhánh vân thể ngoài (ĐM não giữa) (Trái) (Nhân bèo & bao trong)", "Lateral Lenticulostriate Artery territory (Left)"),
    "LLSR": ("Nhánh vân thể ngoài (ĐM não giữa) (Phải) (Nhân bèo & bao trong)", "Lateral Lenticulostriate Artery territory (Right)"),
    "AchAL": ("Động mạch màng mạch trước (AChA - Trái) (Trụ sau bao trong & thể gối ngoài)", "Anterior Choroidal Artery territory (Left)"),
    "AchAR": ("Động mạch màng mạch trước (AChA - Phải) (Trụ sau bao trong & thể gối ngoài)", "Anterior Choroidal Artery territory (Right)"),
    "PChAL": ("Động mạch màng mạch sau (PChA - Trái) (Đám rối màng mạch & đồi thị)", "Posterior Choroidal Artery territory (Left)"),
    "PChAR": ("Động mạch màng mạch sau (PChA - Phải) (Đám rối màng mạch & đồi thị)", "Posterior Choroidal Artery territory (Right)"),
    "ICAL": ("Động mạch cảnh trong (ICA - Trái)", "Internal Carotid Artery territory (Left)"),
    "ICAR": ("Động mạch cảnh trong (ICA - Phải)", "Internal Carotid Artery territory (Right)"),
    "BA": ("Động mạch thân nền (BA) (Cầu não, trung não & thân não)", "Basilar Artery territory"),
    "VAL": ("Động mạch đốt sống (VA - Trái) (Hành não)", "Vertebral Artery territory (Left)"),
    "VAR": ("Động mạch đốt sống (VA - Phải) (Hành não)", "Vertebral Artery territory (Right)"),
    "SICAL": ("Động mạch cảnh trong đoạn trên mỏm yên (Trái)", "Supraclinoid Internal Carotid Artery territory (Left)"),
    "SICAR": ("Động mạch cảnh trong đoạn trên mỏm yên (Phải)", "Supraclinoid Internal Carotid Artery territory (Right)"),
    "AICAL": ("Động mạch tiểu não trước dưới (AICA - Trái) (Cầu não dưới & tiểu não trước)", "Anterior Inferior Cerebellar Artery territory (Left)"),
    "AICAR": ("Động mạch tiểu não trước dưới (AICA - Phải) (Cầu não dưới & tiểu não trước)", "Anterior Inferior Cerebellar Artery territory (Right)"),
    "PICAL": ("Động mạch tiểu não sau dưới (PICA - Trái) (Hành não sau bên & tiểu não sau dưới)", "Posterior Inferior Cerebellar Artery territory (Left)"),
    "PICAR": ("Động mạch tiểu não sau dưới (PICA - Phải) (Hành não sau bên & tiểu não sau dưới)", "Posterior Inferior Cerebellar Artery territory (Right)"),
    "SCAL": ("Động mạch tiểu não trên (SCA - Trái) (Trung não trên & mặt trên tiểu não)", "Superior Cerebellar Artery territory (Left)"),
    "SCAR": ("Động mạch tiểu não trên (SCA - Phải) (Trung não trên & mặt trên tiểu não)", "Superior Cerebellar Artery territory (Right)"),
    "ThAL": ("Động mạch thị gối (ThAL - Trái) (Đồi thị bên & sau)", "Thalamogeniculate Artery territory (Left)"),
    "ThAR": ("Động mạch thị gối (ThAL - Phải) (Đồi thị bên & sau)", "Thalamogeniculate Artery territory (Right)"),
    "ThPL": ("Động mạch thị xuyên (ThPL - Trái) (Đồi thị giữa & trước)", "Thalamoperforating Artery territory (Left)"),
    "ThPR": ("Động mạch thị xuyên (ThPR - Phải) (Đồi thị giữa & trước)", "Thalamoperforating Artery territory (Right)"),
}

# Harvard-Oxford Anatomy (67 regions)
ANATOMY_MAP = {
    1: ("Cực trán (Frontal Pole)", "Frontal Pole"),
    2: ("Vỏ não thùy đảo (Insular Cortex)", "Insular Cortex"),
    3: ("Hồi trán trên (Superior Frontal Gyrus)", "Superior Frontal Gyrus"),
    4: ("Hồi trán giữa (Middle Frontal Gyrus)", "Middle Frontal Gyrus"),
    5: ("Hồi trán dưới - phần tam giác (Vùng Broca)", "Inferior Frontal Gyrus, pars triangularis"),
    6: ("Hồi trán dưới - phần nắp (Vùng Broca)", "Inferior Frontal Gyrus, pars opercularis"),
    7: ("Hồi trước trung tâm (Vỏ não vận động sơ cấp - M1)", "Precentral Gyrus (Primary Motor Cortex - M1)"),
    8: ("Cực thái dương (Temporal Pole)", "Temporal Pole"),
    9: ("Hồi thái dương trên - phần trước", "Superior Temporal Gyrus, anterior division"),
    10: ("Hồi thái dương trên - phần sau (Vùng Wernicke)", "Superior Temporal Gyrus, posterior division (Wernicke)"),
    11: ("Hồi thái dương giữa - phần trước", "Middle Temporal Gyrus, anterior division"),
    12: ("Hồi thái dương giữa - phần sau", "Middle Temporal Gyrus, posterior division"),
    13: ("Hồi thái dương giữa - phần thái dương chẩm", "Middle Temporal Gyrus, temporooccipital part"),
    14: ("Hồi thái dương dưới - phần trước", "Inferior Temporal Gyrus, anterior division"),
    15: ("Hồi thái dương dưới - phần sau", "Inferior Temporal Gyrus, posterior division"),
    16: ("Hồi thái dương dưới - phần thái dương chẩm", "Inferior Temporal Gyrus, temporooccipital part"),
    17: ("Hồi sau trung tâm (Vỏ não cảm giác sơ cấp - S1)", "Postcentral Gyrus (Primary Somatosensory Cortex - S1)"),
    18: ("Tiểu thùy đỉnh trên (Xử lý không gian thị giác)", "Superior Parietal Lobule"),
    19: ("Hồi trên viền - phần trước", "Supramarginal Gyrus, anterior division"),
    20: ("Hồi trên viền - phần sau", "Supramarginal Gyrus, posterior division"),
    21: ("Hồi góc (Angular Gyrus - Đọc hiểu & toán học)", "Angular Gyrus"),
    22: ("Vỏ não quanh rãnh cựa (Vỏ não thị giác sơ cấp - V1)", "Cortex surrounding Calcarine Fissure (V1)"),
    23: ("Hồi chêm (Cuneus)", "Cuneus"),
    24: ("Hồi lưỡi (Lingual Gyrus)", "Lingual Gyrus"),
    25: ("Vỏ não chẩm trên (Superior Occipital Cortex)", "Superior Occipital Cortex"),
    26: ("Vỏ não chẩm dưới (Inferior Occipital Cortex)", "Inferior Occipital Cortex"),
    27: ("Hồi chẩm - thái dương ngoài (Hồi thoi) - phần trước", "Occipital Fusiform Gyrus, anterior division"),
    28: ("Hồi chẩm - thái dương ngoài (Hồi thoi) - phần sau", "Occipital Fusiform Gyrus, posterior division"),
    29: ("Hồi nắp trán (Frontal Operculum Cortex)", "Frontal Operculum Cortex"),
    30: ("Hồi nắp trung tâm (Central Opercular Cortex)", "Central Opercular Cortex"),
    31: ("Hồi nắp đỉnh (Parietal Operculum Cortex)", "Parietal Operculum Cortex"),
    32: ("Mặt phẳng thái dương (Planum Temporale - Cấu trúc bất đối xứng ngôn ngữ)", "Planum Temporale (Language Asymmetry)"),
    33: ("Hồi thái dương ngang (Hồi Heschl - Thính giác sơ cấp A1)", "Heschl's Gyrus (Auditory Cortex A1)"),
    34: ("Hồi đai - phần trước (Anterior Cingulate Gyrus)", "Cingulate Gyrus, anterior division"),
    35: ("Hồi đai - phần sau (Posterior Cingulate Gyrus)", "Cingulate Gyrus, posterior division"),
    36: ("Hồi trước chêm (Precuneus - Trung tâm mạng mặc định DMN)", "Precuneus"),
    37: ("Hồi cạnh trung tâm (Paracentral Lobule)", "Paracentral Lobule"),
    38: ("Hồi cạnh hải mã - phần trước", "Parahippocampal Gyrus, anterior division"),
    39: ("Hồi cạnh hải mã - phần sau", "Parahippocampal Gyrus, posterior division"),
    40: ("Hải mã (Hippocampus - Trí nhớ & Định vị)", "Hippocampus"),
    41: ("Hạch hạnh nhân (Amygdala - Cảm xúc & sợ hãi)", "Amygdala"),
    42: ("Nhân đuôi (Caudate Nucleus)", "Caudate Nucleus"),
    43: ("Nhân bèo sẫm (Putamen)", "Putamen"),
    44: ("Cầu nhạt (Globus Pallidus)", "Globus Pallidus"),
    45: ("Đồi thị (Thalamus - Trạm chuyển tiếp giác quan)", "Thalamus"),
    46: ("Nhân nằm (Nucleus Accumbens - Vùng tưởng thưởng)", "Nucleus Accumbens"),
    47: ("Thân não (Brainstem - Hành não, Cầu não, Trung não)", "Brainstem"),
    48: ("Bán cầu tiểu não (Cerebellum)", "Cerebellar Cortex")
}

# Brainstem AAN (16 arousal / neuromodulatory nuclei)
BRAINSTEM_MAP = {
    "DR": ("Nhân đường giữa lưng (Dorsal Raphe - Trung tâm Serotonin)", "Dorsal Raphe Nucleus (DR)"),
    "MR": ("Nhân đường giữa trung tâm (Median Raphe - Điều hòa nhịp thức ngủ)", "Median Raphe Nucleus (MR)"),
    "LC": ("Nhân lục (Locus Coeruleus - Trung tâm Noradrenaline)", "Locus Coeruleus (LC)"),
    "PPN": ("Nhân cuống cầu (Pedunculopontine Nucleus - Vận động & chú ý)", "Pedunculopontine Nucleus (PPN)"),
    "LDT": ("Nhân trần sau bên (Laterodorsal Tegmental - Hệ Cholinergic)", "Laterodorsal Tegmental Nucleus (LDT)"),
    "PBC": ("Phức hợp cạnh cánh tay (Parabrachial Complex - Xử lý cảm giác tạng)", "Parabrachial Complex (PBC)"),
    "PAG": ("Chất xám quanh cống Sylvius (Periaqueductal Gray - Ức chế đau & sinh tồn)", "Periaqueductal Gray (PAG)"),
    "VTA": ("Vùng trần bụng (VTA - Trung tâm tế bào Dopaminergic)", "Ventral Tegmental Area (VTA)"),
    "SN": ("Liềm đen (Substantia Nigra - Bệnh Parkinson)", "Substantia Nigra (SN)"),
    "RN": ("Nhân đỏ (Red Nucleus - Vận động ngoại tháp)", "Red Nucleus (RN)"),
    "NTS": ("Nhân bó đơn độc (Nucleus Tractus Solitarius - Điều hòa huyết áp tim mạch)", "Nucleus of Solitary Tract (NTS)"),
    "Mo5": ("Nhân vận động dây thần kinh V (Motor Trigeminal Nucleus - Cơ nhai)", "Motor Trigeminal Nucleus (Mo5)"),
    "Pr5": ("Nhân cảm giác chính dây thần kinh V (Principal Trigeminal Nucleus)", "Principal Trigeminal Nucleus (Pr5)"),
    "Sp5": ("Nhân tủy gai dây thần kinh V (Spinal Trigeminal Nucleus - Đau & nhiệt mặt)", "Spinal Trigeminal Nucleus (Sp5)"),
    "VN": ("Các nhân tiền đình (Vestibular Nuclei - Thăng bằng & tư thế)", "Vestibular Nuclei Complex (VN)"),
    "IO": ("Nhân trám dưới (Inferior Olive - Phối hợp vận động tiểu não)", "Inferior Olivary Nucleus (IO)")
}

def resolve_aal3(name):
    # Formats: Name_L, Name_R, Vermis_1_2, Cerebelum_Crus1_L, etc.
    suffix = ""
    clean_name = name
    if name.endswith("_L"):
        clean_name = name[:-2]
        suffix = " (Trái)"
        suffix_en = " (Left)"
    elif name.endswith("_R"):
        clean_name = name[:-2]
        suffix = " (Phải)"
        suffix_en = " (Right)"
    else:
        suffix_en = ""

    if clean_name in AAL3_MAP:
        vi, en = AAL3_MAP[clean_name]
        return f"{vi}{suffix}", f"{en}{suffix_en}"
    
    # Try partial matching
    for k in AAL3_MAP:
        if clean_name.startswith(k):
            vi, en = AAL3_MAP[k]
            return f"{vi}{suffix}", f"{en}{suffix_en}"
            
    return name, name

def run():
    print("Expanding anatomical names across neuro_ontology.json...")
    with open('public/neurovision/data/neuro_ontology.json', 'r', encoding='utf-8') as f:
        onto = json.load(f)

    updated_count = 0
    for entry in onto['entries']:
        atlas = entry.get('atlas')
        label_id = entry.get('label_id')
        code = entry.get('code', '')

        # 1. AAL3
        if atlas == 'aal3':
            raw_name = code.replace(f"aal3_{label_id}", "").strip() or entry.get('name_vi') or entry.get('name_en')
            # Look up label name from aal3.labels.json
            vi, en = resolve_aal3(raw_name)
            if vi != entry['name_vi'] or en != entry['name_en']:
                entry['name_vi'] = vi
                entry['name_en'] = en
                updated_count += 1

        # 2. White Matter
        elif atlas == 'whitematter':
            if label_id in WHITEMATTER_MAP:
                vi, en = WHITEMATTER_MAP[label_id]
                entry['name_vi'] = vi
                entry['name_en'] = en
                updated_count += 1

        # 3. Arterial
        elif atlas == 'arterial':
            if code in ARTERIAL_MAP:
                vi, en = ARTERIAL_MAP[code]
                entry['name_vi'] = vi
                entry['name_en'] = en
                updated_count += 1

        # 4. Harvard-Oxford Anatomy
        elif atlas == 'anatomy':
            if label_id in ANATOMY_MAP:
                vi, en = ANATOMY_MAP[label_id]
                entry['name_vi'] = vi
                entry['name_en'] = en
                updated_count += 1

        # 5. Brainstem AAN
        elif atlas == 'brainstem_aan':
            clean_code = code.split('_')[0]
            if clean_code in BRAINSTEM_MAP:
                vi, en = BRAINSTEM_MAP[clean_code]
                entry['name_vi'] = vi
                entry['name_en'] = en
                updated_count += 1

    with open('public/neurovision/data/neuro_ontology.json', 'w', encoding='utf-8') as f:
        json.dump(onto, f, ensure_ascii=False, indent=2)

    print(f"Successfully updated {updated_count} entries in neuro_ontology.json!")

    # Now update colormaps labels array
    for atlas_name in ['aal3', 'whitematter', 'arterial', 'anatomy', 'brainstem_aan']:
        cm_path = f"public/neurovision/data/colormaps/{atlas_name}.json"
        try:
            with open(cm_path, 'r', encoding='utf-8') as f:
                cm = json.load(f)
            
            # Map index to new name
            atlas_entries = {e['label_id']: f"{e['name_vi']} ({e['name_en']})" for e in onto['entries'] if e['atlas'] == atlas_name}
            
            new_labels = ["Background"]
            max_id = max(cm['I']) if cm.get('I') else 0
            for idx in range(1, max_id + 1):
                new_labels.append(atlas_entries.get(idx, f"Vùng {idx}"))
                
            cm['labels'] = new_labels
            with open(cm_path, 'w', encoding='utf-8') as f:
                json.dump(cm, f, ensure_ascii=False, indent=2)
            print(f"Updated colormap labels for {atlas_name}.json")
        except Exception as e:
            print(f"Error updating colormap {atlas_name}: {e}")

if __name__ == '__main__':
    run()
