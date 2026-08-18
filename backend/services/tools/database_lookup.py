import logging
from pydantic import BaseModel, Field
from enum import Enum
from sqlalchemy.orm import Session
import models
import core_models
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.database_lookup")

class DatabaseLookupOperation(str, Enum):
    GET_USER_TASKS = "get_user_tasks"
    GET_USER_PROFILE = "get_user_profile"
    GET_TASK_HISTORY = "get_task_history"
    GET_VERIFICATION_HISTORY = "get_verification_history"

class DatabaseLookupInput(BaseModel):
    operation: DatabaseLookupOperation = Field(..., description="The database operation to perform.")

@register_tool(
    name="database_lookup",
    description="Query authorized user records (tasks, profile, history) from VeriNova's platform database. Scoped strictly to the authenticated user.",
    input_schema=DatabaseLookupInput,
    risk_level="LOW",
    requires_auth=True
)
def execute_database_lookup(operation: DatabaseLookupOperation, db: Session, current_user: models.User) -> dict:
    try:
        if operation in (DatabaseLookupOperation.GET_USER_TASKS, DatabaseLookupOperation.GET_TASK_HISTORY):
            tasks = db.query(core_models.Task).filter(core_models.Task.user_id == current_user.id).order_by(core_models.Task.created_at.desc()).all()
            return {
                "success": True,
                "operation": operation,
                "data": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "status": t.status,
                        "confidence_score": t.confidence_score,
                        "final_result": t.final_result,
                        "created_at": t.created_at.isoformat() if t.created_at else None
                    }
                    for t in tasks
                ]
            }
            
        elif operation == DatabaseLookupOperation.GET_USER_PROFILE:
            return {
                "success": True,
                "operation": operation,
                "data": {
                    "id": current_user.id,
                    "fullname": current_user.fullname,
                    "email": current_user.email,
                    "role": current_user.role,
                    "provider": current_user.provider,
                    "created_at": current_user.created_at.isoformat() if current_user.created_at else None
                }
            }
            
        elif operation == DatabaseLookupOperation.GET_VERIFICATION_HISTORY:
            results = db.query(core_models.VerificationResult).join(
                core_models.Task, core_models.Task.id == core_models.VerificationResult.task_id
            ).filter(core_models.Task.user_id == current_user.id).order_by(core_models.VerificationResult.id.desc()).all()
            
            return {
                "success": True,
                "operation": operation,
                "data": [
                    {
                        "id": r.id,
                        "task_id": r.task_id,
                        "final_status": r.final_status,
                        "confidence_score": r.confidence_score,
                        "evidence_passed": r.evidence_passed,
                        "evidence_failed": r.evidence_failed,
                        "evidence_total": r.evidence_total,
                        "explanation": r.explanation
                    }
                    for r in results
                ]
            }
            
    except Exception as e:
        logger.error(f"Database lookup tool failed for operation '{operation}': {str(e)}")
        return {
            "success": False,
            "operation": operation,
            "error": f"Database error: {str(e)}"
        }
