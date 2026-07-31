"""Sprint 4 — Feature extraction v1.

Extracts a small, reliable FeatureSet from normalized audio:
onsets, tempo, RMS energy curve, pitch curve, spectral centroid.
Always returns a valid structure — degenerate inputs produce warnings,
never exceptions.
"""
from dataclasses import dataclass, field

import librosa
import numpy as np
from librosa.feature import rhythm  # submodule needs an explicit import

HOP_LENGTH = 512
MAX_CURVE_POINTS = 400  # cap stored curve sizes so session JSON stays small
MIN_DURATION_SEC = 1.0

PITCH_FMIN = librosa.note_to_hz("C2")   # ~65 Hz
PITCH_FMAX = librosa.note_to_hz("C6")   # ~1047 Hz


@dataclass
class FeatureSet:
    duration_sec: float
    onsets: list[float]                       # onset times in seconds
    tempo_bpm: float | None
    rms_curve: list[float]                    # downsampled RMS energy
    rms_times: list[float]                    # matching timestamps (seconds)
    pitch_curve: list[float | None]           # f0 in Hz, None where unvoiced
    pitch_times: list[float]
    spectral_centroid_mean: float | None
    clipping_detected: bool
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "duration_sec": round(self.duration_sec, 3),
            "onsets": [round(t, 4) for t in self.onsets],
            "tempo_bpm": round(self.tempo_bpm, 2) if self.tempo_bpm else None,
            "rms_curve": [round(v, 5) for v in self.rms_curve],
            "rms_times": [round(t, 4) for t in self.rms_times],
            "pitch_curve": [round(v, 2) if v is not None else None for v in self.pitch_curve],
            "pitch_times": [round(t, 4) for t in self.pitch_times],
            "spectral_centroid_mean": (
                round(self.spectral_centroid_mean, 2)
                if self.spectral_centroid_mean is not None
                else None
            ),
            "clipping_detected": self.clipping_detected,
            "warnings": self.warnings,
        }


def _downsample(values: np.ndarray, times: np.ndarray, max_points: int):
    if len(values) <= max_points:
        return values, times
    idx = np.linspace(0, len(values) - 1, max_points).astype(int)
    return values[idx], times[idx]


def extract_all(y: np.ndarray, sr: int, clipping_detected: bool = False) -> FeatureSet:
    warnings: list[str] = []
    duration = float(len(y) / sr)

    if duration < MIN_DURATION_SEC:
        warnings.append(
            f"Audio is very short ({duration:.2f}s) — results may be unreliable."
        )

    # --- RMS energy (dynamics) ---
    rms = librosa.feature.rms(y=y, hop_length=HOP_LENGTH)[0]
    rms_times = librosa.frames_to_time(
        np.arange(len(rms)), sr=sr, hop_length=HOP_LENGTH
    )
    rms_ds, rms_t_ds = _downsample(rms, rms_times, MAX_CURVE_POINTS)

    # --- Onsets (timing events) ---
    try:
        onsets = librosa.onset.onset_detect(
            y=y, sr=sr, hop_length=HOP_LENGTH, units="time"
        )
    except Exception:
        onsets = np.array([])
    if len(onsets) == 0:
        warnings.append("No onsets detected — timing metrics unavailable.")

    # --- Tempo (rough estimate) ---
    tempo_bpm: float | None = None
    if len(onsets) >= 4:
        try:
            tempo = rhythm.tempo(y=y, sr=sr, hop_length=HOP_LENGTH)
            if len(tempo) > 0 and tempo[0] > 0:
                tempo_bpm = float(tempo[0])
        except Exception:
            tempo_bpm = None

    # --- Pitch (f0 with voicing detection) ---
    pitch_curve: list[float | None] = []
    pitch_times_list: list[float] = []
    if duration >= 0.5:
        try:
            f0, voiced_flag, _ = librosa.pyin(
                y,
                fmin=PITCH_FMIN,
                fmax=PITCH_FMAX,
                sr=sr,
                hop_length=HOP_LENGTH,
            )
            f0_times = librosa.frames_to_time(
                np.arange(len(f0)), sr=sr, hop_length=HOP_LENGTH
            )
            f0_clean = np.where(voiced_flag, f0, np.nan)
            f0_ds, f0_t_ds = _downsample(f0_clean, f0_times, MAX_CURVE_POINTS)
            pitch_curve = [None if np.isnan(v) else float(v) for v in f0_ds]
            pitch_times_list = [float(t) for t in f0_t_ds]
            if all(v is None for v in pitch_curve):
                warnings.append("No pitched content detected — pitch metrics unavailable.")
        except Exception:
            warnings.append("Pitch tracking failed — pitch metrics unavailable.")

    # --- Spectral centroid (brightness) ---
    try:
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=HOP_LENGTH)[0]
        centroid_mean = float(np.mean(centroid)) if len(centroid) else None
    except Exception:
        centroid_mean = None

    return FeatureSet(
        duration_sec=duration,
        onsets=[float(t) for t in onsets],
        tempo_bpm=tempo_bpm,
        rms_curve=[float(v) for v in rms_ds],
        rms_times=[float(t) for t in rms_t_ds],
        pitch_curve=pitch_curve,
        pitch_times=pitch_times_list,
        spectral_centroid_mean=centroid_mean,
        clipping_detected=clipping_detected,
        warnings=warnings,
    )
