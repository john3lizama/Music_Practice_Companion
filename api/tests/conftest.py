"""Test fixtures.

Uses an in-memory SQLite DB so the suite runs on any machine/CI without a
Postgres instance. Models use func.now() defaults, which render correctly on
both Postgres and SQLite.
"""
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database.session import Base, get_db
from app.main import app
from app.oauth2 import create_access_token
from app.rate_limit import login_limiter

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

SR = 22050


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    from app.routes.password_reset import reset_limiter

    login_limiter.reset()
    reset_limiter.reset()
    yield
    login_limiter.reset()
    reset_limiter.reset()


@pytest.fixture(autouse=True)
def _isolated_sessions_dir(tmp_path, monkeypatch):
    """Point the analysis session store at a per-test temp dir."""
    from app.config import settings

    monkeypatch.setattr(settings, "SESSIONS_DIR", str(tmp_path / "sessions"))
    yield


@pytest.fixture
def session():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(session):
    def override_get_db():
        try:
            yield session
        finally:
            pass  # session lifecycle handled by the session fixture

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(client):
    user_data = {"email": "dummy@gmail.com", "password": "password"}
    res = client.post("/users/", json=user_data)
    assert res.status_code == 201
    new_user = res.json()
    new_user["password"] = user_data["password"]
    return new_user


@pytest.fixture
def test_user2(client):
    user_data = {"email": "dummy123@gmail.com", "password": "password"}
    res = client.post("/users/", json=user_data)
    assert res.status_code == 201
    new_user = res.json()
    new_user["password"] = user_data["password"]
    return new_user


@pytest.fixture
def token(test_user):
    return create_access_token({"user_id": test_user["id"]})


@pytest.fixture
def token2(test_user2):
    return create_access_token({"user_id": test_user2["id"]})


@pytest.fixture
def authorized_client(client, token):
    client.headers = {**client.headers, "Authorization": f"Bearer {token}"}
    return client


@pytest.fixture
def test_posts(test_user, session, test_user2):
    post_data = [
        {"title": "firstTitle", "content": "firstContent", "owner_id": test_user["id"]},
        {"title": "2nd Title", "content": "2nd Content", "owner_id": test_user["id"]},
        {"title": "3rd Title", "content": "3rd Content", "owner_id": test_user["id"]},
        {"title": "4th Title", "content": "4th Content", "owner_id": test_user2["id"]},
    ]
    posts = [models.Sessions(**p) for p in post_data]
    session.add_all(posts)
    session.commit()
    return session.query(models.Sessions).all()


# ---------------------------------------------------------------------------
# Synthetic "golden" audio generators — deterministic (seeded), so scoring
# assertions are stable across runs without committing binary wav files.
# ---------------------------------------------------------------------------

def make_click_track(
    bpm: float = 120.0,
    seconds: float = 5.0,
    jitter: float = 0.0,
    sr: int = SR,
    seed: int = 42,
) -> np.ndarray:
    """Percussive click track. `jitter` is the fractional randomness of each
    beat position (0.0 = metronome-perfect, 0.3 = sloppy)."""
    rng = np.random.default_rng(seed)
    y = np.zeros(int(seconds * sr), dtype=np.float32)
    interval = 60.0 / bpm
    click_len = int(0.03 * sr)
    decay = np.exp(-np.linspace(0.0, 8.0, click_len)).astype(np.float32)
    tone = np.sin(2 * np.pi * 1500.0 * np.arange(click_len) / sr).astype(np.float32)
    t = 0.1
    while t < seconds - 0.1:
        pos = t + (rng.uniform(-jitter, jitter) * interval if jitter > 0 else 0.0)
        idx = int(max(0.0, pos) * sr)
        end = min(idx + click_len, len(y))
        y[idx:end] += (tone * decay)[: end - idx]
        t += interval
    peak = float(np.max(np.abs(y)))
    return 0.9 * y / (peak if peak > 0 else 1.0)


def make_tone(
    freq: float = 220.0,
    seconds: float = 3.0,
    wobble_cents: float = 0.0,
    sr: int = SR,
    seed: int = 42,
) -> np.ndarray:
    """Sustained tone. `wobble_cents` adds a random-walk pitch instability."""
    rng = np.random.default_rng(seed)
    n = int(seconds * sr)
    if wobble_cents > 0:
        steps = rng.normal(0.0, wobble_cents, size=n // 512 + 2)
        walk_coarse = np.cumsum(steps)
        walk_coarse -= np.mean(walk_coarse)
        cents = np.interp(np.arange(n), np.arange(len(walk_coarse)) * 512, walk_coarse)
    else:
        cents = np.zeros(n)
    inst_freq = freq * (2.0 ** (cents / 1200.0))
    phase = 2 * np.pi * np.cumsum(inst_freq) / sr
    y = 0.8 * np.sin(phase).astype(np.float32)
    # gentle fade in/out to avoid clicks
    fade = int(0.02 * sr)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y


def write_wav(path: Path, y: np.ndarray, sr: int = SR) -> Path:
    sf.write(path, y, sr)
    return path


@pytest.fixture
def clean_click_wav(tmp_path):
    return write_wav(tmp_path / "clean_click.wav", make_click_track(jitter=0.0))


@pytest.fixture
def sloppy_click_wav(tmp_path):
    return write_wav(tmp_path / "sloppy_click.wav", make_click_track(jitter=0.30))


@pytest.fixture
def steady_tone_wav(tmp_path):
    return write_wav(tmp_path / "steady_tone.wav", make_tone(wobble_cents=0.0))
