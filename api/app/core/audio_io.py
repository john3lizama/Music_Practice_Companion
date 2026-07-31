"""Sprint 3 — Audio I/O + normalization.

Every valid audio file becomes a consistent (y, sr, duration) triple:
mono, fixed sample rate, peak-normalized, silence-trimmed. Downstream
feature extraction can then assume one canonical input shape.
"""
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np

TARGET_SR = 22050
TRIM_TOP_DB = 40
# Samples at/above this absolute amplitude (pre-normalization) count as clipping.
CLIP_THRESHOLD = 0.999


class AudioLoadError(Exception):
    """Raised when a file can't be decoded as audio."""


@dataclass(frozen=True)
class LoadedAudio:
    y: np.ndarray          # mono float32, peak-normalized, silence-trimmed
    sr: int
    duration_sec: float    # duration after trimming
    clipping_detected: bool


def load_audio(path: str | Path, target_sr: int = TARGET_SR) -> LoadedAudio:
    """Load any decodable audio file into the canonical format.

    Steps: decode -> mono -> resample(target_sr) -> clipping check ->
    peak normalize -> trim leading/trailing silence.
    """
    try:
        # mono=True averages channels; sr=target_sr resamples.
        y, sr = librosa.load(str(path), sr=target_sr, mono=True)
    except Exception as exc:  # soundfile/audioread raise various types
        raise AudioLoadError(f"Could not decode audio file: {exc}") from exc

    if y.size == 0:
        raise AudioLoadError("Audio file contains no samples")

    # Detect clipping on the raw decoded signal, before we rescale it.
    clipping = bool(np.any(np.abs(y) >= CLIP_THRESHOLD))

    # Peak normalize (guard against digital silence).
    peak = float(np.max(np.abs(y)))
    if peak > 0:
        y = y / peak

    # Trim leading/trailing silence.
    y_trimmed, _ = librosa.effects.trim(y, top_db=TRIM_TOP_DB)
    if y_trimmed.size > 0:
        y = y_trimmed

    duration = float(len(y) / target_sr)
    return LoadedAudio(
        y=y.astype(np.float32),
        sr=target_sr,
        duration_sec=duration,
        clipping_detected=clipping,
    )
