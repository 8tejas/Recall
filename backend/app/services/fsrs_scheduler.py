from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple

# Quality mapping:
# 'completely_remembered' -> 3 (Excellent)
# 'minor_omissions'       -> 2 (Good)
# 'major_omissions'       -> 1 (Hard / Lapse)
# 'unable'                -> 0 (Complete failure)

QUALITY_MAP = {
    "completely_remembered": 3,
    "minor_omissions": 2,
    "major_omissions": 1,
    "unable": 0,
}

class SpacedRepetitionScheduler:
    """
    FSRS / SM-2 inspired scheduler for academic recall.
    Calculates interval, difficulty, and stability for memorization items.
    """

    @staticmethod
    def calculate_next_review(
        current_stability: float,
        current_difficulty: float,
        reps: int,
        lapses: int,
        rating: str,
    ) -> Dict[str, Any]:
        grade = QUALITY_MAP.get(rating, 1)
        now = datetime.now(timezone.utc)

        # 1. Update Difficulty (1.0 to 10.0 scale)
        # Grade 3 decreases difficulty, Grade 0/1 increases difficulty
        delta_d = -0.5 * (grade - 2)
        new_difficulty = max(1.0, min(10.0, current_difficulty + delta_d))

        # 2. Update Stability & Repetitions
        if grade >= 2:
            # Successful recall
            new_reps = reps + 1
            new_lapses = lapses
            if reps == 0:
                new_stability = 1.0 if grade == 2 else 2.5
                interval_days = 1.0 if grade == 2 else 2.0
            elif reps == 1:
                new_stability = current_stability * 2.2
                interval_days = max(2.0, new_stability)
            else:
                # Expanding interval based on difficulty and stability factor
                factor = 2.4 - (new_difficulty * 0.1)
                factor = max(1.3, factor)
                new_stability = current_stability * factor
                interval_days = new_stability
        else:
            # Lapse / Incomplete recall
            new_reps = 0
            new_lapses = lapses + 1
            new_stability = max(0.5, current_stability * 0.4)
            # Fails return quickly: within 4 hours if unable, 12-24 hours if major omissions
            interval_days = 0.2 if grade == 0 else 0.8

        due_date = now + timedelta(days=interval_days)

        return {
            "stability": round(new_stability, 3),
            "difficulty": round(new_difficulty, 2),
            "reps": new_reps,
            "lapses": new_lapses,
            "last_reviewed": now,
            "due_date": due_date,
            "interval_days": round(interval_days, 2),
        }
