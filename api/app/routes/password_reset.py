"""Password reset.

Design: the reset token is a JWT signed with SECRET_KEY *plus the user's
current password hash*. That makes every token single-use with zero DB
state — the moment the password changes, the signing key changes and the
token can never verify again.

Anti-enumeration: /request always returns 202 regardless of whether the
email exists, and it's rate-limited like /login.
"""
import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database.session import get_db

from .. import models, utils
from ..config import settings
from ..email_utils import send_email
from ..rate_limit import RateLimiter

logger = logging.getLogger("password_reset")

router = APIRouter(prefix="/password-reset", tags=["Password reset"])

# 5 reset requests per 10 minutes per IP.
reset_limiter = RateLimiter(max_calls=5, window_seconds=600)


def _limit(request: Request) -> None:
    reset_limiter.check(request.client.host if request.client else "unknown")


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


def _signing_key(user: models.Users) -> str:
    return f"{settings.SECRET_KEY}:{user.password}"


def create_reset_token(user: models.Users) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"user_id": user.id, "purpose": "password_reset", "exp": expire},
        _signing_key(user),
        algorithm=settings.ALGORITHM,
    )


@router.post("/request", status_code=status.HTTP_202_ACCEPTED)
async def request_reset(
    body: ResetRequest,
    db: Session = Depends(get_db),
    _: None = Depends(_limit),
):
    user = db.query(models.Users).filter(models.Users.email == body.email).first()
    if user:
        token = create_reset_token(user)
        link = f"{settings.FRONTEND_URL}/forgot?token={token}"
        send_email(
            to=user.email,
            subject="Reset your MusicVJN password",
            text=(
                "Someone requested a password reset for your MusicVJN account.\n\n"
                f"Reset it here (link expires in {settings.RESET_TOKEN_EXPIRE_MINUTES} "
                f"minutes):\n{link}\n\n"
                "If this wasn't you, you can ignore this email."
            ),
        )
    # Same response whether or not the account exists.
    return {"message": "If that account exists, a reset email is on its way."}


@router.post("/confirm")
async def confirm_reset(body: ResetConfirm, db: Session = Depends(get_db)):
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link"
    )
    # Read the user id without trusting the token yet...
    try:
        unverified = jwt.decode(body.token, options={"verify_signature": False})
    except jwt.InvalidTokenError:
        raise invalid
    user = (
        db.query(models.Users)
        .filter(models.Users.id == unverified.get("user_id"))
        .first()
    )
    if user is None:
        raise invalid
    # ...then verify it against SECRET_KEY + this user's current hash.
    try:
        payload = jwt.decode(body.token, _signing_key(user), algorithms=[settings.ALGORITHM])
    except jwt.InvalidTokenError:
        raise invalid
    if payload.get("purpose") != "password_reset":
        raise invalid

    user.password = utils.hash(body.new_password)
    db.commit()
    logger.info("password reset completed user_id=%s", user.id)
    return {"message": "Password updated. You can sign in now."}
