import pytest
from jose import jwt
from app.schemas.schemas import UserBase, UserOut, Token
from app.config import settings

def test_root(client):
    res = client.get("/")
    print(res.json().get('message'))
    assert res.status_code == 200

def test_create_user(client):
    res = client.post(
        "/users/", json={"email":"example@gmail.com", "password" : "password"})
    print(res.json())
    new_user = UserOut(**res.json()) #schema test
    assert new_user.email == "example@gmail.com"
    assert res.status_code == 201

def test_user_login(client, test_user):
    res = client.post(
        "/login/", data={"username":test_user['email'], "password" : test_user['password']})
    print(res.json())
    login_res = Token(**res.json())
    payload = jwt.decode(login_res.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    id: str = payload.get("user_id")
    assert id == test_user['id']
    assert login_res.token_type == 'Bearer'
    assert res.status_code == 200

@pytest.mark.parametrize("email, password, status_code", [
    ("example@gmail.com", "WRONGpassword", 403),
    ("WrongEmail@gmail.com", "password", 403),
    ("Wrong@gmail.com", "WRONGpassword", 403),
    (None, "WRONGpassword", 422),
    ("example@gmail.com", None, 422)
])
def test_invalid_creditials(client, email, password, status_code):
    res = client.post(
        "/login", data={"username":email, "password" : password})
    print(res.json())
    assert res.status_code == status_code

'''
@router.post("/login", response_model=Token)
async def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Users).filter(models.Users.email == user_credentials.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Invalid Credentials")
    
    if not utils.verify(user_credentials.password, user.password):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Invalid Credentials")
    
    access_token = oauth2.create_access_token(payload_data={"user_id" : user.id}) #payload i want to add is only the id
    return {"token": access_token, "token_type" : "Bearer"}
'''