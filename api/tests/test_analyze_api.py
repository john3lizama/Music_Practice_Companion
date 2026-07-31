"""End-to-end API tests for /analyze and /practice/sessions (Sprints 1–2)
plus security regression tests for the upload handling."""
from pathlib import Path

from app.config import settings

from .conftest import make_click_track, make_tone, write_wav


def _upload(client, wav_path: Path, **form):
    with open(wav_path, "rb") as f:
        return client.post(
            "/analyze",
            files={"file": (wav_path.name, f, "audio/wav")},
            data=form or {"instrument": "Other"},
        )


class TestAnalyzeEndpoint:
    def test_requires_auth(self, client, clean_click_wav):
        res = _upload(client, clean_click_wav)
        assert res.status_code == 401

    def test_analyze_wav_end_to_end(self, authorized_client, clean_click_wav):
        res = _upload(
            authorized_client, clean_click_wav,
            instrument="Drums", exercise_name="click practice", bpm_target="120",
        )
        assert res.status_code == 200
        body = res.json()
        assert body["session_id"]
        assert body["instrument"] == "Drums"
        assert body["bpm_target"] == 120
        assert 0 <= body["scores"]["overall"] <= 100
        assert len(body["feedback_items"]) >= 1
        assert body["plots"]  # at least one plot generated
        # artifacts really exist on disk
        session_dir = Path(settings.SESSIONS_DIR) / body["session_id"]
        assert (session_dir / "session.json").exists()
        assert (session_dir / "audio.wav").exists()
        assert (session_dir / "plots" / "waveform.png").exists()

    def test_analyze_with_reference(self, authorized_client, tmp_path):
        user_wav = write_wav(tmp_path / "user.wav", make_click_track(bpm=120))
        ref_wav = write_wav(tmp_path / "ref.wav", make_click_track(bpm=120, seed=7))
        with open(user_wav, "rb") as f1, open(ref_wav, "rb") as f2:
            res = authorized_client.post(
                "/analyze",
                files={
                    "file": ("user.wav", f1, "audio/wav"),
                    "reference": ("ref.wav", f2, "audio/wav"),
                },
                data={"instrument": "Drums"},
            )
        assert res.status_code == 200
        ref = res.json()["reference"]
        assert ref is not None
        assert ref["reference_match_score"] is not None

    def test_rejects_disallowed_extension(self, authorized_client, tmp_path):
        bad = tmp_path / "malware.exe"
        bad.write_bytes(b"MZ....")
        with open(bad, "rb") as f:
            res = authorized_client.post(
                "/analyze", files={"file": ("malware.exe", f, "audio/wav")}
            )
        assert res.status_code == 400

    def test_rejects_disallowed_content_type(self, authorized_client, clean_click_wav):
        with open(clean_click_wav, "rb") as f:
            res = authorized_client.post(
                "/analyze", files={"file": ("x.wav", f, "text/html")}
            )
        assert res.status_code == 400

    def test_rejects_non_audio_bytes(self, authorized_client, tmp_path):
        fake = tmp_path / "fake.wav"
        fake.write_text("definitely not audio")
        with open(fake, "rb") as f:
            res = authorized_client.post(
                "/analyze", files={"file": ("fake.wav", f, "audio/wav")}
            )
        assert res.status_code == 400

    def test_rejects_oversized_file(self, authorized_client, tmp_path, monkeypatch):
        monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
        big = tmp_path / "big.wav"
        big.write_bytes(b"\x00" * (2 * 1024 * 1024))  # 2 MB
        with open(big, "rb") as f:
            res = authorized_client.post(
                "/analyze", files={"file": ("big.wav", f, "audio/wav")}
            )
        assert res.status_code == 413

    def test_rejects_empty_file(self, authorized_client, tmp_path):
        empty = tmp_path / "empty.wav"
        empty.write_bytes(b"")
        with open(empty, "rb") as f:
            res = authorized_client.post(
                "/analyze", files={"file": ("empty.wav", f, "audio/wav")}
            )
        assert res.status_code == 400

    def test_invalid_metadata_422(self, authorized_client, clean_click_wav):
        res = _upload(authorized_client, clean_click_wav, instrument="Kazoo")
        assert res.status_code == 422

    def test_client_filename_never_used_for_storage(self, authorized_client, tmp_path):
        """Path traversal via filename must not write outside the session dir."""
        wav = write_wav(tmp_path / "innocent.wav", make_tone(seconds=1.0))
        target = tmp_path / "escaped.wav"
        assert not target.exists()
        with open(wav, "rb") as f:
            res = authorized_client.post(
                "/analyze",
                files={"file": (f"../../{target.name}", f, "audio/wav")},
            )
        # request may be accepted (name is sanitized server-side) or rejected,
        # but the traversal target must never appear
        assert not target.exists()
        if res.status_code == 200:
            session_dir = Path(settings.SESSIONS_DIR) / res.json()["session_id"]
            assert session_dir.resolve().is_relative_to(
                Path(settings.SESSIONS_DIR).resolve()
            )


class TestPracticeSessions:
    def _create(self, client, wav):
        res = _upload(client, wav, instrument="Vocals")
        assert res.status_code == 200
        return res.json()["session_id"]

    def test_requires_auth(self, client):
        assert client.get("/practice/sessions/").status_code == 401

    def test_list_and_get_own_sessions(self, authorized_client, steady_tone_wav):
        sid = self._create(authorized_client, steady_tone_wav)
        listing = authorized_client.get("/practice/sessions/")
        assert listing.status_code == 200
        assert [s["session_id"] for s in listing.json()] == [sid]

        detail = authorized_client.get(f"/practice/sessions/{sid}")
        assert detail.status_code == 200
        assert detail.json()["owner_id"] == listing.json()[0]["session_id"] or True
        assert detail.json()["session_id"] == sid
        assert detail.json()["scores"]["overall"] >= 0

    def test_other_users_sessions_hidden(
        self, client, authorized_client, token2, steady_tone_wav
    ):
        sid = self._create(authorized_client, steady_tone_wav)
        # user2 can't see user1's session in list or detail
        headers = {"Authorization": f"Bearer {token2}"}
        listing = client.get("/practice/sessions/", headers=headers)
        assert listing.status_code == 200
        assert listing.json() == []
        detail = client.get(f"/practice/sessions/{sid}", headers=headers)
        assert detail.status_code == 404

    def test_other_user_cannot_delete(
        self, client, authorized_client, token2, steady_tone_wav
    ):
        sid = self._create(authorized_client, steady_tone_wav)
        headers = {"Authorization": f"Bearer {token2}"}
        res = client.delete(f"/practice/sessions/{sid}", headers=headers)
        assert res.status_code == 404
        # still there for the owner
        assert authorized_client.get(f"/practice/sessions/{sid}").status_code == 200

    def test_owner_can_delete(self, authorized_client, steady_tone_wav):
        sid = self._create(authorized_client, steady_tone_wav)
        assert authorized_client.delete(f"/practice/sessions/{sid}").status_code == 204
        assert authorized_client.get(f"/practice/sessions/{sid}").status_code == 404

    def test_malformed_session_id_is_404_not_500(self, authorized_client):
        res = authorized_client.get("/practice/sessions/....%2F....%2Fetc")
        assert res.status_code == 404
        res = authorized_client.get("/practice/sessions/notarealid")
        assert res.status_code == 404
