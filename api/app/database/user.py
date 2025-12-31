# import uuid 
# from typing import List, Optional
# from fastapi import Depends, Request
# from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin, models
# from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
# from fastapi_users.db import SQLAlchemyUserDatabase, SQLAlchemyBaseUserTable
# from app.database.session import User # get_user_db

# #this file creates a user table in postgresql

# SECRET = "SECRET_KEY_CHANGE_ME"



# class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
#     reset_password_token_secret = SECRET
#     verification_token_secret = SECRET

#     async def on_after_register(self, user: User, request: Optional[Request] = None):
#         print(f"User {user.id} has registered.")
    
#     async def on_after_forgot_password(self, user: User, token, request: Optional[Request] = None):
#         print(f"User {user.id} has forgotten thier password. Reset token: {token}")
    
#     async def on_after_request_verify(self, user, token, request = None):
#         print(f"Verification request for user {user.id}. Verification Token: {token}")

# # async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
# #     yield UserManager(user_db)

# bearer_transport = BearerTransport(tokenUrl= "/auth/jwt/login")

# async def get_jwt_strategy():
#     return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

# auth_backend = AuthenticationBackend (
#     name = "jwt",
#     transport = bearer_transport,
#     get_strategy= JWTStrategy
# )

# # fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])
# # current_active_user = fastapi_users.current_user(active=True)