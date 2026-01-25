from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.database.session import get_db
from app import models



SQLALCHEMY_DATABASE_URL = f'postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}_test'

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

#using app into our test client,
# calling client when we want to get a ceratin endpoint
client = TestClient(app)

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
    



