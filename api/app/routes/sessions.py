from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db

from .. import models, oauth2
from ..schemas.schemas import PostCreate, PostCreateOut, PostOut, SessionListOut

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    post: PostCreate,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    created_session = models.Sessions(owner_id=current_user.id, **post.dict())
    db.add(created_session)
    db.commit()
    db.refresh(created_session)
    return created_session


@router.get("/", response_model=List[SessionListOut])
async def get_all_sessions(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
    limit: int = Query(10, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search: Optional[str] = "",
):
    results = (
        db.query(models.Sessions, func.count(models.Votes.session_id).label("likes"))
        .join(models.Votes, models.Votes.session_id == models.Sessions.id, isouter=True)
        .group_by(models.Sessions.id)
        .filter(models.Sessions.title.contains(search))
        .limit(limit)
        .offset(skip)
        .all()
    )
    return [{"session": session, "likes": likes} for (session, likes) in results]


@router.get("/{id}", response_model=SessionListOut)
async def get_session(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    result = (
        db.query(models.Sessions, func.count(models.Votes.session_id).label("likes"))
        .join(models.Votes, models.Votes.session_id == models.Sessions.id, isouter=True)
        .group_by(models.Sessions.id)
        .filter(models.Sessions.id == id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"post: {id} does not exist")
    session, likes = result
    return {"session": session, "likes": likes}


@router.put("/{id}", response_model=PostCreateOut)
async def update_session(
    id: int,
    post: PostCreate,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    session_query = db.query(models.Sessions).filter(models.Sessions.id == id)
    existing = session_query.first()
    if existing is None:
        raise HTTPException(status_code=404, detail=f"post: {id} does not exist")

    # Ownership check — only the owner may edit their session.
    if existing.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not perform requested action",
        )

    session_query.update(post.dict(), synchronize_session=False)
    db.commit()
    return session_query.first()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(oauth2.get_current_user),
):
    session_query = db.query(models.Sessions).filter(models.Sessions.id == id)
    existing = session_query.first()
    if existing is None:
        raise HTTPException(status_code=404, detail=f"post: {id} does not exist")

    if existing.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not perform requested action",
        )

    session_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
