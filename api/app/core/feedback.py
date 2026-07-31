"""Sprint 6 — Feedback generation v1.

Rule-based coaching: turns a ScoreReport into prioritized, musician-friendly
advice. Always returns at least one item, includes a drill per weakness, and
adds positive reinforcement for strong categories.
"""
from dataclasses import dataclass

from .scoring import ScoreReport

STRONG = 85.0
OK = 70.0
WEAK = 50.0


@dataclass
class FeedbackItem:
    category: str
    severity: str  # "high" | "medium" | "low" | "praise"
    message: str
    drill: str | None = None

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "severity": self.severity,
            "message": self.message,
            "drill": self.drill,
        }


def _severity(score: float) -> str:
    if score < WEAK:
        return "high"
    if score < OK:
        return "medium"
    return "low"


_RULES = {
    "timing": {
        "weak_message": "Your note timing wanders — spacing between notes varies noticeably.",
        "ok_message": "Timing is decent but not locked in yet; a few phrases rush or drag.",
        "drill": "Practice the passage with a metronome at 70% tempo. Only raise the tempo 5 BPM after 3 clean passes in a row.",
        "praise": "Timing is locked in with the beat — great rhythmic control.",
    },
    "tempo": {
        "weak_message": "You speed up or slow down over the course of the take.",
        "ok_message": "Slight tempo drift between the start and end of the take.",
        "drill": "Record yourself with a click, then mute the click halfway through and compare where you land when it returns.",
        "praise": "Tempo stays rock steady from start to finish.",
    },
    "pitch": {
        "weak_message": "Pitch drifts during sustained notes.",
        "ok_message": "Intonation is close, but sustained notes waver a little.",
        "drill": "Long tones: hold each note 8 beats against a drone, aiming for zero waver. For vocals, focus on steady breath support.",
        "praise": "Strong intonation — your pitch stays within a tight band.",
    },
    "dynamics": {
        "weak_message": "Volume control is erratic — some notes jump out while others disappear.",
        "ok_message": "Dynamics are mostly controlled with occasional spikes.",
        "drill": "Play the passage at one fixed dynamic (mf) focusing on identical attack for every note, then practice deliberate crescendos.",
        "praise": "Nice, even dynamic control across the take.",
    },
}

_FLAG_MESSAGES = {
    "clipping_detected": FeedbackItem(
        category="recording",
        severity="medium",
        message="The recording clips (distorts) at loud moments, which also skews analysis.",
        drill="Lower your input gain so the loudest note peaks around -6 dB, and keep some distance from the mic.",
    ),
    "too_short": FeedbackItem(
        category="recording",
        severity="low",
        message="The clip is very short — record at least 10–15 seconds for reliable feedback.",
        drill=None,
    ),
    "no_scorable_content": FeedbackItem(
        category="recording",
        severity="high",
        message="We couldn't detect musical content to score — check the recording isn't silent or extremely noisy.",
        drill="Do a 5-second test recording and play it back before a full take.",
    ),
}


def generate(report: ScoreReport) -> dict:
    """Return {"feedback_items": [...], "top_3_focus": [...]}."""
    items: list[FeedbackItem] = []
    weaknesses: list[tuple[float, str]] = []

    categories = {
        "timing": report.timing_consistency,
        "tempo": report.tempo_stability,
        "pitch": report.pitch_stability,
        "dynamics": report.dynamics_control,
    }

    best_cat, best_score = None, -1.0
    for cat, score in categories.items():
        if score is None:
            continue
        rules = _RULES[cat]
        if score >= STRONG:
            if score > best_score:
                best_cat, best_score = cat, score
        elif score >= OK:
            items.append(FeedbackItem(cat, _severity(score), rules["ok_message"], rules["drill"]))
            weaknesses.append((score, cat))
        else:
            items.append(FeedbackItem(cat, _severity(score), rules["weak_message"], rules["drill"]))
            weaknesses.append((score, cat))

    # Positive reinforcement for the strongest category.
    if best_cat is not None:
        items.append(FeedbackItem(best_cat, "praise", _RULES[best_cat]["praise"]))

    # Flag-driven items (recording issues).
    for flag in report.flags:
        if flag in _FLAG_MESSAGES:
            items.append(_FLAG_MESSAGES[flag])

    # Guarantee at least one item.
    if not items:
        items.append(
            FeedbackItem(
                category="general",
                severity="praise",
                message="Solid take across the board — raise the tempo or difficulty and keep pushing.",
            )
        )

    top_3 = [cat for _, cat in sorted(weaknesses)[:3]]

    return {
        "feedback_items": [i.to_dict() for i in items],
        "top_3_focus": top_3,
    }
