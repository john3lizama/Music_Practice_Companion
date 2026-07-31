"""Password reset flow tests."""
from app.routes.password_reset import create_reset_token
from app import models


def _get_user(session, email):
    return session.query(models.Users).filter(models.Users.email == email).first()


class TestRequest:
    def test_unknown_email_same_response_as_known(self, client, test_user):
        known = client.post("/password-reset/request", json={"email": test_user["email"]})
        unknown = client.post("/password-reset/request", json={"email": "ghost@nowhere.com"})
        assert known.status_code == unknown.status_code == 202
        assert known.json() == unknown.json()  # no account enumeration

    def test_invalid_email_rejected(self, client):
        res = client.post("/password-reset/request", json={"email": "not-an-email"})
        assert res.status_code == 422

    def test_rate_limited(self, client, test_user):
        for _ in range(5):
            client.post("/password-reset/request", json={"email": test_user["email"]})
        res = client.post("/password-reset/request", json={"email": test_user["email"]})
        assert res.status_code == 429


class TestConfirm:
    def test_full_reset_flow(self, client, session, test_user):
        user = _get_user(session, test_user["email"])
        token = create_reset_token(user)

        res = client.post(
            "/password-reset/confirm",
            json={"token": token, "new_password": "brand-new-password"},
        )
        assert res.status_code == 200

        # old password no longer works, new one does
        old = client.post(
            "/login", data={"username": test_user["email"], "password": test_user["password"]}
        )
        assert old.status_code == 401
        new = client.post(
            "/login", data={"username": test_user["email"], "password": "brand-new-password"}
        )
        assert new.status_code == 200

    def test_token_is_single_use(self, client, session, test_user):
        user = _get_user(session, test_user["email"])
        token = create_reset_token(user)
        first = client.post(
            "/password-reset/confirm",
            json={"token": token, "new_password": "brand-new-password"},
        )
        assert first.status_code == 200
        # password hash changed => signing key changed => token dead
        second = client.post(
            "/password-reset/confirm",
            json={"token": token, "new_password": "attacker-password"},
        )
        assert second.status_code == 400

    def test_garbage_token_rejected(self, client, test_user):
        res = client.post(
            "/password-reset/confirm",
            json={"token": "not.a.token", "new_password": "whatever123"},
        )
        assert res.status_code == 400

    def test_expired_token_rejected(self, client, session, test_user, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "RESET_TOKEN_EXPIRE_MINUTES", -5)
        user = _get_user(session, test_user["email"])
        token = create_reset_token(user)
        res = client.post(
            "/password-reset/confirm",
            json={"token": token, "new_password": "whatever123"},
        )
        assert res.status_code == 400

    def test_short_password_rejected(self, client, session, test_user):
        user = _get_user(session, test_user["email"])
        token = create_reset_token(user)
        res = client.post(
            "/password-reset/confirm", json={"token": token, "new_password": "short"}
        )
        assert res.status_code == 422
