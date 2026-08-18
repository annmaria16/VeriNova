import logging
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.support_tool")

# ============================================================
# CREATE SUPPORT MESSAGE (SENSITIVE ACTION)
# ============================================================

class CreateSupportMessageInput(BaseModel):
    subject: str = Field(..., description="The subject line of the support message.")
    message: str = Field(..., description="The main content message describing the request.")

@register_tool(
    name="create_support_message",
    description="Send a contact support message to the Verinova admin team. (Requires User Confirmation)",
    input_schema=CreateSupportMessageInput,
    risk_level="MEDIUM",
    requires_auth=True
)
def create_support_message(subject: str, message: str, db: Session, current_user: models.User) -> dict:
    db_msg = models.ContactMessage(
        user_id=current_user.id,
        name=current_user.fullname,
        email=current_user.email,
        subject=subject.strip(),
        message=message.strip(),
        status="new"
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)

    return {
        "success": True,
        "message_id": db_msg.id,
        "status": "submitted"
    }

# ============================================================
# GET SUPPORT MESSAGES
# ============================================================

class GetSupportMessagesInput(BaseModel):
    pass # No input args needed; automatically scopes to the authenticated user or fetches all for admin

@register_tool(
    name="get_support_messages",
    description="Retrieve support/contact messages history.",
    input_schema=GetSupportMessagesInput
)
def get_support_messages(db: Session, current_user: models.User) -> dict:
    if current_user.role == "admin":
        messages = db.query(models.ContactMessage).order_by(models.ContactMessage.created_at.desc()).all()
    else:
        messages = db.query(models.ContactMessage).filter(models.ContactMessage.user_id == current_user.id).order_by(models.ContactMessage.created_at.desc()).all()

    return {
        "messages": [
            {
                "id": m.id,
                "subject": m.subject,
                "message": m.message,
                "status": m.status,
                "created_at": str(m.created_at)
            }
            for m in messages
        ]
    }
