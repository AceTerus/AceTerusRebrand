"""
Top-level pipeline: load → OMRChecker preprocess → bubble detect → grade.
"""

import sys
from pathlib import Path
from typing import Any, Dict, Optional

import cv2

# Add OMRChecker to path so its src package resolves
_OMRCHECKER_DIR = Path(__file__).parent.parent / "OMRChecker"
if str(_OMRCHECKER_DIR) not in sys.path:
    sys.path.insert(0, str(_OMRCHECKER_DIR))

from src.template import Template
from src.defaults.config import CONFIG_DEFAULTS
from src.utils.parsing import get_concatenated_response

from processing.grader import grade
from processing.ocr import extract_student_id
from processing.preprocess import load_image


_OMR_TEMPLATE_PATH = Path(__file__).parent.parent / "omr_template.json"

# Student-ID OCR crop region (canonical 794×1123 space)
_STUDENT_ID_REGION = {"x": 300, "y": 5, "w": 200, "h": 18}


def _load_omr_template() -> Template:
    return Template(_OMR_TEMPLATE_PATH, CONFIG_DEFAULTS)


def _build_detected(omr_response: dict, output_columns: list) -> Dict[int, Dict[str, Any]]:
    """
    Convert OMRChecker's flat response dict ({"q1": "A", ...}) to the format
    expected by grader:
        {question_number: {"answer", "confidence", "flagged", "fill_ratios"}}
    """
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


def run_pipeline(
    image_path: str,
    answer_keys: list,
) -> Dict[str, Any]:
    """
    Execute the complete OMR pipeline for one image using OMRChecker's engine.

    Returns::

        {
            "student_code":       str | None,
            "detected":           {question_number: bubble_result},
            "grade_result":       {raw_score, max_score, percentage, questions},
            "overall_confidence": float,
        }
    """
    omr_template = _load_omr_template()

    # 1. Load image (handles PDF → BGR ndarray)
    img = load_image(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. OMRChecker preprocessing: resize + configured preprocessors (CropPage)
    processed = omr_template.image_instance_ops.apply_preprocessors(
        image_path, gray, omr_template
    )
    if processed is None:
        raise RuntimeError(
            f"OMRChecker preprocessing failed — no page boundary detected in {image_path}"
        )

    # 3. OCR student ID
    student_code: Optional[str] = extract_student_id(
        processed, {"student_id_region": _STUDENT_ID_REGION}
    )

    # 4. OMRChecker bubble detection
    (
        response_dict,
        _final_marked,
        _multi_marked,
        _multi_roll,
    ) = omr_template.image_instance_ops.read_omr_response(
        omr_template, image=processed, name=Path(image_path).name, save_dir=None
    )

    omr_response = get_concatenated_response(response_dict, omr_template)
    print(f"[OMR] OMRChecker response: {omr_response}", flush=True)

    # 5. Convert to our detected format
    detected = _build_detected(omr_response, omr_template.output_columns)

    # 6. Grade
    grade_result = grade(detected, answer_keys)

    # 7. Overall confidence
    confidences = [r["confidence"] for r in detected.values() if r["confidence"] > 0]
    overall_confidence = round(
        sum(confidences) / len(confidences) if confidences else 0.0, 4
    )

    return {
        "student_code":       student_code,
        "detected":           detected,
        "grade_result":       grade_result,
        "overall_confidence": overall_confidence,
    }
