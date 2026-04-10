"""OCR: extract the student ID from the warped binary image."""

from typing import Optional

import cv2
import numpy as np

try:
    import pytesseract
    _TESSERACT_AVAILABLE = True
except ImportError:
    _TESSERACT_AVAILABLE = False


def extract_student_id(warped_thresh: np.ndarray, template_config: dict) -> Optional[str]:
    """
    Crop the student-ID region, run Tesseract in digit-only mode,
    and return the cleaned numeric string (or None on failure).
    """
    if not _TESSERACT_AVAILABLE:
        return None

    region = template_config["student_id_region"]
    x, y, w, h = region["x"], region["y"], region["w"], region["h"]

    roi = warped_thresh[y : y + h, x : x + w]

    # Invert so text is dark on white background for Tesseract
    roi_inv = cv2.bitwise_not(roi)

    # Scale up for better accuracy
    roi_big = cv2.resize(roi_inv, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)

    # Slight blur to reduce noise after scaling
    roi_big = cv2.GaussianBlur(roi_big, (3, 3), 0)

    tess_config = "--psm 8 --oem 3 -c tessedit_char_whitelist=0123456789"
    try:
        raw = pytesseract.image_to_string(roi_big, config=tess_config)
    except Exception:
        return None

    digits = "".join(c for c in raw if c.isdigit())
    return digits if digits else None
