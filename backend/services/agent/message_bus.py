import logging
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.message_bus")

class AgentMessageBus:
    @staticmethod
    def post_message(
        task_id: int,
        from_agent: str,
        to_agent: str,
        message_type: str, # TASK_REQUEST, TASK_RESULT, TASK_FAILURE, EVIDENCE, etc.
        payload: dict,
        db: Session,
        run_id: int = None
    ) -> str:
        message_id = f"msg_{uuid.uuid4().hex[:8]}"
        
        # Log to DB for audit history and context rebuilds
        try:
            db_message = core_models.AgentMessage(
                message_id=message_id,
                run_id=run_id,
                task_id=task_id,
                from_agent=from_agent,
                to_agent=to_agent,
                message_type=message_type,
                payload=payload,
                created_at=datetime.utcnow()
            )
            db.add(db_message)
            db.commit()
            
            # Record an AgentEvent to audit tracing
            event_type = f"AGENT_HANDOFF" if message_type == "HANDOFF" else f"AGENT_{message_type}"
            db_event = core_models.AgentEvent(
                run_id=run_id,
                task_id=task_id,
                event_type=event_type,
                agent_id=from_agent,
                details=f"Message {message_type} sent from '{from_agent}' to '{to_agent}'. payload keys: {list(payload.keys())}",
                created_at=datetime.utcnow()
            )
            db.add(db_event)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log AgentMessage: {str(e)}")
            
        logger.info(f"[MessageBus] {message_type} from {from_agent} -> {to_agent} (ID: {message_id})")
        return message_id

    @staticmethod
    def retrieve_messages_for_run(run_id: int, db: Session) -> list:
        return db.query(core_models.AgentMessage).filter(
            core_models.AgentMessage.run_id == run_id
        ).order_by(core_models.AgentMessage.created_at.asc()).all()
