import pytest

from app.schemas.schemas import PostOut, SessionListOut


def test_get_all_sessions(authorized_client, test_posts):
    res = authorized_client.get("/sessions/")
    posts = [SessionListOut(**p) for p in res.json()]
    assert res.status_code == 200
    assert len(posts) == len(test_posts)
    assert sorted(p.session.id for p in posts) == sorted(p.id for p in test_posts)


def test_get_one_session_not_exist(authorized_client, test_posts):
    res = authorized_client.get("/sessions/6767767")
    assert res.status_code == 404


def test_unauthorized_user_get_all_sessions(client, test_posts):
    res = client.get("/sessions/")
    assert res.status_code == 401


def test_unauthorized_user_get_one_session(client, test_posts):
    res = client.get(f"/sessions/{test_posts[0].id}")
    assert res.status_code == 401


def test_get_one_session(authorized_client, test_posts):
    res = authorized_client.get(f"/sessions/{test_posts[0].id}")
    post = SessionListOut(**res.json())
    assert post.session.id == test_posts[0].id
    assert res.status_code == 200


def test_pagination_limit_validated(authorized_client, test_posts):
    assert authorized_client.get("/sessions/?limit=2").status_code == 200
    assert len(authorized_client.get("/sessions/?limit=2").json()) == 2
    # invalid values are rejected instead of crashing with a 500
    assert authorized_client.get("/sessions/?limit=abc").status_code == 422
    assert authorized_client.get("/sessions/?limit=0").status_code == 422
    assert authorized_client.get("/sessions/?limit=101").status_code == 422


@pytest.mark.parametrize(
    "title, content, status_code",
    [
        ("testTitle", "testContent", 201),
        ("secondTitle", "2ndContent", 201),
        ("3rdtitle", "3rdContent", 201),
        ("lasttest", "lasttest", 201),
    ],
)
def test_create_new_session(authorized_client, test_user, test_posts, title, content, status_code):
    res = authorized_client.post("/sessions/", json={"title": title, "content": content})
    created_session = PostOut(**res.json())
    assert res.status_code == status_code
    assert created_session.title == title
    assert created_session.owner_id == test_user["id"]


def test_unauthorized_create_session(client, test_posts):
    res = client.post("/sessions/", json={"title": "t", "content": "c"})
    assert res.status_code == 401


def test_unauthorized_delete_session(client, test_posts):
    res = client.delete(f"/sessions/{test_posts[0].id}")
    assert res.status_code == 401


def test_authorized_delete_session_success(authorized_client, test_posts):
    post_id = test_posts[0].id  # capture before delete detaches the ORM instance
    res = authorized_client.delete(f"/sessions/{post_id}")
    assert res.status_code == 204
    assert authorized_client.get(f"/sessions/{post_id}").status_code == 404


def test_delete_session_not_exist(authorized_client, test_posts):
    res = authorized_client.delete("/sessions/999999")
    assert res.status_code == 404


def test_delete_other_user_post(authorized_client, test_posts, test_user):
    # test_posts[3] belongs to test_user2
    res = authorized_client.delete(f"/sessions/{test_posts[3].id}")
    assert res.status_code == 403


def test_unauthorized_update_session(client, test_posts):
    res = client.put(
        f"/sessions/{test_posts[0].id}", json={"title": "x", "content": "y"}
    )
    assert res.status_code == 401


def test_update_other_user_post(authorized_client, test_posts):
    """Regression test for the missing ownership check on PUT."""
    res = authorized_client.put(
        f"/sessions/{test_posts[3].id}",
        json={"title": "hijacked", "content": "hijacked"},
    )
    assert res.status_code == 403
    # confirm nothing changed
    check = authorized_client.get(f"/sessions/{test_posts[3].id}")
    assert check.json()["session"]["title"] == "4th Title"


def test_authorized_update_session_success(authorized_client, test_posts):
    res = authorized_client.put(
        f"/sessions/{test_posts[0].id}",
        json={"title": "updated", "content": "updated content"},
    )
    assert res.status_code == 200
    assert res.json()["title"] == "updated"


def test_update_session_nonexistent(authorized_client, test_posts):
    res = authorized_client.put("/sessions/999999", json={"title": "x", "content": "y"})
    assert res.status_code == 404
