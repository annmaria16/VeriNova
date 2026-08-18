import logging
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.user_tool")

# ============================================================
# GET USER PROFILE
# ============================================================

class GetUserProfileInput(BaseModel):
    user_id: int = Field(..., description="The user ID of the profile to retrieve.")

@register_tool(
    name="get_user_profile",
    description="Retrieve account profile details (ID, fullname, email, provider, role, created_at) for a user.",
    input_schema=GetUserProfileInput,
    risk_level="LOW",
    requires_auth=True
)
def get_user_profile(user_id: int, db: Session, current_user: models.User) -> dict:
    if current_user.role != "admin" and current_user.id != user_id:
        raise PermissionError("Access denied: You are not authorized to retrieve this user's profile.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError(f"User with ID {user_id} not found.")

    return {
        "id": user.id,
        "fullname": user.fullname,
        "email": user.email,
        "provider": user.provider,
        "role": user.role,
        "created_at": str(user.created_at)
    }

# ============================================================
# UPDATE USER PROFILE (SENSITIVE ACTION)
# ============================================================

class UpdateUserProfileInput(BaseModel):
    user_id: int = Field(..., description="The user ID of the profile to update.")
    fullname: str = Field(..., description="The new full name for the user profile.")

@register_tool(
    name="update_user_profile",
    description="Update permitted account profile details (fullname) for a user. (Requires User Confirmation)",
    input_schema=UpdateUserProfileInput,
    risk_level="MEDIUM",
    requires_auth=True
)
def update_user_profile(user_id: int, fullname: str, db: Session, current_user: models.User) -> dict:
    if current_user.role != "admin" and current_user.id != user_id:
        raise PermissionError("Access denied: You are not authorized to update this user's profile.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError(f"User with ID {user_id} not found.")

    user.fullname = fullname.strip()
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user_id": user.id,
        "updated_fullname": user.fullname
    }
