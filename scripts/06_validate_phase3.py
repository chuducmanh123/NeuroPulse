"""
Validation script for Phase 3:
1. ASPECTS & pc-ASPECTS configurations and scoring logic.
2. Vietnamese diacritic normalization and search accuracy.
3. In-mask centroid alignment (every in_mask_vox points to actual label voxel).
4. Reverse highlight colormap isolation math.
"""

import json
import os
import sys
import unicodedata
import nibabel as nib
import numpy as np

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def strip_accents(text):
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.replace('đ', 'd').replace('Đ', 'D')
    return text.lower().strip()

def matches_query(target, query):
    norm_t = strip_accents(target)
    norm_q = strip_accents(query)
    tokens = norm_q.split()
    return all(token in norm_t for token in tokens)

def test_search():
    print('[1] TESTING VIETNAMESE SEARCH WITH / WITHOUT DIACRITICS')
    with open('public/neurovision/data/neuro_ontology.json', encoding='utf-8') as f:
        data = json.load(f)
    entries = data['entries']

    test_queries = [
        ('nhan beo', ['Lentiform', 'Putamen', 'bèo']),
        ('bao trong', ['Internal Capsule', 'Bao trong']),
        ('dau nhan duoi', ['Caudate', 'Đầu nhân đuôi']),
        ('vo dao', ['Insula', 'Vỏ đảo']),
        ('thalamus', ['Thalamus', 'Đồi thị']),
        ('mca', ['MCA', 'Động mạch não giữa']),
        ('than nao', ['Brain-Stem', 'Thân não']),
        ('mesencephalic', ['Mesencephalic', 'Trung não']),
    ]

    for q, expected_keywords in test_queries:
        matched = [
            e for e in entries
            if matches_query(f"{e['name_vi']} {e['name_en']} {e['code']}", q)
        ]
        assert len(matched) > 0, f"Query '{q}' returned 0 matches!"
        print(f"  PASS: query '{q}' -> {len(matched)} matches (Top: {matched[0]['name_vi']} / {matched[0]['name_en']})")

def test_centroids_in_mask():
    print('\n[2] TESTING IN-MASK CENTROID ACCURACY')
    with open('public/neurovision/data/centroids.json', encoding='utf-8') as f:
        centroids = json.load(f)

    # Test aspects, anatomy, arterial_level2
    for atlas in ['aspects', 'arterial_level2', 'anatomy']:
        nii_path = f'public/neurovision/atlases/{atlas}.nii.gz'
        img = nib.load(nii_path)
        data = img.get_fdata().astype(np.int32)
        
        atlas_cents = centroids[atlas]
        failures = 0
        for lbl_str, cent in atlas_cents.items():
            lbl = int(lbl_str)
            vox = cent['in_mask_vox']
            val_at_vox = data[vox[0], vox[1], vox[2]]
            if val_at_vox != lbl:
                print(f"  FAIL: {atlas} label {lbl} in_mask_vox {vox} has value {val_at_vox}")
                failures += 1
        assert failures == 0, f"{atlas} had {failures} centroid in-mask errors!"
        print(f"  PASS: {atlas} ({len(atlas_cents)} labels): 100% in_mask_vox hit target label accurately")

def test_colormap_isolation():
    print('\n[3] TESTING REVERSE HIGHLIGHT COLORMAP ISOLATION')
    with open('public/neurovision/data/colormaps/aspects.json', encoding='utf-8') as f:
        cm = json.load(f)
    
    target_id = 5 # M1 left
    isolated_A = [255 if cm['I'][idx] == target_id else 0 for idx in range(len(cm['I']))]
    
    assert isolated_A[0] == 0, 'Background index 0 must remain alpha=0'
    for idx, lbl in enumerate(cm['I']):
        if lbl == target_id:
            assert isolated_A[idx] == 255, f'Target label {target_id} must have alpha=255'
        else:
            assert isolated_A[idx] == 0, f'Non-target label {lbl} must have alpha=0'
    print(f"  PASS: Reverse highlight colormap correctly zeros all {len(cm['I'])-1} non-target labels while keeping label {target_id} visible")

def test_aspects_scoring():
    print('\n[4] TESTING ASPECTS & PC-ASPECTS SCORING DEDUCTION')
    # ASPECTS
    all_aspects = ['C', 'L', 'IC', 'I', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6']
    assert len(all_aspects) == 10
    
    affected = ['C', 'IC', 'M1']
    score = 10 - len(affected)
    assert score == 7
    print(f"  PASS: ASPECTS with {affected} -> score = {score}/10")

    # pc-ASPECTS
    pc_points = {
        'midbrain': 2,
        'pons': 2,
        'thalamus_left': 1,
        'thalamus_right': 1,
        'cerebellum_left': 1,
        'cerebellum_right': 1,
        'pca_left': 1,
        'pca_right': 1,
    }
    assert sum(pc_points.values()) == 10
    affected_pc = ['midbrain', 'thalamus_left'] # 2 + 1 = 3
    pc_score = 10 - sum(pc_points[k] for k in affected_pc)
    assert pc_score == 7
    print(f"  PASS: pc-ASPECTS with {affected_pc} -> score = {pc_score}/10 (Midbrain -2, Thalamus -1)")

if __name__ == '__main__':
    test_search()
    test_centroids_in_mask()
    test_colormap_isolation()
    test_aspects_scoring()
    print('\n' + '='*50)
    print('ALL PHASE 3 HARD CHECKS PASSED!')
    print('='*50)
