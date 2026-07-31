"""Sprint 9 — Reference comparison.

Compares a performance's FeatureSet against a reference recording's FeatureSet:
tempo alignment, onset (rhythm) pattern similarity, and pitch contour
similarity. Returns a match score plus human-readable mismatch highlights.
"""
import numpy as np

from .features import FeatureSet

RESAMPLE_POINTS = 64


def _resample(values: np.ndarray, n: int) -> np.ndarray:
    if len(values) == 0:
        return values
    if len(values) == 1:
        return np.repeat(values, n)
    x_old = np.linspace(0.0, 1.0, len(values))
    x_new = np.linspace(0.0, 1.0, n)
    return np.interp(x_new, x_old, values)


def _tempo_similarity(user: FeatureSet, ref: FeatureSet) -> tuple[float | None, str | None]:
    if not user.tempo_bpm or not ref.tempo_bpm:
        return None, None
    ratio = user.tempo_bpm / ref.tempo_bpm
    # Fold octave errors (double/half-time detection is common in tempo trackers).
    while ratio > 1.5:
        ratio /= 2.0
    while ratio < 0.67:
        ratio *= 2.0
    diff = abs(ratio - 1.0)
    score = max(0.0, 100.0 * (1.0 - diff / 0.25))  # 25% off => 0
    note = None
    if diff > 0.05:
        direction = "faster" if user.tempo_bpm > ref.tempo_bpm else "slower"
        note = f"Tempo is ~{diff * 100:.0f}% {direction} than the reference."
    return score, note


def _rhythm_similarity(user: FeatureSet, ref: FeatureSet) -> tuple[float | None, str | None]:
    if len(user.onsets) < 4 or len(ref.onsets) < 4:
        return None, None
    u = np.diff(np.asarray(user.onsets))
    r = np.diff(np.asarray(ref.onsets))
    # Normalize by each take's median interval => tempo-invariant rhythm shape.
    u = u / np.median(u)
    r = r / np.median(r)
    u_rs = _resample(u, RESAMPLE_POINTS)
    r_rs = _resample(r, RESAMPLE_POINTS)
    mean_abs_diff = float(np.mean(np.abs(u_rs - r_rs)))
    score = max(0.0, 100.0 * (1.0 - mean_abs_diff / 1.0))
    note = None
    if score < 70:
        note = "Rhythmic pattern deviates from the reference — some note placements differ."
    return score, note


def _pitch_similarity(user: FeatureSet, ref: FeatureSet) -> tuple[float | None, str | None]:
    u = np.asarray([v for v in user.pitch_curve if v], dtype=float)
    r = np.asarray([v for v in ref.pitch_curve if v], dtype=float)
    if len(u) < 10 or len(r) < 10:
        return None, None
    # Median-centered cents => key/octave-offset tolerant contour comparison.
    u_c = 1200.0 * np.log2(u / np.median(u))
    r_c = 1200.0 * np.log2(r / np.median(r))
    u_rs = _resample(u_c, RESAMPLE_POINTS)
    r_rs = _resample(r_c, RESAMPLE_POINTS)
    mean_abs_cents = float(np.mean(np.abs(u_rs - r_rs)))
    score = max(0.0, 100.0 * (1.0 - mean_abs_cents / 400.0))  # 4 semitones avg => 0
    note = None
    if score < 70:
        note = "Melodic contour drifts from the reference in places."
    return score, note


def compare_to_reference(user: FeatureSet, ref: FeatureSet) -> dict:
    """Returns reference_match_score (0–100 or None) + mismatch_highlights."""
    highlights: list[str] = []
    components: dict[str, float] = {}

    for name, (score, note) in {
        "tempo": _tempo_similarity(user, ref),
        "rhythm": _rhythm_similarity(user, ref),
        "pitch_contour": _pitch_similarity(user, ref),
    }.items():
        if score is not None:
            components[name] = round(score, 1)
        if note:
            highlights.append(note)

    if components:
        match_score = round(float(np.mean(list(components.values()))), 1)
    else:
        match_score = None
        highlights.append(
            "Not enough comparable content between the two recordings."
        )

    return {
        "reference_match_score": match_score,
        "components": components,
        "mismatch_highlights": highlights,
    }
