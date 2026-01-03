from fastapi import APIRouter, HTTPException, Depends, Response, status
from sqlalchemy.orm import Session
from ..schemas.schemas import Vote
from .. import models, oauth2
from app.database.session import get_db

router = APIRouter(prefix="/votes", tags=['Votes/Likes'])

@router.post("/") #passing in our schema, db, and getting the current user
async def post_vote(vote: Vote, db: Session = Depends(get_db),
                    current_user = Depends(oauth2.get_current_user)):
    #when a user likes a serssion post update our table.

    #get posts, see if it exists
    found_session = db.query(models.Sessions).filter(models.Sessions.id == vote.session_id).first()
    if not found_session:
        raise HTTPException(status_code=404, detail=f"Could not find post of {vote.session_id}")
    
    #check if it is already liked 
    vote_query = db.query(models.Votes).filter(models.Votes.session_id == vote.session_id, 
                                                models.Votes.user_id == current_user.id)
    found_vote = vote_query.first()
    if (vote.dir == 1):
        if found_vote:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, 
                detail=f"User {current_user.id} already voted on post with id of {vote.session_id}.")
        
        new_vote = models.Votes(session_id = vote.session_id, user_id = current_user.id)
        db.add(new_vote)
        db.commit()
        return {"message" : "successfully added vote"}
    else: #vote.dir ==0
        if not found_vote:
            raise HTTPException(status_code=404, detail=f"Vote does not exist")
        vote_query.delete(synchronize_session=False)
        db.commit()
    return {"message" : "successfully deleted vote"}