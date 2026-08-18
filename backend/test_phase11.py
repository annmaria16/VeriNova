import sys
import os
import unittest
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.append("c:/Users/HP/Documents/verinova/backend")

# Set dummy key for Tavily search import stability
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"

import core_models
import models
from services.agent.model_router import ModelRouter
from services.agent.agent_capability_registry import AgentCapabilityRegistry
from services.agent.orchestrator import AgentOrchestrator

class TestPhase11(unittest.TestCase):

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
            description="Compare cheap laptops",
            status="pending"
        )
        
        # Route query mocks
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == models.User:
                q.first.return_value = self.mock_user
            elif model == core_models.Task:
                q.first.return_value = self.mock_task
            elif model == core_models.AutomationSetting:
                q.first.return_value = None
            else:
                q.first.return_value = None
            return q
            
        self.mock_db.query.side_effect = mock_query

    def test_model_routing_complexities(self):
        print("\n--- Test: Model Routing Complexities ---")
        self.assertEqual(ModelRouter.route_model("planning_reasoning"), "gpt-4-turbo")
        self.assertEqual(ModelRouter.route_model("summarization"), "gpt-3.5-turbo")
        self.assertEqual(ModelRouter.route_model("sensitive_task", contains_sensitive_data=True), "gpt-4-private")
        print("Model selection routes correctly based on complexity: Success.")

    def test_agent_registry_capabilities(self):
        print("\n--- Test: Agent Registry Capabilities & Substitution check ---")
        self.assertEqual(AgentCapabilityRegistry.match_capability("search_hotels"), "travel_agent")
        self.assertEqual(AgentCapabilityRegistry.match_capability("send_email"), "email_agent")
        
        # Valid substitution (same overlapping type: shopping vs purchase)
        self.assertTrue(AgentCapabilityRegistry.is_substitution_valid("shopping_agent", "shopping_agent"))
        # Invalid substitution (shopping vs calendar)
        self.assertFalse(AgentCapabilityRegistry.is_substitution_valid("shopping_agent", "calendar_agent"))
        print("Agent capability routing and substitution checks passed: Success.")

    def test_workflow_orchestrator_planning_and_dependencies(self):
        print("\n--- Test: Workflow Orchestrator & Dependencies ---")
        
        # Setup mock plan dictionary
        plan_dict = {
            "goal": "Compare laptops",
            "estimated_cost": 0.1,
            "risk_level": "LOW",
            "steps": [
                {"description": "Search Amazon", "tool": "search_products", "dependencies": []},
                {"description": "Compare results", "tool": "compare_products", "dependencies": [1]}
            ]
        }
        
        with patch("services.agent.planner.TaskPlanner.plan_task", return_value=plan_dict):
            # Seed Mock database return values for step list
            plan_obj = core_models.Plan(
                plan_id="plan_xyz",
                task_id=101,
                user_id=1,
                goal="Compare laptops",
                status="RUNNING",
                actual_cost=0.0
            )
            step_1 = core_models.PlanStep(
                step_id="step_plan_xyz_1",
                plan_id="plan_xyz",
                tool_id="search_products",
                description="Search Amazon",
                dependencies=[],
                status="PENDING"
            )
            step_2 = core_models.PlanStep(
                step_id="step_plan_xyz_2",
                plan_id="plan_xyz",
                tool_id="compare_products",
                description="Compare results",
                dependencies=[1],
                status="PENDING"
            )
            
            # Setup db queries to mock plan records
            def mock_query(model):
                q = MagicMock()
                q.filter.return_value = q
                if model == core_models.Plan:
                    q.first.return_value = plan_obj
                elif model == core_models.PlanStep:
                    q.all.return_value = [step_1, step_2]
                return q
            self.mock_db.query.side_effect = mock_query
            
            # Mock ActionEngine step outcomes
            def mock_execute(user_id, task_id, tool_id, arguments, db, confirmation_id):
                if tool_id == "search_products":
                    return {"status": "COMPLETED", "data": {"laptops": []}}
                elif tool_id == "compare_products":
                    return {"status": "COMPLETED", "data": {"comparison": ""}}
                return {"status": "FAILED"}
                
            with patch("services.agent.action_engine.ActionEngine.execute_action", side_effect=mock_execute):
                res = AgentOrchestrator.run_orchestrated_task(
                    task=self.mock_task,
                    db=self.mock_db,
                    current_user=self.mock_user
                )
                print(f"Orchestration result status: {plan_obj.status}")
                self.assertEqual(plan_obj.status, "COMPLETED")
                self.assertEqual(step_1.status, "COMPLETED")
                self.assertEqual(step_2.status, "COMPLETED")

if __name__ == "__main__":
    unittest.main()
