"""
Bubble detection: for each question/option crop the circular ROI,
measure fill ratio, determine the selected answer and confidence.
"""

import logging
from typing import Any, Dict, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

FILL_THRESHOLD   = 0.35   # ratio above which a bubble counts as filled
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

        logger.info("Q%d fill_ratios: %s", q_num,
                    {k: f"{v:.3f}" for k, v in fill_ratios.items()})

        selected = [opt for opt, ratio in fill_ratios.items() if ratio > FILL_THRESHOLD]

        if len(selected) == 1:
            answer     = selected[0]
            confidence = min(abs(fill_ratios[answer] - 0.5) * 2, 1.0)
            flagged    = confidence < CONFIDENCE_LIMIT

        elif len(selected) == 0:
            # No bubble filled — ambiguous
            answer     = None
            confidence = 0.0
            flagged    = True

        else:
            # Multiple bubbles filled — pick highest, always flag
            answer     = max(fill_ratios, key=fill_ratios.__getitem__)
            confidence = min(abs(fill_ratios[answer] - 0.5) * 2, 1.0)
            flagged    = True

        results[q_num] = {
            "answer":      answer,
            "confidence":  round(confidence, 4),
            "flagged":     flagged,
            "fill_ratios": {k: round(v, 4) for k, v in fill_ratios.items()},
        }

    return results
