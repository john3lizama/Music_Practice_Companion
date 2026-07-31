from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.session import get_db

from .. import models, oauth2, utils
from ..schemas.schemas import UserBase, UserOut

router = APIRouter(prefix="/users", tags=["Users"])


# Registration — the only unauthenticated endpoint here.
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserBase, db: Session = Depends(get_db)):
    hashed_password = utils.hash(user.password)
    user.password = hashed_password
    new_user = models.Users(**user.dict())
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Generic message: don't confirm which emails are registered.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create account"
        )
    db.refresh(new_user)
    return new_user


@router.get("/", response_model=List[UserOut])
async def get_users(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    return db.query(models.Users).limit(15).all()


@router.get("/{id}", response_model=UserOut)
async def get_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    user = db.query(models.Users).filter(models.Users.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{id}", response_model=UserOut)
async def update_user(
    User: UserBase,
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    # Users may only modify their own account.
    if current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform requested action",
        )
    user_query = db.query(models.Users).filter(models.Users.id == id)
    if not user_query.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = User.dict()
    update_data["password"] = utils.hash(update_data["password"])
    user_query.update(update_data, synchronize_session=False)
    db.commit()
    return user_query.first()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    # Users may only delete their own account.
    if current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform requested action",
        )
    user_query = db.query(models.Users).filter(models.Users.id == id)
    if not user_query.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
