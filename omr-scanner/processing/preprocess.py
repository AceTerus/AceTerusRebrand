"""Image loading and preprocessing: grayscale → CLAHE → blur → threshold → warp."""

import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Image loading
# ---------------------------------------------------------------------------

def load_image(image_path: str) -> np.ndarray:
    """
    Load a JPEG / PNG / PDF file into a BGR ndarray.
    For PDFs only the first page is used.
    """
    path = Path(image_path)
    ext  = path.suffix.lower()

    if ext == ".pdf":
        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise RuntimeError("pdf2image is required for PDF support: pip install pdf2image")
        pages = convert_from_path(str(path), dpi=150, first_page=1, last_page=1)
        if not pages:
            raise ValueError(f"PDF contains no pages: {image_path}")
        img_pil = pages[0]
        img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    elif ext in (".jpg", ".jpeg", ".png"):
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"Cannot load image: {image_path}")
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    return img


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

def preprocess(img: np.ndarray, template_config: dict) -> np.ndarray:
    """
    Full preprocessing pipeline.
    Returns a binary (THRESH_BINARY_INV) image warped to canonical size.
    """
    canonical_w = template_config["canonical_width"]
    canonical_h = template_config["canonical_height"]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # CLAHE
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Gaussian blur
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    # Adaptive threshold (used for registration mark detection)
    thresh = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        11, 2,
    )

    # Detect marks and warp
    warped_gray = _align_image(gray, thresh, template_config, canonical_w, canonical_h)

    # Re-apply CLAHE + blur + threshold after warp for clean bubble detection
    clahe2       = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    warped_enh   = clahe2.apply(warped_gray)
    warped_blur  = cv2.GaussianBlur(warped_enh, (5, 5), 0)
    warped_thresh = cv2.adaptiveThreshold(
        warped_blur, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        11, 2,
    )
    return warped_thresh


# ---------------------------------------------------------------------------
# Registration mark helpers
# ---------------------------------------------------------------------------

def _find_registration_marks(thresh: np.ndarray) -> list:
    """
    Find one registration mark per corner by searching each corner region
    independently. This is scale-independent and works at any resolution.
    Returns a list of up to 4 (cx, cy) tuples.
    """
    img_h, img_w = thresh.shape
    # Search the inner 20% of each corner
    rh = int(img_h * 0.20)
    rw = int(img_w * 0.20)

    # (row_slice, col_slice, global_x_offset, global_y_offset)
    regions = [
        (slice(0, rh),        slice(0, rw),        0,           0),
        (slice(0, rh),        slice(img_w-rw, None), img_w-rw,  0),
        (slice(img_h-rh, None), slice(0, rw),       0,           img_h-rh),
        (slice(img_h-rh, None), slice(img_w-rw, None), img_w-rw, img_h-rh),
    ]

    marks = []
    for (rs, cs, ox, oy) in regions:
        region = thresh[rs, cs]
        contours, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best_mark  = None
        best_score = 0

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 20:
                continue
            x, y, cw, ch = cv2.boundingRect(cnt)
            if cw == 0 or ch == 0:
                continue
            aspect = cw / ch
            if not (0.4 < aspect < 2.5):
                continue
            # Prefer larger, more square contours
            squareness = 1.0 - abs(1.0 - aspect) / 2.0
            score = area * squareness
            if score > best_score:
                best_score = score
                best_mark  = (ox + x + cw // 2, oy + y + ch // 2)

        if best_mark:
            marks.append(best_mark)
    return marks


def _sort_four_points(pts: list) -> tuple:
    """Sort four (x, y) points as TL, TR, BL, BR."""
    pts_sorted_y = sorted(pts, key=lambda p: p[1])
    top    = sorted(pts_sorted_y[:2], key=lambda p: p[0])
    bottom = sorted(pts_sorted_y[2:], key=lambda p: p[0])
    return top[0], top[1], bottom[0], bottom[1]


def _align_image(
    gray: np.ndarray,
    thresh: np.ndarray,
    template_config: dict,
    canonical_w: int,
    canonical_h: int,
) -> np.ndarray:
    """
    Detect registration marks, compute a homography, warp the grayscale image
    to canonical size.  Falls back to a plain resize if fewer than 4 marks
    are found.
    """
    reg = template_config["registration_marks"]
    dst_pts = np.float32([
        [reg["top_left"]["x"],     reg["top_left"]["y"]],
        [reg["top_right"]["x"],    reg["top_right"]["y"]],
        [reg["bottom_left"]["x"],  reg["bottom_left"]["y"]],
        [reg["bottom_right"]["x"], reg["bottom_right"]["y"]],
    ])

    marks = _find_registration_marks(thresh)

    if len(marks) >= 4:
        # Pick the 4 extremal marks closest to the corners
        marks_np = np.array(marks, dtype=np.float32)
        tl, tr, bl, br = _sort_four_points(marks_np.tolist())
        src_pts = np.float32([tl, tr, bl, br])
        M, _ = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        if M is not None:
            print(f"[OMR] Warp succeeded — {len(marks)} marks found", flush=True)
            return cv2.warpPerspective(gray, M, (canonical_w, canonical_h))

    # Fallback: resize without warp
    print(f"[OMR] Warp FAILED — only {len(marks)} marks found, falling back to plain resize", flush=True)
    return cv2.resize(gray, (canonical_w, canonical_h))
