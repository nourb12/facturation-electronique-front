import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, r"C:\backendpfe\einvoicing\ocr_service")
import main  # noqa: E402


def safe(s: str) -> str:
    return s.encode("ascii", "backslashreplace").decode("ascii")


img_path = Path(r"C:\Users\nourb\Downloads\WhatsApp Image 2026-05-10 at 12.49.56.jpeg")
img = Image.open(img_path).convert("RGB")
arr = np.array(img)
lines = main.ocr_image(arr)
z = main.split_layout_zones(lines)

print('--- header left ---')
for l in sorted(z.get('header_left', []), key=lambda x: (x.y_mid() or 0, x.x_mid() or 0))[:80]:
    print(safe(l.text))

print('--- header right ---')
for l in sorted(z.get('header_right', []), key=lambda x: (x.y_mid() or 0, x.x_mid() or 0))[:80]:
    print(safe(l.text))
