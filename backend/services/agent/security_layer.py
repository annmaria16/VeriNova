import logging
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.security")

# Simple signature matching to prevent system prompt injection attempts
INJECTION_PATTERNS = [
    r"(?i)\bignore\b.*\binstruction",
    r"(?i)\bignore\b.*\bsystem\b",
    r"(?i)\breveal\b.*\bsecret\b",
    r"(?i)\bignore\b.*\brule",
    r"(?i)\bignore\b.*\bpolicy",
    r"(?i)system\s+override"
]

def sanitize_tool_output(content: str) -> str:
    """Sanitizes raw output payloads from external web pages before model parsing."""
    if not content:
        return ""
    # Strip obvious override instructions to secure agent prompt boundaries
    sanitized = content
    for pattern in INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[Redacted potential instruction injection attempt]", sanitized)
    return sanitized


def detect_prompt_injection(user_id: int, query: str, db: Session) -> bool:
    """Returns True if an injection attempt is detected and records it to SecurityAuditLog."""
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, query):
            logger.warning(f"Security Alert: Suspected Prompt Injection from User {user_id}: '{query}'")
            # Log to SecurityAuditLog
            log = core_models.SecurityAuditLog(
                user_id=user_id,
                event_type="prompt_injection",
                details=f"Query matched pattern: {pattern}. Query content: {query[:200]}"
            )
            db.add(log)
            db.commit()
            return True
    return False


def check_rate_limit(user_id: int, db: Session) -> bool:
    """Returns True if the rate limit is violated, False otherwise."""
    # Check tasks created in the last 1 minute (limit to 10 requests per minute)
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    requests_count = db.query(core_models.Task).filter(
        core_models.Task.user_id == user_id,
        core_models.Task.created_at >= one_minute_ago
    ).count()
    
    if requests_count >= 10:
        log = core_models.SecurityAuditLog(
            user_id=user_id,
            event_type="rate_limit_violation",
            details="User exceeded task request limit: 10 requests per minute."
        )
        db.add(log)
        db.commit()
        return True
    return False
