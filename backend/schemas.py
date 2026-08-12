from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    ConfigDict,
)


# ============================================================
# ADMIN AUTH SCHEMAS
# ============================================================

class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str


# ============================================================
# TASK SCHEMAS
# ============================================================

class TaskCreate(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200
    )

    description: Optional[str] = None

    task_type: str = Field(
        default="verification",
        max_length=100
    )


class TaskStatusUpdate(BaseModel):
    status: str = Field(
        ...,
        min_length=1,
        max_length=30
    )


class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    task_type: str
    status: str
    confidence_score: Optional[float] = None
    final_result: Optional[str] = None
    reference_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# USER AUTH SCHEMAS
# ============================================================

class UserBase(BaseModel):
    email: EmailStr
    fullname: str


class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=6,
        max_length=128
    )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ============================================================
# USER RESPONSE
# ============================================================

class UserResponse(UserBase):
    id: int

    provider: str

    # --------------------------------------------------------
    # IMPORTANT
    # Frontend uses this to decide:
    #
    # user  -> User Dashboard
    # admin -> Admin Dashboard
    # --------------------------------------------------------

    role: str

    created_at: datetime

    avatar_url: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# TOKEN SCHEMAS
# ============================================================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# ============================================================
# OAUTH SCHEMAS
# ============================================================

class OAuthLoginRequest(BaseModel):
    provider: str
    email: EmailStr
    fullname: str
    code: Optional[str] = None