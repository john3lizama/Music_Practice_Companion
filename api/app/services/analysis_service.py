"""Sprint 2 — Analysis pipeline orchestrator.

`run_analysis` is the single entry point the /analyze endpoint calls:

    save audio -> load/normalize -> extract features -> score ->
    feedback -> plots -> compare to reference (optional) -> persist session

Each step is timed and logged.
"""
import logging
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

import soundfile as sf

from ..core import audio_io, compare, features as features_mod, feedback as feedback_mod, plots as plots_mod, scoring
from ..schemas.analysis import AnalyzeMetadata
from ..storage import sessions as storage

logger = logging.getLogger("analysis")


class AnalysisError(Exception):
    """Raised when the pipeline cannot produce a result from the input."""


def _step(name: str, started: float) -> None:
    logger.info("step=%s duration=%.2fs", name, time.perf_counter() - started)


def run_analysis(
    upload_path: Path,
    metadata: AnalyzeMetadata,
    owner_id: int,
    base_dir: Path,
    reference_path: Path | None = None,
    make_plots: bool = True,
) -> dict:
    """Run the full pipeline on a saved upload. Returns the session dict
    (same shape as AnalyzeResponse)."""
    paths = storage.create_session_paths(base_dir)
    logger.info("analysis start session=%s owner=%s", paths.session_id, owner_id)

    try:
        # 1. Load + normalize
        t = time.perf_counter()
        try:
            loaded = audio_io.load_audio(upload_path)
        except audio_io.AudioLoadError as exc:
            raise AnalysisError(str(exc)) from exc
        _step("load_audio", t)

        # 2. Persist the normalized audio as the session artifact
        t = time.perf_counter()
        sf.write(paths.audio_wav, loaded.y, loaded.sr)
        _step("save_audio", t)

        # 3. Features
        t = time.perf_counter()
        feats = features_mod.extract_all(
            loaded.y, loaded.sr, clipping_detected=loaded.clipping_detected
        )
        _step("extract_features", t)

        # 4. Scores
        t = time.perf_counter()
        report = scoring.score_all(feats)
        _step("score", t)

        # 5. Feedback
        t = time.perf_counter()
        fb = feedback_mod.generate(report)
        _step("feedback", t)

        # 6. Plots (optional)
        plot_paths: list[str] = []
        if make_plots:
            t = time.perf_counter()
            try:
                plot_paths = plots_mod.make_plots(loaded.y, loaded.sr, feats, paths.dir)
            except Exception:
                logger.exception("plot generation failed (non-fatal)")
            _step("plots", t)

        # 7. Reference comparison (optional)
        reference_result = None
        if reference_path is not None:
            t = time.perf_counter()
            try:
                ref_loaded = audio_io.load_audio(reference_path)
                ref_feats = features_mod.extract_all(ref_loaded.y, ref_loaded.sr)
                reference_result = compare.compare_to_reference(feats, ref_feats)
            except audio_io.AudioLoadError as exc:
                raise AnalysisError(f"Reference file: {exc}") from exc
            _step("reference_compare", t)

        # 8. Persist session JSON
        session_data = {
            "session_id": paths.session_id,
            "owner_id": owner_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "instrument": metadata.instrument,
            "exercise_name": metadata.exercise_name,
            "bpm_target": metadata.bpm_target,
            "duration_sec": round(loaded.duration_sec, 3),
            "scores": report.to_dict(),
            "feedback_items": fb["feedback_items"],
            "top_3_focus": fb["top_3_focus"],
            "warnings": feats.warnings,
            "plots": plot_paths,
            "reference": reference_result,
            "features": feats.to_dict(),
        }
        t = time.perf_counter()
        storage.save_session(paths, session_data)
        _step("save_session", t)

        logger.info("analysis done session=%s overall=%.1f",
                    paths.session_id, report.overall)
        return session_data

    except Exception:
        # Don't leave half-written session folders behind.
        shutil.rmtree(paths.dir, ignore_errors=True)
        raise
