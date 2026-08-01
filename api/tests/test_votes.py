import pytest

from app import models


@pytest.fixture
def test_vote(test_posts, session, test_user):
    new_vote = models.Votes(session_id=test_posts[3].id, user_id=test_user["id"])
    session.add(new_vote)
    session.commit()


def test_vote_on_other_session_success(authorized_client, test_posts):
    res = authorized_client.post("/votes/", json={"session_id": test_posts[3].id, "dir": 1})
    assert res.status_code == 200


def test_vote_on_self_session_success(authorized_client, test_posts):
    res = authorized_client.post("/votes/", json={"session_id": test_posts[0].id, "dir": 1})
    assert res.status_code == 200


def test_vote_twice_session(authorized_client, test_posts, test_vote):
    res = authorized_client.post("/votes/", json={"session_id": test_posts[3].id, "dir": 1})
    assert res.status_code == 409


def test_vote_delete_success(authorized_client, test_posts, test_vote):
    res = authorized_client.post("/votes/", json={"session_id": test_posts[3].id, "dir": 0})
    assert res.status_code == 200


def test_delete_vote_nonexistent(authorized_client, test_posts):
    res = authorized_client.post("/votes/", json={"session_id": test_posts[0].id, "dir": 0})
    assert res.status_code == 404


def test_vote_on_session_nonexistent(authorized_client, test_posts):
    res = authorized_client.post("/votes/", json={"session_id": 999999, "dir": 1})
    assert res.status_code == 404


def test_unauthorized_user_vote(client, test_posts):
    res = client.post("/votes/", json={"session_id": test_posts[0].id, "dir": 1})
    assert res.status_code == 401


def test_vote_invalid_dir(authorized_client, test_posts):
    res = authorized_client.post("/votes/", json={"session_id": test_posts[0].id, "dir": 5})
    assert res.status_code == 422
