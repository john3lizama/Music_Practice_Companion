import jwt
import pytest

from app.config import settings
from app.schemas.schemas import Token, UserOut


def test_root(client):
    res = client.get("/")
    assert res.status_code == 200


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_create_user(client):
    res = client.post("/users/", json={"email": "example@gmail.com", "password": "password"})
    new_user = UserOut(**res.json())
    assert new_user.email == "example@gmail.com"
    assert res.status_code == 201
    # password (even hashed) must never be in the response
    assert "password" not in res.json()


def test_create_user_duplicate_email(client, test_user):
    res = client.post("/users/", json={"email": test_user["email"], "password": "other"})
    assert res.status_code == 400


def test_user_login(client, test_user):
    res = client.post(
        "/login", data={"username": test_user["email"], "password": test_user["password"]}
    )
    login_res = Token(**res.json())
    payload = jwt.decode(login_res.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload.get("user_id") == test_user["id"]
    assert login_res.token_type == "Bearer"
    assert res.status_code == 200


@pytest.mark.parametrize(
    "email, password, status_code",
    [
        ("example@gmail.com", "WRONGpassword", 401),
        ("WrongEmail@gmail.com", "password", 401),
        ("Wrong@gmail.com", "WRONGpassword", 401),
    ],
)
def test_invalid_credentials(client, test_user, email, password, status_code):
    res = client.post("/login", data={"username": email, "password": password})
    assert res.status_code == status_code


def test_login_missing_fields(client):
    res = client.post("/login", data={"username": "example@gmail.com"})
    assert res.status_code == 422


def test_me_returns_own_account(authorized_client, test_user):
    res = authorized_client.get("/me")
    assert res.status_code == 200
    assert res.json()["id"] == test_user["id"]
    assert res.json()["email"] == test_user["email"]


def test_update_own_user(authorized_client, test_user):
    res = authorized_client.put(
        f"/users/{test_user['id']}",
        json={"email": "newmail@gmail.com", "password": "newpassword"},
    )
    assert res.status_code == 200
    assert res.json()["email"] == "newmail@gmail.com"


def test_updated_password_is_hashed_and_works(authorized_client, client, test_user):
    authorized_client.put(
        f"/users/{test_user['id']}",
        json={"email": test_user["email"], "password": "newpassword"},
    )
    res = client.post(
        "/login", data={"username": test_user["email"], "password": "newpassword"}
    )
    assert res.status_code == 200


def test_delete_own_user(authorized_client, test_user):
    res = authorized_client.delete(f"/users/{test_user['id']}")
    assert res.status_code == 204
