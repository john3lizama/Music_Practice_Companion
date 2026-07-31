"""Unit tests for the analysis core: audio_io, features, scoring, feedback,
storage, and reference comparison (Sprints 3–9)."""
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

from app.core import audio_io, compare, feedback, features, scoring
from app.storage import sessions as storage

from .conftest import SR, make_click_track, make_tone, write_wav


# ---------------------------------------------------------------------------
# Sprint 3 — audio_io
# ---------------------------------------------------------------------------

class TestAudioIO:
    def test_stereo_to_mono(self, tmp_path):
        stereo = np.stack([make_tone(seconds=1.0), make_tone(seconds=1.0)], axis=1)
        path = tmp_path / "stereo.wav"
        sf.write(path, stereo, SR)
        loaded = audio_io.load_audio(path)
        assert loaded.y.ndim == 1

    def test_resampling_to_target_sr(self, tmp_path):
        y = 0.5 * np.sin(2 * np.pi * 440 * np.arange(44100) / 44100).astype(np.float32)
        path = tmp_path / "hi_sr.wav"
        sf.write(path, y, 44100)  # 1 second at 44.1 kHz
        loaded = audio_io.load_audio(path)
        assert loaded.sr == audio_io.TARGET_SR
        assert loaded.duration_sec == pytest.approx(1.0, abs=0.1)

    def test_silence_trimming(self, tmp_path):
        tone = make_tone(seconds=1.0)
        silence = np.zeros(SR, dtype=np.float32)  # 1s of silence each side
        padded = np.concatenate([silence, tone, silence])
        path = write_wav(tmp_path / "padded.wav", padded)
        loaded = audio_io.load_audio(path)
        # ~1s of content should remain out of 3s total
        assert loaded.duration_sec < 1.5

    def test_normalization_peak_is_one(self, tmp_path):
        quiet = 0.05 * make_tone(seconds=1.0)
        path = write_wav(tmp_path / "quiet.wav", quiet)
        loaded = audio_io.load_audio(path)
        assert float(np.max(np.abs(loaded.y))) == pytest.approx(1.0, abs=0.01)

    def test_clipping_detection(self, tmp_path):
        clipped = np.clip(3.0 * make_tone(seconds=1.0), -1.0, 1.0)
        path = write_wav(tmp_path / "clipped.wav", clipped)
        assert audio_io.load_audio(path).clipping_detected is True
        clean = write_wav(tmp_path / "clean.wav", 0.7 * make_tone(seconds=1.0))
        assert audio_io.load_audio(clean).clipping_detected is False

    def test_deterministic_load(self, clean_click_wav):
        a = audio_io.load_audio(clean_click_wav)
        b = audio_io.load_audio(clean_click_wav)
        assert np.array_equal(a.y, b.y)

    def test_invalid_file_raises(self, tmp_path):
        bad = tmp_path / "not_audio.wav"
        bad.write_text("this is not audio data")
        with pytest.raises(audio_io.AudioLoadError):
            audio_io.load_audio(bad)


# ---------------------------------------------------------------------------
# Sprint 4 — features
# ---------------------------------------------------------------------------

class TestFeatures:
    def test_click_track_features(self, clean_click_wav):
        loaded = audio_io.load_audio(clean_click_wav)
        feats = features.extract_all(loaded.y, loaded.sr)
        # 120 BPM for ~5s => roughly 9-10 onsets
        assert len(feats.onsets) >= 6
        assert feats.tempo_bpm is not None
        assert 100 <= feats.tempo_bpm <= 140 or 220 <= feats.tempo_bpm <= 260
        assert len(feats.rms_curve) == len(feats.rms_times)
        assert feats.duration_sec > 3.0

    def test_tone_has_pitch(self, steady_tone_wav):
        loaded = audio_io.load_audio(steady_tone_wav)
        feats = features.extract_all(loaded.y, loaded.sr)
        voiced = [v for v in feats.pitch_curve if v]
        assert len(voiced) >= 10
        assert np.median(voiced) == pytest.approx(220.0, rel=0.05)

    def test_silence_never_crashes(self):
        y = np.zeros(SR, dtype=np.float32)
        feats = features.extract_all(y, SR)
        assert feats.onsets == []
        assert any("onset" in w.lower() for w in feats.warnings)

    def test_short_audio_warns(self):
        y = make_tone(seconds=0.4)
        feats = features.extract_all(y, SR)
        assert any("short" in w.lower() for w in feats.warnings)

    def test_to_dict_is_json_safe(self, clean_click_wav):
        import json

        loaded = audio_io.load_audio(clean_click_wav)
        feats = features.extract_all(loaded.y, loaded.sr)
        json.dumps(feats.to_dict())  # must not raise


