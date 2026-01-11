from fastapi import APIRouter, HTTPException, Depends, Response, status
from typing import List, Optional
from sqlalchemy import func
from ..main import Session
from ..schemas.schemas import PostCreate, PostBase, PostCreateOut, PostOut, SessionListOut
from .. import models, oauth2
from app.database.session import get_db



router = APIRouter(prefix="/sessions", tags=['Sessions'])

@router.post("/", response_model=PostOut)
async def create_session(post: PostCreate, db : Session = Depends(get_db),
                current_user : int = Depends(oauth2.get_current_user)):
    created_session = models.Sessions(owner_id=current_user.id, **post.dict())
    db.add(created_session)
    db.commit()
    db.refresh(created_session)
    return created_session

#allows query parameters
@router.get("/", response_model= List[SessionListOut])
async def get_all_sessions(db : Session = Depends(get_db), 
        user_id = Depends(oauth2.get_current_user), limit=10, skip=0,
        search: Optional[str]=""):
    # session_lim_15 = db.query(models.Sessions).filter(models.Sessions.title.contains(search)).limit(limit).offset(skip).all()
    results = db.query(models.Sessions, func.count(models.Votes.session_id).label("likes")).join(
        models.Votes, models.Votes.session_id == models.Sessions.id, isouter=True).group_by(
            models.Sessions.id).filter(models.Sessions.title.contains(search)).limit(limit).offset(skip).all() 
    return [{"session": session, "likes": likes} for (session, likes) in results]


@router.get("/{id}", response_model=SessionListOut)
async def get_sessions(id: int, db : Session = Depends(get_db),
            user_id : int = Depends(oauth2.get_current_user)):
    #id_session = db.query(models.Sessions).filter(models.Sessions.id ==id).first()
    result = db.query(models.Sessions, func.count(models.Votes.session_id).label("likes")).join(
        models.Votes, models.Votes.session_id == models.Sessions.id, isouter=True).group_by(
            models.Sessions.id).filter(models.Sessions.id ==id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"post: {id} does not exist")
    session, likes= result
    return {"session": session, "likes": likes}


@router.put("/{id}", response_model=PostCreateOut)
async def update_session(id: int, post: PostCreate, db : Session = Depends(get_db),
                user_id : int = Depends(oauth2.get_current_user)):
    updated_session = db.query(models.Sessions).filter(models.Sessions.id == id)
    updated = updated_session.first()
    if updated == None:
        raise HTTPException(status_code=404, detail=f"post: {id} does not exist")
    #pydantic schema into dictionary
    updated_session.update(post.dict(), synchronize_session=False)
    db.commit()
    return updated_session.first()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(id: int, db : Session = Depends(get_db),
                    current_user :int = Depends(oauth2.get_current_user)):
    deleted_session_query = db.query(models.Sessions).filter(models.Sessions.id == id)
    deleted_session = deleted_session_query.first()

    if deleted_session == None:
        raise HTTPException(status_code=404, detail=f"post: {id} does not exist")
    
    if deleted_session.owner_id != current_user.id :
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Could not perform requested action")

    deleted_session_query.delete(synchronize_session=False)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)



def session_router():
    pass




################################################################################################################
#endpoints to add later on when code is more alligned with what i really want for the backend


"""
#practice companion part of the application
router(prefix="/practice/sessions/")


@router.get("/")
    #get list of current user's sessions

@router.post("/")
    #user makes a new post

@router.get("/{session_id}")
    # returns the user's specified session that provides
    # feedback and analysis for them to improve
    # (they may click on the link)


"""
