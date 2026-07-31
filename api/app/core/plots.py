"""Sprint 8 — Plots for visual debugging and demos.

Saves PNGs into the session folder: waveform (with onset markers),
RMS energy curve, and pitch curve when available.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless — no display needed on servers
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from .features import FeatureSet  # noqa: E402


def make_plots(y: np.ndarray, sr: int, features: FeatureSet, out_dir: Path) -> list[str]:
    """Render plots into `out_dir/plots/`. Returns relative paths."""
    plots_dir = out_dir / "plots"
    plots_dir.mkdir(parents=True, exist_ok=True)
    saved: list[str] = []

    # 1. Waveform with onset markers
    fig, ax = plt.subplots(figsize=(10, 3))
    t = np.arange(len(y)) / sr
    ax.plot(t, y, linewidth=0.4)
    for onset in features.onsets:
        ax.axvline(onset, color="tab:red", alpha=0.5, linewidth=0.8)
    ax.set(title="Waveform (red = detected onsets)", xlabel="Time (s)", ylabel="Amplitude")
    fig.tight_layout()
    fig.savefig(plots_dir / "waveform.png", dpi=110)
    plt.close(fig)
    saved.append("plots/waveform.png")

    # 2. RMS energy curve
    if features.rms_curve:
        fig, ax = plt.subplots(figsize=(10, 3))
        ax.plot(features.rms_times, features.rms_curve, color="tab:orange")
        ax.set(title="RMS energy (dynamics)", xlabel="Time (s)", ylabel="RMS")
        fig.tight_layout()
        fig.savefig(plots_dir / "rms.png", dpi=110)
        plt.close(fig)
        saved.append("plots/rms.png")

    # 3. Pitch curve
    voiced = [(t_, v) for t_, v in zip(features.pitch_times, features.pitch_curve) if v]
    if voiced:
        fig, ax = plt.subplots(figsize=(10, 3))
        ax.scatter([t_ for t_, _ in voiced], [v for _, v in voiced], s=3, color="tab:green")
        ax.set(title="Pitch curve (f0)", xlabel="Time (s)", ylabel="Hz")
        ax.set_yscale("log")
        fig.tight_layout()
        fig.savefig(plots_dir / "pitch.png", dpi=110)
        plt.close(fig)
        saved.append("plots/pitch.png")

    return saved
