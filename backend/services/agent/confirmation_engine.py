import logging
import uuid
import hashlib
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.confirmation_engine")

class ConfirmationEngine:
    @staticmethod
    def create_confirmation_request(
        user_id: int,
        task_id: int,
        action_id: int,
        tool_id: str,
        arguments: dict,
        db: Session,
        expiry_minutes: int = 10
    ) -> core_models.ActionConfirmation:
        confirmation_id = f"conf_{uuid.uuid4().hex[:8]}"
        
        # Calculate SHA-256 hash of tool arguments to verify integrity on confirm
        serialized = json.dumps({"tool_id": tool_id, "args": arguments}, sort_keys=True)
        action_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        
        expires_at = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        
        conf = core_models.ActionConfirmation(
            confirmation_id=confirmation_id,
            user_id=user_id,
            task_id=task_id,
            action_id=action_id,
            action_hash=action_hash,
            status="WAITING_CONFIRMATION",
            created_at=datetime.utcnow(),
            expires_at=expires_at
        )
        db.add(conf)
        db.commit()
        db.refresh(conf)
        
        logger.info(f"[ConfirmationEngine] Created confirmation request {confirmation_id} (Expires: {expires_at})")
        return conf

    @staticmethod
    def validate_and_confirm(
        confirmation_id: str,
        user_id: int,
        tool_id: str,
        arguments: dict,
        db: Session
    ) -> bool:
        # Cross-user Access Authorization check
        conf = db.query(core_models.ActionConfirmation).filter(
            core_models.ActionConfirmation.confirmation_id == confirmation_id,
            core_models.ActionConfirmation.user_id == user_id
        ).first()
        
        if not conf:
            logger.warning(f"Confirmation {confirmation_id} not found or access denied for user {user_id}.")
            return False
            
        # Check expiration
        if datetime.utcnow() > conf.expires_at:
            logger.warning(f"Confirmation {confirmation_id} has expired (Expired at: {conf.expires_at}).")
            conf.status = "EXPIRED"
            db.commit()
            return False
            
        # Verify hash integrity
        serialized = json.dumps({"tool_id": tool_id, "args": arguments}, sort_keys=True)
        current_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        
        if current_hash != conf.action_hash:
            logger.warning(f"Confirmation hash discrepancy! Expected: {conf.action_hash}, Got: {current_hash}")
            return False
            
        # Confirm and authorize
        conf.status = "AUTHORIZED"
        conf.confirmed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"[ConfirmationEngine] Confirmed and authorized token {confirmation_id}.")
        return True
