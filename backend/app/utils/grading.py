def compute_grade(percentage: float) -> str:
    if percentage >= 90: return "A+"
    if percentage >= 80: return "A"
    if percentage >= 70: return "B+"
    if percentage >= 60: return "B"
    if percentage >= 50: return "C"
    if percentage >= 40: return "D"
    return "F"


def compute_subject_grades(result_map: dict, subject_map: dict) -> tuple[list[dict], float, int]:
    subject_grades = []
    total_pct = 0.0
    count = 0
    for subj_id, scores in result_map.items():
        avg = sum(s["score"] for s in scores) / len(scores)
        max_avg = sum(s["max_score"] for s in scores) / len(scores)
        pct = round((avg / max_avg) * 100, 1) if max_avg > 0 else 0
        letter = compute_grade(pct)
        subject_grades.append({
            "subject": subject_map.get(subj_id, "Unknown"),
            "average": round(avg, 1),
            "max": round(max_avg, 1),
            "percentage": pct,
            "grade": letter,
            "exams": scores,
        })
        total_pct += pct
        count += 1
    return subject_grades, total_pct, count
