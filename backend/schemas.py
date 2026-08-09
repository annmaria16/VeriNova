from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
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

class ProfileUpdate(BaseModel):
    fullname: str


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

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class ResetPasswordRequest(BaseModel):
    token: str
    password: str


# Task schemas
class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    expected_outcome: Optional[str] = None
    evidence_type: Optional[str] = None
    method: Optional[str] = None
    status: str
    confidence: Optional[float] = None
    date: str
    reference_id: Optional[str] = None

class TaskCreate(TaskBase):
    id: str

class TaskResponse(TaskBase):
    id: str
    user_id: int

    class Config:
        from_attributes = True


# Verification Log schemas
class VerificationLogBase(BaseModel):
    step: int
    message: str

class VerificationLogCreate(VerificationLogBase):
    task_id: str

class VerificationLogResponse(VerificationLogBase):
    id: int
    task_id: str
    timestamp: datetime

    class Config:
        from_attributes = True


# Notification schemas
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    timestamp: str
    read: bool
    user_id: int

    class Config:
        from_attributes = True


# Report schemas
class ReportResponse(BaseModel):
    id: str
    name: str
    type: str
    timestamp: str
    status: str
    size: str
    user_id: int

    class Config:
        from_attributes = True


# Statistics schemas
class TaskStatistics(BaseModel):
    totalTasks: int
    verifiedTasks: int
    pendingTasks: int
    failedTasks: int
    avgConfidence: float


# Dashboard schemas
class StatItem(BaseModel):
    value: float
    change: str
    trend: Optional[str] = None

class DashboardStatistics(BaseModel):
    totalTasks: StatItem
    verifiedTasks: StatItem
    pendingTasks: StatItem
    failedTasks: StatItem
    avgConfidence: StatItem

class DashboardActivity(BaseModel):
    labels: List[str]
    values: List[int]

class DashboardTaskStatus(BaseModel):
    total: int
    verified: int
    pending: int
    running: int
    failed: int


# Product schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: float
    stock: int
    image_url: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    created_by: Optional[int] = None
    organization_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Booking Slot schemas
class BookingSlotBase(BaseModel):
    slot_time: datetime
    is_available: bool = True

class BookingSlotCreate(BookingSlotBase):
    service_id: int

class BookingSlotResponse(BookingSlotBase):
    id: int
    service_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Booking Service schemas
class BookingServiceBase(BaseModel):
    service_name: str
    service_type: Optional[str] = None
    location: Optional[str] = None
    price: float
    capacity: int
    is_active: bool = True

class BookingServiceCreate(BookingServiceBase):
    pass

class BookingServiceResponse(BookingServiceBase):
    id: int
    created_by: Optional[int] = None
    organization_id: Optional[int] = None
    created_at: datetime
    slots: List[BookingSlotResponse] = []

    class Config:
        from_attributes = True
