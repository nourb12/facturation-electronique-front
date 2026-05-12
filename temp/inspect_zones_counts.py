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
print('all', len(lines))
print('header', len(z.get('header', [])))
print('footer', len(z.get('footer', [])))
print('body', len(z.get('body', [])))
print('footer_right sample:')
for l in sorted(z.get('footer_right', []), key=lambda x: (x.y_mid() or 0, x.x_mid() or 0))[:40]:
    print(l.text.encode('ascii','backslashreplace').decode('ascii'))
