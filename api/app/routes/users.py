from fastapi import APIRouter, HTTPException, Depends, Response, status
from ..main import Session
from app.models import Users
from ..schemas.schemas import UserBase, UserOut
from .. import models, utils
from typing import List
from app.database.session import get_db


router = APIRouter(prefix="/users", tags=['Users'])

#create new user
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_users(user: UserBase, db : Session = Depends(get_db)):
    hashed_password = utils.hash(user.password)
    user.password = hashed_password
    new_user = models.Users(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

#get all existing users
@router.get("/", response_model= List[UserOut])
async def get_users(db : Session = Depends(get_db)):
    user_lim_15 = db.query(models.Users).limit(15).all()
    return user_lim_15

#get a specific existing user
@router.get("/{id}", response_model=UserOut)
async def create_users(id: int, db : Session = Depends(get_db)):
    user = db.query(models.Users).filter(models.Users.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"User with ID: {id} does not exist")
    return user

#Update information from an existing user
@router.put("/{id}", response_model=UserOut)
async def create_users(User: UserBase, id: int, db : Session = Depends(get_db)):
    user_query = db.query(models.Users).filter(models.Users.id == id)
    user = user_query.first()
    if not user:
        raise HTTPException(status_code=403, detail=f"User with ID: {id} does not exist")
    user_query.update(User.dict(), synchronize_session=False)
    db.commit()
    return user

#Delete an exisiting user
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def create_users(id: int, db : Session = Depends(get_db)):
    user = db.query(models.Users).filter(models.Users.id == id)
    if not user.first():
        raise HTTPException(status_code=404, detail=f"User with ID: {id} does not exist")
    user.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)






################################################################################################################
#endpoints to add later on when code is more alligned with what i really want for the backend


"""

router(prefix="/users")


@router.get("/{@username}")
    #get the user's profile, display posts that are public
    #else display private account


@router.put("/me")
    #options to update the user profile
    #(bio, pfp, name, etc.)


@router.put("/me/privacy")
    #endpoint to allow the user to change their account
    #to public/private


@router.get("/me")
    #only allow if user_id == get_current_user()
    #full private view, getting the user_id and displaying


    

"""