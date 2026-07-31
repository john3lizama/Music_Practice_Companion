"""Security regression tests — each of these covers a vulnerability that
existed in the codebase (see SECURITY_AND_IMPROVEMENTS.md)."""
import jwt as pyjwt

from app.config import settings
from app.oauth2 import create_access_token


class TestUsersAuthz:
    """S2: /users endpoints used to have no authentication at all."""

    def test_list_users_requires_auth(self, client, test_user):
        assert client.get("/users/").status_code == 401

    def test_get_user_requires_auth(self, client, test_user):
        assert client.get(f"/users/{test_user['id']}").status_code == 401

    def test_update_other_user_forbidden(self, authorized_client, test_user, test_user2):
        res = authorized_client.put(
            f"/users/{test_user2['id']}",
            json={"email": "hacked@evil.com", "password": "owned"},
        )
        assert res.status_code == 403

    def test_delete_other_user_forbidden(self, authorized_client, test_user, test_user2):
        res = authorized_client.delete(f"/users/{test_user2['id']}")
        assert res.status_code == 403

    def test_unauthenticated_update_rejected(self, client, test_user):
        res = client.put(
            f"/users/{test_user['id']}",
            json={"email": "hacked@evil.com", "password": "owned"},
        )
        assert res.status_code == 401


class TestTokens:
    """S6: tokens for deleted users must stop working immediately."""

    def test_deleted_user_token_rejected(self, authorized_client, test_user):
        assert authorized_client.delete(f"/users/{test_user['id']}").status_code == 204
        # same token, user gone
        assert authorized_client.get("/me").status_code == 401

    def test_token_signed_with_wrong_key_rejected(self, client, test_user):
        forged = pyjwt.encode(
            {"user_id": test_user["id"]}, "attacker-key", algorithm="HS256"
        )
        res = client.get("/me", headers={"Authorization": f"Bearer {forged}"})
        assert res.status_code == 401

    def test_alg_none_token_rejected(self, client, test_user):
        forged = pyjwt.encode(
            {"user_id": test_user["id"]}, key=None, algorithm="none"
        )
        res = client.get("/me", headers={"Authorization": f"Bearer {forged}"})
        assert res.status_code == 401

    def test_expired_token_rejected(self, client, test_user, monkeypatch):
        import app.oauth2 as oauth2_mod

        monkeypatch.setattr(oauth2_mod, "ACCESS_TOKEN_EXPIRE_MINUTES", -5)
        expired = create_access_token({"user_id": test_user["id"]})
        res = client.get("/me", headers={"Authorization": f"Bearer {expired}"})
        assert res.status_code == 401


class TestLoginHardening:
    """S7: brute-force protection + no user enumeration."""

    def test_rate_limit_kicks_in(self, client, test_user):
        for _ in range(10):
            client.post(
                "/login",
                data={"username": test_user["email"], "password": "wrong"},
            )
        res = client.post(
            "/login", data={"username": test_user["email"], "password": "wrong"}
        )
        assert res.status_code == 429

    def test_same_error_for_unknown_email_and_bad_password(self, client, test_user):
        unknown = client.post(
            "/login", data={"username": "ghost@nowhere.com", "password": "x"}
        )
        wrong_pw = client.post(
            "/login", data={"username": test_user["email"], "password": "x"}
        )
        assert unknown.status_code == wrong_pw.status_code == 401
        assert unknown.json() == wrong_pw.json()


class TestCORS:
    """S5: wildcard origin must be gone."""

    def test_unlisted_origin_not_allowed(self, client):
        res = client.options(
            "/login",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert res.headers.get("access-control-allow-origin") != "https://evil.example.com"
        assert res.headers.get("access-control-allow-origin") != "*"

    def test_configured_origin_allowed(self, client):
        origin = settings.cors_origins_list[0]
        res = client.options(
            "/login",
            headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
        )
        assert res.headers.get("access-control-allow-origin") == origin
