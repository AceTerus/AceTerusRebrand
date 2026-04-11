"""
Bubble detection: for each question/option crop the circular ROI,
measure fill ratio, determine the selected answer and confidence.
"""

import logging
from typing import Any, Dict, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

FILL_THRESHOLD   = 0.10   # absolute minimum — filters out true background noise
RELATIVE_RATIO   = 1.8    # selected bubble must be >= this × mean of remaining bubbles
CONFIDENCE_LIMIT = 0.45   # below this confidence the question is flagged


# ---------------------------------------------------------------------------
# Coordinate helper
# ---------------------------------------------------------------------------

def _build_bubble_map(template_config: dict) -> Dict[int, Dict[str, Tuple[int, int, int]]]:
    """
    Returns {question_number: {option: (cx, cy, radius)}}
    computed from the layout parameters in template_config.
    """
    q_cfg   = template_config["questions"]
    options = q_cfg["options"]
    coords  = {}

    for col in q_cfg["columns"]:
        q_start, q_end       = col["question_range"]
        bubble_start_x       = col["bubble_start_x"]
        bubble_spacing_x     = col["bubble_spacing_x"]
        row_start_y          = col["row_start_y"]
        row_spacing_y        = col["row_spacing_y"]
        radius               = col["bubble_radius"]

        for i, q_num in enumerate(range(q_start, q_end + 1)):
            row_y = row_start_y + i * row_spacing_y
            coords[q_num] = {}
            for j, opt in enumerate(options):
                cx = bubble_start_x + j * bubble_spacing_x
                coords[q_num][opt] = (cx, row_y, radius)

    return coords


# ---------------------------------------------------------------------------
# Fill-ratio measurement
# ---------------------------------------------------------------------------

def _measure_fill(thresh: np.ndarray, cx: int, cy: int, radius: int) -> float:
    """
    Count non-zero pixels inside a circular ROI divided by the circle area.
    """
    h, w  = thresh.shape
    mask  = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, (cx, cy), radius, 255, -1)

    total_pixels  = np.pi * radius * radius          # ideal circle area
    filled_pixels = cv2.countNonZero(
        cv2.bitwise_and(thresh, thresh, mask=mask)
    )
    return filled_pixels / max(total_pixels, 1)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_bubbles(
    warped_thresh: np.ndarray,
    template_config: dict,
) -> Dict[int, Dict[str, Any]]:
    """
    Detect selected bubbles for all 40 questions.

    Returns::

        {
            question_number: {
                "answer":      "A" | None,
                "confidence":  float (0–1),
                "flagged":     bool,
                "fill_ratios": {"A": 0.12, "B": 0.87, ...},
            }
        }
    """
    bubble_map = _build_bubble_map(template_config)
    results    = {}

    for q_num, options in bubble_map.items():
        fill_ratios: Dict[str, float] = {}

        for opt, (cx, cy, radius) in options.items():
            fill_ratios[opt] = _measure_fill(warped_thresh, cx, cy, radius)

        print(f"[OMR] Q{q_num} fill_ratios: { {k: round(v,3) for k,v in fill_ratios.items()} }", flush=True)

        best_opt   = max(fill_ratios, key=fill_ratios.__getitem__)
        best_ratio = fill_ratios[best_opt]
        others     = [v for k, v in fill_ratios.items() if k != best_opt]
        mean_other = sum(others) / len(others) if others else 0.0

        # A bubble is "filled" if it clears the absolute floor AND stands out
        # clearly above the background noise of the remaining bubbles.
        if best_ratio >= FILL_THRESHOLD and best_ratio >= mean_other * RELATIVE_RATIO:
            answer     = best_opt
            # Confidence: how far above the noise floor (capped at 1.0)
            confidence = min((best_ratio - mean_other) / max(best_ratio, 0.001), 1.0)
            flagged    = confidence < CONFIDENCE_LIMIT
        else:
            # Nothing clearly filled
            answer     = None
            confidence = 0.0
            flagged    = True

        results[q_num] = {
            "answer":      answer,
            "confidence":  round(confidence, 4),
            "flagged":     flagged,
            "fill_ratios": {k: round(v, 4) for k, v in fill_ratios.items()},
        }

    return results
