"""Password hashing.

Argon2 is the primary scheme; pbkdf2_sha256 stays listed (deprecated) so any
hash created before the switch still verifies and is transparently upgraded
on next login via `needs_update`.
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2", "pbkdf2_sha256"], deprecated="auto")

# A constant dummy hash so the login path takes the same time whether or not
# the email exists (prevents user-enumeration via response timing).
DUMMY_HASH = pwd_context.hash("dummy-password-for-timing-equalization")


def hash(password: str) -> str:
    return pwd_context.hash(password)


def verify(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
