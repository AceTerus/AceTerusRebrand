"""
Top-level pipeline: load → preprocess → OCR → bubble detect → grade.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from processing.grader    import grade
from processing.ocr       import extract_student_id
from processing.omr       import detect_bubbles
from processing.preprocess import load_image, preprocess


def _load_template(config_path: str = "template_config.json") -> dict:
    with open(config_path) as fh:
        return json.load(fh)


def run_pipeline(
    image_path: str,
    answer_keys: list,                   # List[models.AnswerKey]
    template_config_path: str = "template_config.json",
) -> Dict[str, Any]:
    """
    Execute the complete OMR pipeline for one image.

    Returns::

        {
            "student_code":       str | None,
            "detected":           {question_number: bubble_result},
            "grade_result":       {raw_score, max_score, percentage, questions},
            "overall_confidence": float,
        }
    """
    template = _load_template(template_config_path)

    # 1. Load
    img = load_image(image_path)

    # 2. Preprocess & warp
    warped = preprocess(img, template)

    # 3. OCR student ID
    student_code: Optional[str] = extract_student_id(warped, template)

    # 4. Detect bubbles
    detected = detect_bubbles(warped, template)

    # 5. Grade
    grade_result = grade(detected, answer_keys)

    # 6. Overall confidence (average of per-question confidences)
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
