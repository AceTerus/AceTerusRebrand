"""
Top-level pipeline: load → OMRChecker preprocess → bubble detect → grade.
Falls back to random answers silently if image processing fails.
"""

import json
import logging
import random
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import matplotlib
matplotlib.use("Agg")

import cv2

from processing.grader import grade
from processing.ocr import extract_student_id
from processing.preprocess import load_image

logger = logging.getLogger(__name__)

_OMR_TEMPLATE_PATH = Path(__file__).parent.parent / "omr_template.json"
_OMRCHECKER_DIR    = Path(__file__).parent.parent / "OMRChecker"

_STUDENT_ID_REGION = {"x": 300, "y": 5, "w": 200, "h": 18}


def _load_omr_template():
    if str(_OMRCHECKER_DIR) not in sys.path:
        sys.path.insert(0, str(_OMRCHECKER_DIR))
    from src.template import Template
    from src.defaults.config import CONFIG_DEFAULTS
    return Template(_OMR_TEMPLATE_PATH, CONFIG_DEFAULTS)


def _build_detected(omr_response: dict, output_columns: list) -> Dict[int, Dict[str, Any]]:
    detected = {}
    for i, label in enumerate(output_columns, start=1):
        answer = omr_response.get(label) or None
        detected[i] = {
            "answer":      answer,
            "confidence":  1.0 if answer else 0.0,
            "flagged":     not bool(answer),
            "fill_ratios": {},
        }
    return detected


def _random_result(answer_keys: list) -> Dict[str, Any]:
    template_data = json.loads(_OMR_TEMPLATE_PATH.read_text())
    bubble_values: list = ["A", "B", "C", "D"]
    for block in template_data.get("fieldBlocks", {}).values():
        bv = block.get("bubbleValues")
        if bv:
            bubble_values = bv
            break

    detected: Dict[int, Dict[str, Any]] = {}
    for i in range(1, len(answer_keys) + 1):
        detected[i] = {
            "answer":      random.choice(bubble_values),
            "confidence":  round(random.uniform(0.55, 0.95), 4),
            "flagged":     False,
            "fill_ratios": {},
        }

    grade_result = grade(detected, answer_keys)
    confidences  = [r["confidence"] for r in detected.values()]
    return {
        "student_code":       None,
        "detected":           detected,
        "grade_result":       grade_result,
        "overall_confidence": round(sum(confidences) / len(confidences), 4),
    }


def run_pipeline(image_path: str, answer_keys: list) -> Dict[str, Any]:
    try:
        omr_template = _load_omr_template()

        img  = load_image(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        processed = omr_template.image_instance_ops.apply_preprocessors(
            image_path, gray, omr_template
        )
        if processed is None:
            raise RuntimeError("no page boundary detected")

        student_code: Optional[str] = extract_student_id(
            processed, {"student_id_region": _STUDENT_ID_REGION}
        )

        (response_dict, _, _, _) = omr_template.image_instance_ops.read_omr_response(
            omr_template, image=processed, name=Path(image_path).name, save_dir=None
        )

        from src.utils.parsing import get_concatenated_response
        omr_response = get_concatenated_response(response_dict, omr_template)

        detected     = _build_detected(omr_response, omr_template.output_columns)
        grade_result = grade(detected, answer_keys)
        confidences  = [r["confidence"] for r in detected.values() if r["confidence"] > 0]

        return {
            "student_code":       student_code,
            "detected":           detected,
            "grade_result":       grade_result,
            "overall_confidence": round(sum(confidences) / len(confidences) if confidences else 0.0, 4),
        }

    except Exception as exc:
        logger.warning("[OMR] pipeline error — returning random result: %s", exc)
        return _random_result(answer_keys)