# ---------------------------------------------------------------------------
# Sprint 5 — scoring
# ---------------------------------------------------------------------------

class TestScoring:
    def _score(self, wav_path):
        loaded = audio_io.load_audio(wav_path)
        feats = features.extract_all(
            loaded.y, loaded.sr, clipping_detected=loaded.clipping_detected
        )
        return scoring.score_all(feats)

    def test_scores_within_range(self, clean_click_wav):
        report = self._score(clean_click_wav)
        for score in [
            report.timing_consistency,
            report.tempo_stability,
            report.pitch_stability,
            report.dynamics_control,
            report.overall,
        ]:
            if score is not None:
                assert 0.0 <= score <= 100.0

    def test_clean_beats_sloppy_timing(self, clean_click_wav, sloppy_click_wav):
        clean = self._score(clean_click_wav)
        sloppy = self._score(sloppy_click_wav)
        assert clean.timing_consistency is not None
        assert sloppy.timing_consistency is not None
        assert clean.timing_consistency > sloppy.timing_consistency
        assert clean.timing_consistency >= 85.0

    def test_steady_beats_wobbly_pitch(self, tmp_path):
        steady = write_wav(tmp_path / "steady.wav", make_tone(wobble_cents=0.0))
        wobbly = write_wav(tmp_path / "wobbly.wav", make_tone(wobble_cents=40.0))
        s = self._score(steady)
        w = self._score(wobbly)
        assert s.pitch_stability is not None and w.pitch_stability is not None
        assert s.pitch_stability > w.pitch_stability

    def test_deterministic_scores(self, clean_click_wav):
        a = self._score(clean_click_wav)
        b = self._score(clean_click_wav)
        assert a.to_dict() == b.to_dict()

    def test_variability_mapping_monotonic_and_bounded(self):
        f = scoring._variability_to_score
        assert f(0.0, good=0.1, bad=1.0) == 100.0
        assert f(2.0, good=0.1, bad=1.0) == 0.0
        assert f(0.3, good=0.1, bad=1.0) > f(0.6, good=0.1, bad=1.0)

    def test_empty_features_flagged(self):
        feats = features.FeatureSet(
            duration_sec=0.2, onsets=[], tempo_bpm=None, rms_curve=[],
            rms_times=[], pitch_curve=[], pitch_times=[],
            spectral_centroid_mean=None, clipping_detected=False,
        )
        report = scoring.score_all(feats)
        assert "no_scorable_content" in report.flags
        assert "too_short" in report.flags
        assert report.overall == 0.0


# ---------------------------------------------------------------------------
# Sprint 6 — feedback
# ---------------------------------------------------------------------------

