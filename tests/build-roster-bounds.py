"""Measure transparent margins for OBS framing; never modify source portraits."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
bounds = {}
catalog = sum((json.loads((root / f'data/{role}.json').read_text(encoding='utf-8')) for role in ('killers', 'survivors')), [])
for item in catalog:
    with Image.open(root / item['image']) as image:
        box = image.convert('RGBA').getchannel('A').getbbox()
        if box:
            left, top, right, bottom = box
            bounds[item['image']] = {
                'width': image.width, 'height': image.height,
                'viewBox': [left, top, right - left, bottom - top]
            }
(root / 'data/challenge-roster-bounds.json').write_text(
    json.dumps(bounds, indent=2) + '\n', encoding='utf-8')
print(f'Measured {len(bounds)} complete portraits; source pixels unchanged.')
