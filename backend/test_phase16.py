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
from services.security.rbac_service import RBACService, PolicyEngine, RiskEngine

class TestPhase16(unittest.TestCase):

    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_user = models.User(
            id=1,
            email="test_user@verinova.com",
            role="user",
            memory_enabled=True
        )
        self.mock_org = core_models.Organization(
            id=101,
            name="Enterprise Org A",
            slug="org-a",
            owner_id=1,
            status="ACTIVE",
            plan="BUSINESS"
        )
        self.mock_member = core_models.OrganizationMember(
            id=10,
            organization_id=101,
            user_id=1,
            role_id="ADMIN",
            status="ACTIVE"
        )
        
        # Seed DB query mocks
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == models.User:
                q.first.return_value = self.mock_user
            elif model == core_models.Organization:
                q.first.return_value = self.mock_org
            elif model == core_models.OrganizationMember:
                q.first.return_value = self.mock_member
            else:
                q.first.return_value = None
            return q
            
        self.mock_db.query.side_effect = mock_query

    def test_rbac_permissions(self):
        print("\n--- Test: RBAC Permissions Evaluation ---")
        
        # Admin has members:invite
        self.assertTrue(RBACService.has_permission(user_id=1, org_id=101, permission="members:invite", db=self.mock_db))
        # Admin lacks system:override
        self.assertFalse(RBACService.has_permission(user_id=1, org_id=101, permission="system:override", db=self.mock_db))
        print("Enforced role privileges verification checking: Success.")

    def test_policy_engine_validation(self):
        print("\n--- Test: Policy Cost Budgets & Tool Checks ---")
        
        # Mock policy record
        policy_mock = core_models.OrgPolicy(
            id=1,
            policy_id="pol_xyz",
            organization_id=101,
            allowed_agents=["research_agent", "shopping_agent"],
            allowed_tools=["web_search"],
            max_task_cost=50.0,
            risk_limit="HIGH"
        )
        
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.OrgPolicy:
                q.first.return_value = policy_mock
            return q
        self.mock_db.query.side_effect = mock_query
        
        # Task cost within budget (success)
        self.assertTrue(PolicyEngine.validate_action(org_id=101, agent_id="research_agent", tool_id="web_search", task_cost=12.5, db=self.mock_db))
        # Task cost exceeds budget (fails)
        self.assertFalse(PolicyEngine.validate_action(org_id=101, agent_id="research_agent", tool_id="web_search", task_cost=75.0, db=self.mock_db))
        # Blocked tool (fails)
        self.assertFalse(PolicyEngine.validate_action(org_id=101, agent_id="research_agent", tool_id="purchase_tool", task_cost=5.0, db=self.mock_db))
        print("Budget caps, agent tools blockades verified: Success.")

    def test_risk_classification(self):
        print("\n--- Test: Risk Engine Severity Classifications ---")
        
        # High value purchase is CRITICAL
        self.assertEqual(RiskEngine.classify_risk("purchase", amount=15000.0), "CRITICAL")
        # Regular email send is HIGH
        self.assertEqual(RiskEngine.classify_risk("send_email_external"), "HIGH")
        # Calendar updates are MEDIUM
        self.assertEqual(RiskEngine.classify_risk("calendar_write"), "MEDIUM")
        print("Risk levels resolved correctly based on cost thresholds: Success.")

    def test_approval_request_routing(self):
        print("\n--- Test: Approval Request Routing Register ---")
        from main import create_v1_approval_request
        
        payload = {"amount": 15000.0, "action_type": "purchase"}
        res = create_v1_approval_request(org_id=101, payload=payload, db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(res["success"])
        self.assertEqual(res["approval_request"]["status"], "PENDING")
        print("Approval request created and routes successfully in pending state: Success.")

    def test_cross_org_access_block(self):
        print("\n--- Test: Cross-Organization IDOR Access Control ---")
        from main import get_v1_org_members
        
        # User 2 tries to read Organization 101 members list
        other_user = models.User(id=2, email="other@verinova.com", role="user")
        
        # Override mock filter to return None since User 2 has no OrgMember mapping
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            q.first.return_value = None
            return q
        self.mock_db.query.side_effect = mock_query
        
        with self.assertRaises(HTTPException) as context:
            get_v1_org_members(org_id=101, db=self.mock_db, current_user=other_user)
            
        self.assertEqual(context.exception.status_code, 403)
        print("Blocked User 2 access attempt to Tenant A organization members list: Success.")

if __name__ == "__main__":
    unittest.main()
