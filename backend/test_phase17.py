import sys
import os
import unittest
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.append("c:/Users/HP/Documents/verinova/backend")

# Set dummy key for Tavily search import stability
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"

from fastapi import HTTPException
import core_models
import models
from services.agent.action_engine import ActionEngine

class TestPhase17(unittest.TestCase):

    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_user = models.User(
            id=1,
            email="test_user@verinova.com",
            role="user",
            memory_enabled=True
        )
        self.mock_task = core_models.Task(
            id=101,
            user_id=1,
            description="Book travel tickets",
            status="pending"
        )
        self.mock_action = core_models.RealAction(
            id=5,
            action_id="act_abc123",
            task_id=101,
            user_id=1,
            agent_id="travel_agent",
            action_type="booking",
            status="AWAITING_CONFIRMATION"
        )
        
        # Seed DB query mocks
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == models.User:
                q.first.return_value = self.mock_user
            elif model == core_models.Task:
                q.first.return_value = self.mock_task
            elif model == core_models.RealAction:
                q.first.return_value = self.mock_action
            else:
                q.first.return_value = None
            return q
            
        self.mock_db.query.side_effect = mock_query

    def test_action_creation_states(self):
        print("\n--- Test: Action Creation & Confirmation Tiers ---")
        from main import create_v1_action
        
        # 1. Purchase action requires confirmation (Section 24)
        payload_purchase = {"task_id": 101, "agent_id": "shopping_agent", "action_type": "purchase", "risk_level": "HIGH"}
        res_p = create_v1_action(payload=payload_purchase, db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(res_p["success"])
        self.assertEqual(res_p["action"]["status"], "AWAITING_CONFIRMATION")
        
        # 2. Search action does NOT require confirmation (Section 2 & 33)
        payload_search = {"task_id": 101, "agent_id": "research_agent", "action_type": "search"}
        res_s = create_v1_action(payload=payload_search, db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(res_s["success"])
        self.assertEqual(res_s["action"]["status"], "AUTHORIZED")
        print("Confirmation required flags set correctly based on action type: Success.")

    def test_confirm_action_state_machine(self):
        print("\n--- Test: Confirm Action Transition State Machine ---")
        from main import confirm_v1_action
        
        res = confirm_v1_action(action_id="act_abc123", db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(res["success"])
        self.assertEqual(res["action"]["status"], "COMPLETED")
        print("Completed transition sequence states match: Success.")

    def test_cross_user_confirm_block(self):
        print("\n--- Test: Cross-User IDOR Action Block ---")
        from main import confirm_v1_action
        
        other_user = models.User(id=2, email="other@verinova.com", role="user")
        
        with self.assertRaises(HTTPException) as context:
            confirm_v1_action(action_id="act_abc123", db=self.mock_db, current_user=other_user)
            
        self.assertEqual(context.exception.status_code, 403)
        print("Blocked User 2 from confirming User 1's action request: Success.")

    @patch("services.agent.action_engine.ConfirmationEngine.validate_and_confirm", return_value=True)
    def test_action_engine_purchase_safety(self, mock_validate):
        print("\n--- Test: Action Engine Purchase Safety Check ---")
        
        # Safe purchase block ensures no fake connections (Section 3 & 73)
        res = ActionEngine.execute_action(
            user_id=1,
            task_id=101,
            tool_id="execute_purchase",
            arguments={"item": "headphones", "price": 4500.0},
            db=self.mock_db,
            confirmation_id="dummy_conf"
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["error"], "PROVIDER_UNAVAILABLE")
        print(f"Action Engine outcome error: {res['error']}. Blocked fake orders: Success.")

if __name__ == "__main__":
    unittest.main()
