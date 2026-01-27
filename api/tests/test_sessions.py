import pytest
from app.schemas.schemas import SessionListOut, PostOut

def test_get_all_sessions(authorized_client, test_posts):
    res = authorized_client.get("/sessions/")
    def validate(post):
        return SessionListOut(**post)
    post_map = map(validate, res.json())
    post_list = list(post_map)
    post_list_sorted = sorted(post_list, key=lambda p: p.session.id)
    test_posts_sorted = sorted(test_posts, key=lambda p: p.id)
    assert len(res.json()) == len(test_posts)
    assert res.status_code == 200
    assert [p.session.id for p in post_list_sorted] == [p.id for p in test_posts_sorted]


def test_get_one_session_not_exist(authorized_client, test_posts):
    res = authorized_client.get(f"/sessions/6767767")
    assert res.status_code == 404

def test_unauthorized_user_get_all_sessions(client, test_posts):
    res = client.get("/sessions/")
    assert res.status_code == 401

def test_unautherized_user_get_one_sessions(client, test_posts):
    res = client.get(f"/sessions/{test_posts[0].id}")
    assert res.status_code == 401

def test_get_one_session(authorized_client, test_posts):
    res = authorized_client.get(f"/sessions/{test_posts[0].id}")
    post = SessionListOut(**res.json())
    assert post.session.id == test_posts[0].id
    assert res.status_code == 200

@pytest.mark.parametrize("title, content, status_code", [
    ("testTite", "testContent", 201),
    ("secondTitle", "2ndContent", 201),
    ("3rdtitle", "3rdContent", 201),
    ("lasttest", "lasttet", 201)
])
def test_create_new_session(
    authorized_client, test_user, test_posts, title, content, status_code):
    res = authorized_client.post("/sessions/", 
                json={"title" : title, "content" : content})
    created_session = PostOut(**res.json())
    
    assert res.status_code == 200
    assert created_session.title == title
    assert created_session.owner_id == test_user['id']


def test_unauthorized_create_session():
    return

def test_unauthorized_delete_session():
    return

def test_authorized_delete_session_success():
    return

def test_delete_session_not_exist():
    return

def test_unauthorized_update_session():
    return

def test_update_other_user_post():
    return

def test_authorized_update_session_success():
    return

def test_update_session_nonexistent():
    return

def test_delete_other_user_post(authorized_client, test_posts, test_user):
    res = authorized_client.delete(f"/sessions/{test_posts[3].id}")
    assert res.status_code == 403

