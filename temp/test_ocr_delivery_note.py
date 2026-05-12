import sys
import json
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, r"C:\backendpfe\einvoicing\ocr_service")
import main  # noqa: E402

img_path = Path(r"C:\Users\nourb\Downloads\WhatsApp Image 2026-05-10 at 12.49.56.jpeg")
img = Image.open(img_path).convert("RGB")
arr = np.array(img)
lines = main.ocr_image(arr)
raw = "\n".join(l.text for l in lines)
fields = main.build_accounting_fields("delivery_note", lines, raw)

print("lines", len(lines))
keep = {
    "delivery_note_number",
    "supplier_name",
    "issue_date",
    "client_name",
    "client_code",
    "order_reference",
    "payment_method",
    "due_date",
    "brut_ht",
    "remise_amount",
    "net_ht",
    "total_tva",
    "timbre",
    "total_ttc",
    "total_to_pay",
}
for f in fields:
    if f.key in keep:
        print(f"{f.key}: {f.value} (conf={f.confidence}, req={f.required}, review={f.requiresReview})")
