import logging
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
import core_models
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.verification_tool")

class VerifyActionInput(BaseModel):
    action_id: str = Field(..., description="The action ID to verify. E.g. '123' (action ID) or 'message:123' (support message ID).")

@register_tool(
    name="verify_action",
    description="Verify whether a previous sensitive operation (e.g., profile update or message submission) actually succeeded in the database.",
    input_schema=VerifyActionInput,
    risk_level="LOW",
    requires_auth=True
)
def verify_action(action_id: str, db: Session, current_user: models.User) -> dict:
    try:
        # Check if action_id is a support message ID representation (e.g. "message:123")
        if action_id.startswith("message:"):
            msg_id = int(action_id.split(":")[1])
            msg = db.query(models.ContactMessage).filter(
                models.ContactMessage.id == msg_id,
                models.ContactMessage.user_id == current_user.id
            ).first()
            if msg:
                return {
                    "verified": True,
                    "status": "completed",
                    "details": f"Support message ID {msg_id} was successfully verified in the database."
                }
        else:
            # Otherwise treat as integer AgentAction ID
            act_id = int(action_id)
            action = db.query(core_models.AgentAction).filter(
                core_models.AgentAction.id == act_id,
                core_models.AgentAction.user_id == current_user.id
            ).first()
            if action and action.status == "completed":
                return {
                    "verified": True,
                    "status": "completed",
                    "details": f"Agent action ID {act_id} ({action.tool_name}) was successfully verified."
                }
    except Exception as e:
        logger.error(f"Verify action parsing failed for '{action_id}': {str(e)}")

    return {
        "verified": False,
        "status": "failed",
        "details": f"Failed to verify state for action ID '{action_id}'. No matching records found."
    }
