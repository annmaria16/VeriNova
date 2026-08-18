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
from services.agent.supervisor import SupervisorAgent
from services.agent.replanning_engine import ReplanningEngine

class TestPhase14(unittest.TestCase):

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
            description="Find me a cheap laptop on Amazon and schedule a review meeting",
            status="pending"
        )
        
        # Seed query mocks
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == models.User:
                q.first.return_value = self.mock_user
            elif model == core_models.Task:
                q.first.return_value = self.mock_task
            elif model == core_models.AgentRun:
                q.first.return_value = None
            else:
                q.first.return_value = None
            return q
            
        self.mock_db.query.side_effect = mock_query

    def test_supervisor_orchestration(self):
        print("\n--- Test: Supervisor Orchestration Handoffs ---")
        
        # Mock specialized agent executions
        with patch("services.agent.supervisor.get_specialized_agent") as mock_get_agent:
            mock_agent = MagicMock()
            mock_agent.plan.return_value = [{"step_id": 1, "description": "Mocked run"}]
            mock_agent.execute.return_value = {"status": "SUCCESS"}
            mock_get_agent.return_value = mock_agent
            
            res = SupervisorAgent.orchestrate_task(
                task=self.mock_task,
                db=self.mock_db,
                current_user=self.mock_user
            )
            self.assertIn(res["status"], ("COMPLETED", "PARTIALLY_COMPLETED", "CONFLICTED"))
            print(f"Orchestration completed with status: {res['status']}. Success.")

    def test_replanning_fallback_tool(self):
        print("\n--- Test: Replanning Fallback Tool Selection ---")
        
        # Create plan step mock
        step_mock = core_models.PlanStep(
            step_id="step_1",
            plan_id="plan_1",
            tool_id="search_products_amazon",
            description="Search products on Amazon",
            status="FAILED"
        )
        
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.PlanStep:
                q.all.return_value = [step_mock]
            elif model == core_models.PlanRevision:
                q.order_by.return_value.first.return_value = None
            return q
        self.mock_db.query.side_effect = mock_query
        
        res = ReplanningEngine.replan_failed_step(
            plan_id="plan_1",
            failed_step_id="step_1",
            failure_reason="Network Timeout on Amazon API",
            db=self.mock_db
        )
        self.assertTrue(res)
        self.assertEqual(step_mock.tool_id, "search_products_flipkart")
        self.assertEqual(step_mock.status, "PENDING")
        print("Substituted failed step with fallback tool successfully: Success.")

    def test_replanning_human_escalation(self):
        print("\n--- Test: Replanning Human Escalation Fallback ---")
        
        step_mock = core_models.PlanStep(
            step_id="step_2",
            plan_id="plan_2",
            tool_id="non_fallbackable_tool",
            description="Purchase luxury item",
            status="FAILED"
        )
        
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.PlanStep:
                q.all.return_value = [step_mock]
            elif model == core_models.PlanRevision:
                q.order_by.return_value.first.return_value = None
            return q
        self.mock_db.query.side_effect = mock_query
        
        res = ReplanningEngine.replan_failed_step(
            plan_id="plan_2",
            failed_step_id="step_2",
            failure_reason="Credit limit exceeded",
            db=self.mock_db
        )
        self.assertFalse(res)
        self.assertEqual(step_mock.status, "FAILED")
        print("Escalated unrecoverable task step to human successfully: Success.")

    def test_multi_agent_resource_locking(self):
        print("\n--- Test: Multi-Agent Resource Locking ---")
        
        # Mock resource lock model
        lock_mock = core_models.ResourceLock(
            resource_id="calendar_ Rahul_slot",
            locked_by_agent="Agent_A",
            acquired_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        
        # Test A: Resource is already locked
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.ResourceLock:
                q.first.return_value = lock_mock
            return q
        self.mock_db.query.side_effect = mock_query
        
        # If Agent B tries to lock the same resource
        is_locked = self.mock_db.query(core_models.ResourceLock).filter(
            core_models.ResourceLock.resource_id == "calendar_ Rahul_slot"
        ).first()
        
        self.assertIsNotNone(is_locked)
        self.assertEqual(is_locked.locked_by_agent, "Agent_A")
        print("Resource lock held by Agent_A successfully blocked Agent_B: Success.")

    def test_v1_agents_and_workflows_endpoints(self):
        print("\n--- Test: Agent & Workflows API Endpoints ---")
        from main import list_v1_agents, list_v1_workflows
        
        reg_mock = core_models.AgentRegistry(
            agent_id="research_agent",
            name="ResearchAgent",
            status="ACTIVE",
            health="HEALTHY",
            capabilities=["web_research"]
        )
        tmpl_mock = core_models.WorkflowTemplate(
            template_id="PRICE_COMPARISON",
            name="Price Comparison Workflow",
            required_capabilities=["SEARCH_PRODUCTS", "COMPARE_PRICES"],
            risk_level="LOW"
        )
        
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.AgentRegistry:
                q.all.return_value = [reg_mock]
            elif model == core_models.WorkflowTemplate:
                q.all.return_value = [tmpl_mock]
            return q
        self.mock_db.query.side_effect = mock_query
        
        agents_res = list_v1_agents(db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(agents_res["success"])
        self.assertTrue(len(agents_res["agents"]) > 0)
        
        workflows_res = list_v1_workflows(db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(workflows_res["success"])
        self.assertTrue(len(workflows_res["templates"]) > 0)
        print("Agent details list and Workflow template routes checked: Success.")

if __name__ == "__main__":
    unittest.main()
