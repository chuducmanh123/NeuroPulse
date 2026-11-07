import json

with open('public/neurovision/atlases/aal3.labels.json', encoding='utf-8') as f:
    aal = json.load(f)

for l in aal['labels']:
    idx = l['index']
    name = l['name']
    if idx <= 74:
        print(f"{idx}: {name}")
