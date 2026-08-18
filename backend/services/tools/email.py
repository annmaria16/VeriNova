import logging
from pydantic import BaseModel, Field, EmailStr
from services.agent.tool_registry import register_tool
from services.providers import EmailProvider

logger = logging.getLogger("verinova.tools.email")

class DraftEmailInput(BaseModel):
    to_email: str = Field(..., description="The recipient's email address.")
    subject: str = Field(..., description="The email subject line.")
    body: str = Field(..., description="The email body text.")

@register_tool(
    name="draft_email",
    description="Draft a contact or notification email. (Requires User Confirmation to finalize send)",
    input_schema=DraftEmailInput,
    risk_level="MEDIUM",
    requires_auth=False
)
def draft_email(to_email: str, subject: str, body: str) -> dict:
    draft = EmailProvider.draft_email(to_email, subject, body)
    return {
        "success": True,
        "draft_id": draft["draft_id"],
        "to": draft["to"],
        "subject": draft["subject"],
        "body": draft["body"],
        "status": "DRAFTED_AWAITING_SEND",
        "action_required": "Please approve sending this drafted email."
    }
