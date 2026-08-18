import logging
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.audit_service")

class AuditLogService:
    @staticmethod
    def log_event(
        db: Session,
        event_type: str, # AUTH_LOGIN, AGENT_STARTED, etc.
        user_id: int = None,
        admin_id: int = None,
        task_id: int = None,
        run_id: int = None,
        agent_id: str = None,
        action_id: int = None,
        resource_type: str = None,
        resource_id: str = None,
        result: str = "SUCCESS", # SUCCESS, FAILURE, DENIED
        metadata: dict = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> str:
        audit_id = f"aud_{uuid.uuid4().hex[:8]}"
        
        try:
            log = core_models.SystemAuditLog(
                audit_id=audit_id,
                user_id=user_id,
                admin_id=admin_id,
                task_id=task_id,
                run_id=run_id,
                agent_id=agent_id,
                action_id=action_id,
                event_type=event_type,
                resource_type=resource_type,
                resource_id=resource_id,
                result=result,
                event_metadata=metadata or {},
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.utcnow()
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to record audit event log: {str(e)}")
            
        logger.info(f"[AuditLog] {event_type} (Result: {result}) [ID: {audit_id}]")
        return audit_id
