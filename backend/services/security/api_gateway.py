import hashlib
import logging
from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.security.api_gateway")

class ApiGateway:
    @staticmethod
    def hash_key(api_key: str) -> str:
        return hashlib.sha256(api_key.encode("utf-8")).hexdigest()

    @staticmethod
    def validate_key(
        api_key: str,
        db: Session
    ) -> Optional[core_models.ApiKey]:
        # Prefix check (e.g. vn_live_ or vn_test_) (Section 5)
        if not (api_key.startswith("vn_live_") or api_key.startswith("vn_test_")):
            logger.warning("API key prefix validation failed.")
            return None
            
        hashed = ApiGateway.hash_key(api_key)
        key_record = db.query(core_models.ApiKey).filter(
            core_models.ApiKey.key_hash == hashed,
            core_models.ApiKey.status == "ACTIVE"
        ).first()
        
        if not key_record:
            logger.warning("API key lookup failed or key is suspended/revoked.")
            return None
            
        # Expiry check
        if key_record.expires_at and key_record.expires_at < datetime.utcnow():
            logger.warning(f"API key {key_record.key_id} expired.")
            key_record.status = "REVOKED"
            db.commit()
            return None
            
        # Update usage timestamp (Section 5)
        key_record.last_used_at = datetime.utcnow()
        db.commit()
        return key_record

    @staticmethod
    def check_scopes(
        key_record: core_models.ApiKey,
        required_scope: str
    ) -> bool:
        # Check permissions using lease privilege (Section 7 & 8)
        scopes = key_record.scopes or []
        if required_scope in scopes or "*" in scopes:
            return True
        logger.warning(f"Key {key_record.key_id} lacks required scope '{required_scope}'. Got: {scopes}")
        return False

    @staticmethod
    def check_idempotency(
        idempotency_key: str,
        client_id: int,
        db: Session
    ) -> Optional[Dict]:
        # Idempotency key tracking (Section 21)
        record = db.query(core_models.IdempotencyRecord).filter(
            core_models.IdempotencyRecord.idempotency_key == idempotency_key,
            core_models.IdempotencyRecord.client_id == client_id
        ).first()
        
        if record:
            logger.info(f"Duplicate request detected for Idempotency Key: {idempotency_key}.")
            return record.response_payload
        return None

    @staticmethod
    def save_idempotency(
        idempotency_key: str,
        client_id: int,
        response_payload: Dict,
        db: Session
    ):
        record = core_models.IdempotencyRecord(
            idempotency_key=idempotency_key,
            client_id=client_id,
            response_payload=response_payload
        )
        db.add(record)
        db.commit()
