"""Image loading: handles JPEG/PNG and PDF (first page only)."""

from pathlib import Path

import cv2
import numpy as np


def load_image(image_path: str) -> np.ndarray:
    """
    Load a JPEG / PNG / PDF file into a BGR ndarray.
    For PDFs only the first page is used (rendered at 150 dpi).
    """
    path = Path(image_path)
    ext  = path.suffix.lower()

    if ext == ".pdf":
        try:
            import fitz  # pymupdf
        except ImportError:
            raise RuntimeError("pymupdf is required for PDF support: pip install pymupdf")
        doc = fitz.open(str(path))
        if doc.page_count == 0:
            raise ValueError(f"PDF contains no pages: {image_path}")
        page = doc[0]
        mat  = fitz.Matrix(150 / 72, 150 / 72)  # 150 dpi
        pix  = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        img  = cv2.cvtColor(
            np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3),
            cv2.COLOR_RGB2BGR,
        )
    elif ext in (".jpg", ".jpeg", ".png"):
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"Cannot load image: {image_path}")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    return img
