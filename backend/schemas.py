from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Auth schemas
class UserBase(BaseModel):
    email: EmailStr
    fullname: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    provider: str
    created_at: datetime
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class OAuthLoginRequest(BaseModel):
    provider: str
    email: EmailStr
    fullname: str
    code: Optional[str] = None
