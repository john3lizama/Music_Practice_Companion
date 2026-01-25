from .database import session, client
from app.schemas.schemas import UserBase, UserOut

#allows us to have client obj
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




'''
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_users(user: UserBase, db : Session = Depends(get_db)):
    hashed_password = utils.hash(user.password)
    user.password = hashed_password
    new_user = models.Users(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
'''