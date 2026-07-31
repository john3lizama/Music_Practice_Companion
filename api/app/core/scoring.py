"""Sprint 5 — Scoring v1.

Turns a FeatureSet into stable, deterministic 0–100 scores:
timing consistency, tempo stability, pitch stability, dynamics control,
plus an overall weighted score, key metrics, and flags.

Design rule: every score is a monotonic function of one variability metric,
so a cleaner take always scores >= a sloppier one, and re-running the same
file always gives the same numbers.
"""
from dataclasses import dataclass, field

import numpy as np

from .features import FeatureSet

MIN_ONSETS_FOR_TIMING = 4
MIN_PITCH_FRAMES = 10
TOO_SHORT_SEC = 1.0


@dataclass
class ScoreReport:
    timing_consistency: float | None
    tempo_stability: float | None
    pitch_stability: float | None
    dynamics_control: float | None
    overall: float
    metrics: dict = field(default_factory=dict)
    flags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        rnd = lambda v: round(v, 1) if v is not None else None  # noqa: E731
        return {
            "timing_consistency": rnd(self.timing_consistency),
            "tempo_stability": rnd(self.tempo_stability),
            "pitch_stability": rnd(self.pitch_stability),
            "dynamics_control": rnd(self.dynamics_control),
            "overall": round(self.overall, 1),
            "metrics": {k: round(v, 4) if isinstance(v, float) else v
                        for k, v in self.metrics.items()},
            "flags": self.flags,
        }


def _variability_to_score(value: float, good: float, bad: float) -> float:
    """Map a variability metric to 0–100.

    <= `good` scores 100; >= `bad` scores 0; linear in between.
    """
    if value <= good:
        return 100.0
    if value >= bad:
        return 0.0
    return float(100.0 * (bad - value) / (bad - good))


def score_timing(onsets: list[float]) -> tuple[float | None, dict]:
    """Consistency of inter-onset intervals (lower CV = steadier timing)."""
    if len(onsets) < MIN_ONSETS_FOR_TIMING:
        return None, {}
    intervals = np.diff(np.asarray(onsets))
    mean_iv = float(np.mean(intervals))
    if mean_iv <= 0:
        return None, {}
    cv = float(np.std(intervals) / mean_iv)  # coefficient of variation
    score = _variability_to_score(cv, good=0.05, bad=0.60)
    return score, {"onset_interval_cv": cv, "onset_count": len(onsets)}


def score_tempo_stability(onsets: list[float]) -> tuple[float | None, dict]:
    """Drift between the first and second half of the take."""
    if len(onsets) < MIN_ONSETS_FOR_TIMING * 2:
        return None, {}
    intervals = np.diff(np.asarray(onsets))
    half = len(intervals) // 2
    first, second = intervals[:half], intervals[half:]
    m1, m2 = float(np.median(first)), float(np.median(second))
    if m1 <= 0 or m2 <= 0:
        return None, {}
    drift = abs(m2 - m1) / m1  # relative tempo drift
    score = _variability_to_score(drift, good=0.02, bad=0.35)
    return score, {"tempo_drift_ratio": drift}


def score_pitch_stability(
    pitch_curve: list[float | None],
) -> tuple[float | None, dict]:
    """Local pitch variability in cents (ignores intentional note changes
    by measuring frame-to-frame deviation rather than global variance)."""
    voiced = np.asarray([v for v in pitch_curve if v is not None and v > 0])
    if len(voiced) < MIN_PITCH_FRAMES:
        return None, {}
    cents = 1200.0 * np.log2(voiced / 440.0)
    # Frame-to-frame movement; large jumps (> 1 semitone) are treated as note
    # transitions and excluded so melodies aren't penalized as "instability".
    deltas = np.abs(np.diff(cents))
    within_note = deltas[deltas <= 100.0]
    if len(within_note) == 0:
        return None, {}
    mean_dev_cents = float(np.mean(within_note))
    score = _variability_to_score(mean_dev_cents, good=5.0, bad=60.0)
    return score, {"mean_pitch_deviation_cents": mean_dev_cents,
                   "voiced_frames": int(len(voiced))}


def score_dynamics(
    rms_curve: list[float], clipping: bool
) -> tuple[float | None, dict, list[str]]:
    flags: list[str] = []
    rms = np.asarray([v for v in rms_curve if v >= 0])
    if len(rms) < 4 or float(np.mean(rms)) <= 0:
        return None, {}, flags
    cv = float(np.std(rms) / np.mean(rms))
    score = _variability_to_score(cv, good=0.15, bad=1.2)
    if clipping:
        flags.append("clipping_detected")
        score = max(0.0, score - 20.0)  # clipped audio can't score full marks
    return score, {"rms_cv": cv}, flags


def score_all(features: FeatureSet) -> ScoreReport:
    flags: list[str] = []
    metrics: dict = {}

    if features.duration_sec < TOO_SHORT_SEC:
        flags.append("too_short")

    timing, m = score_timing(features.onsets)
    metrics.update(m)

    tempo_stab, m = score_tempo_stability(features.onsets)
    metrics.update(m)

    pitch_stab, m = score_pitch_stability(features.pitch_curve)
    metrics.update(m)

    dynamics, m, dyn_flags = score_dynamics(
        features.rms_curve, features.clipping_detected
    )
    metrics.update(m)
    flags.extend(dyn_flags)

    # Overall = weighted mean of the categories that could be computed.
    weights = {
        "timing": (timing, 0.3),
        "tempo": (tempo_stab, 0.2),
        "pitch": (pitch_stab, 0.3),
        "dynamics": (dynamics, 0.2),
    }
    available = [(s, w) for s, w in weights.values() if s is not None]
    if available:
        total_w = sum(w for _, w in available)
        overall = sum(s * w for s, w in available) / total_w
    else:
        overall = 0.0
        flags.append("no_scorable_content")

    return ScoreReport(
        timing_consistency=timing,
        tempo_stability=tempo_stab,
        pitch_stability=pitch_stab,
        dynamics_control=dynamics,
        overall=float(overall),
        metrics=metrics,
        flags=flags,
    )
