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

label = None
for l in footer:
    if 'TOTAL TVA' in l.text.upper():
        label = l
        break

print('label', label.text if label else None)
if not label or not label.bounds():
    raise SystemExit(0)

lx0, ly0, lx1, ly1 = label.bounds()
lymid = (ly0+ly1)/2

print('label bounds', (lx0,ly0,lx1,ly1))

for c in footer:
    cb = c.bounds()
    if cb is None:
        continue
    cx0, cy0, cx1, cy1 = cb
    cymid = (cy0+cy1)/2
    row_dy = abs(cymid - lymid)
    if row_dy > 40:  # pixels
        continue
    m = main.AMOUNT_RE.search(c.text)
    if not m:
        continue
    val = m.group(1)
    dx_left = lx0 - cx1  # candidate to left of label if positive
    dx_right = cx0 - lx1 # candidate to right of label if positive
    print('cand', c.text.encode('ascii','backslashreplace').decode('ascii'), 'bounds', cb, 'row_dy', row_dy, 'dx_left', dx_left, 'dx_right', dx_right)
