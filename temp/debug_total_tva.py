import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, r"C:\backendpfe\einvoicing\ocr_service")
import main  # noqa: E402

img_path = Path(r"C:\Users\nourb\Downloads\WhatsApp Image 2026-05-10 at 12.49.56.jpeg")
img = Image.open(img_path).convert("RGB")
arr = np.array(img)
lines = main.ocr_image(arr)
z = main.split_layout_zones(lines)
footer = z.get('footer', [])

# find label line
labels = [l for l in footer if 'TOTAL TVA' in l.text.upper()]
print('footer lines', len(footer))
print('labels', len(labels))
for lab in labels[:3]:
    print('LABEL', lab.text)
    lb = lab.bounds()
    print('  bounds', lb)
    if lb is None:
        continue
    lx0, ly0, lx1, ly1 = lb
    # scan candidates
    cands = []
    for c in footer:
        cb = c.bounds()
        if cb is None:
            continue
        cx0, cy0, cx1, cy1 = cb
        if cy0 <= ly1:
            continue
        delta_y = cy0 - ly1
        overlap = max(0.0, min(lx1, cx1) - max(lx0, cx0))
        if overlap <= 0:
            continue
        if not any(ch.isdigit() for ch in c.text):
            continue
        cands.append((delta_y, overlap, c.text, cb))
    cands.sort(key=lambda x: x[0])
    for item in cands[:10]:
        print('  cand', item[0], 'overlap', item[1], item[2], item[3])
