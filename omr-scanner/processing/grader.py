"""Grade detected answers against the answer key."""

from typing import Any, Dict, List


def grade(
    detected: Dict[int, Dict[str, Any]],
    answer_keys: list,          # List[models.AnswerKey]
) -> Dict[str, Any]:
    """
    Compare detected answers vs the answer key.

    Returns::

        {
            "raw_score":  float,
            "max_score":  float,
            "percentage": float,
            "questions":  [ {question_number, detected_answer, correct_answer,
                              is_correct, confidence, flagged} ]
        }
    """
    key_map = {ak.question_number: ak for ak in answer_keys}

    raw_score = 0.0
    max_score = sum(ak.points for ak in answer_keys)
    questions = []

    for q_num, result in sorted(detected.items()):
        ak = key_map.get(q_num)
        if ak is None:
            continue

        detected_answer = result["answer"]
        is_correct      = bool(detected_answer and detected_answer == ak.correct_answer)

        if is_correct:
            raw_score += ak.points

        questions.append({
            "question_number": q_num,
            "detected_answer": detected_answer,
            "correct_answer":  ak.correct_answer,
            "is_correct":      is_correct,
            "confidence":      result["confidence"],
            "flagged":         result["flagged"],
        })

    percentage = round((raw_score / max_score * 100) if max_score > 0 else 0.0, 2)

    return {
        "raw_score":  raw_score,
        "max_score":  max_score,
        "percentage": percentage,
        "questions":  questions,
    }
