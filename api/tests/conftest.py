from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.database.session import get_db
from app import models
from app.oauth2 import create_access_token



SQLALCHEMY_DATABASE_URL = f'postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}_test'

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

#using app into our test client,
# calling client when we want to get a ceratin endpoint

#alllows us to have a sessions obj
@pytest.fixture
def session():
    models.Base.metadata.drop_all(bind=engine) #when testing fails, we can
    models.Base.metadata.create_all(bind=engine)#see the current state of our db
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


#alllows us to have a client obj
@pytest.fixture
def client(session):
    #run before we run our test
    def override_get_db():
        try:
            yield session
        finally:
            session.close()
    app.dependency_overrides[get_db] = override_get_db

    #run our tests
    yield TestClient(app)

    #run our code after our test finishes 
    

#creating a testable user to test other endpoints


@pytest.fixture
def test_user2(client):
    user_data = {"email":"dummy123@gmail.com", "password" : "password"}
    res = client.post("/users/", json=user_data)
    assert res.status_code == 201
    new_user = res.json()
    new_user['password'] = user_data['password']
    return new_user


@pytest.fixture
def test_user(client):
    user_data = {"email":"dummy@gmail.com", "password" : "password"}
    res = client.post("/users/", json=user_data)
    assert res.status_code == 201
    new_user = res.json()
    new_user['password'] = user_data['password']
    return new_user


@pytest.fixture
def token(test_user):
    return create_access_token({"user_id": test_user["id"]})

@pytest.fixture
def authorized_client(client, token):
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {token}"
    }

    return client



@pytest.fixture
def test_posts(test_user, session, test_user2):
    post_data = [
        {"title" : "firstTitle",
        "content" : "firstContent",
        "owner_id" : test_user['id']
        },
        {"title" : "2nd Title",
        "content" : "2nd Content",
        "owner_id" : test_user['id']
        },
        {"title" : "3rd Title",
        "content" : "3rd Content",
        "owner_id" : test_user['id']
        },
        {"title" : "4th Title",
        "content" : "4th Content",
        "owner_id" : test_user2['id']
        }
    ]

    def create_session_model(post):
        return models.Sessions(**post)
    
    post_map = map(create_session_model, post_data)
    posts = list(post_map)

    session.add_all(posts)
    session.commit()
    posts = session.query(models.Sessions).all()
    return posts