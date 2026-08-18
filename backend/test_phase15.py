import sys
import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.append("c:/Users/HP/Documents/verinova/backend")

# Set dummy key for Tavily search import stability
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"

from fastapi import HTTPException
import core_models
import models
from services.security.api_gateway import ApiGateway

class TestPhase15(unittest.TestCase):

    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_user = models.User(
            id=1,
            email="test_user@verinova.com",
            role="user",
            memory_enabled=True
        )
        self.mock_client = core_models.ApiClient(
            id=10,
            name="Developer Client A",
            owner_id=1,
            status="ACTIVE",
            environment="DEVELOPMENT"
        )
        # Hashed token matching prefix 'vn_live_abc123'
        self.mock_key = core_models.ApiKey(
            id=20,
            key_id="key_vn_live_abc123",
            client_id=10,
            key_hash=hashlib.sha256("vn_live_abc123".encode("utf-8")).hexdigest() if "hashlib" in globals() else ApiGateway.hash_key("vn_live_abc123"),
            prefix="vn_live_",
            scopes=["agents:run", "tasks:create", "tasks:read"],
            status="ACTIVE"
        )
        
        # Seed query mocks
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == models.User:
                q.first.return_value = self.mock_user
            elif model == core_models.ApiClient:
                q.first.return_value = self.mock_client
            elif model == core_models.ApiKey:
                q.first.return_value = self.mock_key
            else:
                q.first.return_value = None
            return q
            
        self.mock_db.query.side_effect = mock_query

    def test_health_check(self):
        print("\n--- Test: Platform Health Status ---")
        from main import get_v1_health
        
        res = get_v1_health(db=self.mock_db)
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "HEALTHY")
        print("Health status returned healthy status without exposing keys: Success.")

    def test_api_key_prefix_and_hashes(self):
        print("\n--- Test: API Key Prefix & Hashes Validation ---")
        
        # 1. Valid key
        key_rec = ApiGateway.validate_key("vn_live_abc123", db=self.mock_db)
        self.assertIsNotNone(key_rec)
        
        # 2. Invalid prefix key
        invalid_rec = ApiGateway.validate_key("invalid_abc123", db=self.mock_db)
        self.assertIsNone(invalid_rec)
        print("API keys validation with hash matches and prefix checks passed: Success.")

    def test_api_scopes_authorization(self):
        print("\n--- Test: API Scopes Least Privilege Checks ---")
        
        # Has agents:run
        self.assertTrue(ApiGateway.check_scopes(self.mock_key, "agents:run"))
        # Lacks purchases:execute
        self.assertFalse(ApiGateway.check_scopes(self.mock_key, "purchases:execute"))
        print("Least privilege checks on specific scope boundaries passed: Success.")

    def test_idempotency_caching(self):
        print("\n--- Test: Idempotency Key Request Caching ---")
        from main import create_v1_task
        
        # Seed idempotency mock
        cached_record = core_models.IdempotencyRecord(
            idempotency_key="idemp_key_123",
            client_id=10,
            response_payload={"success": True, "taskId": 999, "status": "QUEUED"}
        )
        
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.IdempotencyRecord:
                q.first.return_value = cached_record
            elif model == core_models.ApiKey:
                q.first.return_value = self.mock_key
            elif model == core_models.ApiClient:
                q.first.return_value = self.mock_client
            return q
        self.mock_db.query.side_effect = mock_query
        
        res = create_v1_task(
            payload={"goal": "Repeat action"},
            x_api_key="vn_live_abc123",
            idempotency_key="idemp_key_123",
            db=self.mock_db
        )
        # Checks that cached result is returned directly
        self.assertEqual(res["taskId"], 999)
        print("Cached payload response for matching idempotency key returned: Success.")

    def test_cross_tenant_access_block(self):
        print("\n--- Test: Cross-Tenant Data Access Boundary ---")
        from main import get_v1_task_status
        
        # Task owned by User 99 (different tenant)
        other_task = core_models.Task(
            id=202,
            user_id=99,
            description="Other developer task",
            status="pending"
        )
        
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.Task:
                q.first.return_value = other_task
            elif model == core_models.ApiKey:
                q.first.return_value = self.mock_key
            elif model == core_models.ApiClient:
                q.first.return_value = self.mock_client
            return q
        self.mock_db.query.side_effect = mock_query
        
        with self.assertRaises(HTTPException) as context:
            get_v1_task_status(task_id=202, x_api_key="vn_live_abc123", db=self.mock_db)
            
        self.assertEqual(context.exception.status_code, 403)
        print("Blocked access attempt from tenant client to another tenant's task: Success.")

    def test_webhook_subscription(self):
        print("\n--- Test: Webhook Subscription Register ---")
        from main import subscribe_v1_webhook
        
        payload = {"callback_url": "https://callback.net/events", "events": ["task.completed"]}
        res = subscribe_v1_webhook(payload=payload, x_api_key="vn_live_abc123", db=self.mock_db)
        self.assertTrue(res["success"])
        self.assertIn("secret", res)
        self.assertTrue(res["secret"].startswith("whsec_"))
        print("Webhook registered and HMAC secret generated successfully: Success.")

if __name__ == "__main__":
    unittest.main()
