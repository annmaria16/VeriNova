import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.circuit_breaker")

def check_circuit_breaker(tool_name: str, db: Session) -> bool:
    """Returns True if the tool is safe to execute, False if the circuit breaker is OPEN."""
    health = db.query(core_models.ToolHealth).filter(core_models.ToolHealth.tool_name == tool_name).first()
    if not health:
        return True # CLOSED (working) by default
        
    if health.circuit_state == "OPEN":
        # Check if cooling duration of 30 seconds has passed to trial it again
        if health.last_failed_at and datetime.utcnow() - health.last_failed_at > timedelta(seconds=30):
            health.circuit_state = "HALF_OPEN"
            db.commit()
            logger.info(f"Circuit breaker for tool '{tool_name}' transitioned to HALF_OPEN. Trialing execution.")
            return True
        logger.warning(f"Circuit breaker is OPEN for tool '{tool_name}'. Blocking execution.")
        return False
    return True

def record_tool_success(tool_name: str, db: Session):
    health = db.query(core_models.ToolHealth).filter(core_models.ToolHealth.tool_name == tool_name).first()
    if not health:
        health = core_models.ToolHealth(
            tool_name=tool_name,
            success_count=0,
            failure_count=0,
            consecutive_failures=0,
            circuit_state="CLOSED"
        )
        db.add(health)
    
    if health.success_count is None:
        health.success_count = 0
    if health.consecutive_failures is None:
        health.consecutive_failures = 0
        
    health.success_count += 1
    health.consecutive_failures = 0
    health.circuit_state = "CLOSED"
    db.commit()

def record_tool_failure(tool_name: str, db: Session):
    health = db.query(core_models.ToolHealth).filter(core_models.ToolHealth.tool_name == tool_name).first()
    if not health:
        health = core_models.ToolHealth(
            tool_name=tool_name,
            success_count=0,
            failure_count=0,
            consecutive_failures=0,
            circuit_state="CLOSED"
        )
        db.add(health)
        
    if health.failure_count is None:
        health.failure_count = 0
    if health.consecutive_failures is None:
        health.consecutive_failures = 0
        
    health.failure_count += 1
    health.consecutive_failures += 1
    health.last_failed_at = datetime.utcnow()
    
    if health.consecutive_failures >= 3:
        health.circuit_state = "OPEN"
        logger.warning(f"Circuit breaker for tool '{tool_name}' tripped OPEN due to {health.consecutive_failures} consecutive failures.")
    db.commit()