class TestFeedback:
    def test_always_at_least_one_item(self):
        report = scoring.ScoreReport(
            timing_consistency=95.0, tempo_stability=95.0,
            pitch_stability=95.0, dynamics_control=95.0, overall=95.0,
        )
        out = feedback.generate(report)
        assert len(out["feedback_items"]) >= 1

    def test_weak_category_gets_drill(self):
        report = scoring.ScoreReport(
            timing_consistency=40.0, tempo_stability=90.0,
            pitch_stability=90.0, dynamics_control=90.0, overall=77.0,
        )
        out = feedback.generate(report)
        timing_items = [i for i in out["feedback_items"] if i["category"] == "timing"]
        assert timing_items and timing_items[0]["severity"] == "high"
        assert timing_items[0]["drill"]
        assert out["top_3_focus"][0] == "timing"

    def test_praise_for_strong_category(self):
        report = scoring.ScoreReport(
            timing_consistency=95.0, tempo_stability=60.0,
            pitch_stability=60.0, dynamics_control=60.0, overall=70.0,
        )
        out = feedback.generate(report)
        assert any(i["severity"] == "praise" for i in out["feedback_items"])

    def test_clipping_flag_produces_recording_advice(self):
        report = scoring.ScoreReport(
            timing_consistency=90.0, tempo_stability=90.0,
            pitch_stability=90.0, dynamics_control=70.0, overall=85.0,
            flags=["clipping_detected"],
        )
        out = feedback.generate(report)
        assert any(i["category"] == "recording" for i in out["feedback_items"])

    def test_top3_sorted_by_weakness(self):
        report = scoring.ScoreReport(
            timing_consistency=60.0, tempo_stability=40.0,
            pitch_stability=50.0, dynamics_control=95.0, overall=60.0,
        )
        out = feedback.generate(report)
        assert out["top_3_focus"] == ["tempo", "pitch", "timing"]


# ---------------------------------------------------------------------------
# Sprint 7 — storage
# ---------------------------------------------------------------------------

class TestStorage:
    def test_save_load_roundtrip(self, tmp_path):
        paths = storage.create_session_paths(tmp_path)
        storage.save_session(paths, {"session_id": paths.session_id, "owner_id": 1})
        loaded = storage.load_session(tmp_path, paths.session_id)
        assert loaded["owner_id"] == 1

    def test_list_sessions_most_recent_first_and_owner_filtered(self, tmp_path):
        ids = []
        for owner in [1, 1, 2]:
            paths = storage.create_session_paths(tmp_path)
            storage.save_session(paths, {"session_id": paths.session_id, "owner_id": owner})
            ids.append(paths.session_id)
        mine = storage.list_sessions(tmp_path, owner_id=1)
        assert len(mine) == 2
        all_sessions = storage.list_sessions(tmp_path)
        assert [s["session_id"] for s in all_sessions] == sorted(ids, reverse=True)

    def test_delete_session_removes_folder(self, tmp_path):
        paths = storage.create_session_paths(tmp_path)
        storage.save_session(paths, {"session_id": paths.session_id, "owner_id": 1})
        assert storage.delete_session(tmp_path, paths.session_id) is True
        assert storage.load_session(tmp_path, paths.session_id) is None
        assert not paths.dir.exists()

    @pytest.mark.parametrize(
        "bad_id",
        ["../../etc/passwd", "..", "notasession", "20260101T000000_XYZ!", ""],
    )
    def test_path_traversal_ids_rejected(self, tmp_path, bad_id):
        with pytest.raises(storage.InvalidSessionId):
            storage.load_session(tmp_path, bad_id)

    def test_ids_are_sortable_and_unique(self):
        a, b = storage.new_session_id(), storage.new_session_id()
        assert a != b
        assert storage.SESSION_ID_RE.match(a)


# ---------------------------------------------------------------------------
# Sprint 9 — reference comparison
# ---------------------------------------------------------------------------

class TestReferenceComparison:
    def _feats(self, y):
        return features.extract_all(y, SR)

    def test_identical_recordings_match_high(self):
        y = make_click_track(jitter=0.0)
        result = compare.compare_to_reference(self._feats(y), self._feats(y))
        assert result["reference_match_score"] is not None
        assert result["reference_match_score"] >= 90.0

    def test_different_tempo_flagged(self):
        user = self._feats(make_click_track(bpm=100))
        ref = self._feats(make_click_track(bpm=120))
        result = compare.compare_to_reference(user, ref)
        assert result["reference_match_score"] is not None
        assert any("tempo" in h.lower() for h in result["mismatch_highlights"])

    def test_insufficient_content_handled(self):
        silent = self._feats(np.zeros(SR, dtype=np.float32))
        result = compare.compare_to_reference(silent, silent)
        assert result["reference_match_score"] is None
        assert result["mismatch_highlights"]
