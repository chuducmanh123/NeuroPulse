import json

with open('public/neurovision/atlases/whitematter.labels.json', encoding='utf-8') as f:
    wm = json.load(f)
print("=== Whitematter Labels (first 25) ===")
for l in wm['labels'][:25]:
    print(f"{l['index']}: {l['name']}")

with open('public/neurovision/atlases/aal3.labels.json', encoding='utf-8') as f:
    aal = json.load(f)
print("\n=== AAL3 Labels sample ===")
for l in aal['labels']:
    name = l['name']
    if any(k in name for k in ['Thalam', 'Caudate', 'Putamen', 'Pallidum', 'Hippocampus', 'ParaHippocampal', 'Cingulate', 'Cerebel', 'Vermis']):
        print(f"{l['index']}: {l['name']}")
