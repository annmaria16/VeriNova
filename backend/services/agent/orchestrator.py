import logging
import uuid
import json
import concurrent.futures
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

import core_models
import models
from services.agent.planner import TaskPlanner
from services.agent.context_builder import ContextBuilder
from services.agent.agent_capability_registry import AgentCapabilityRegistry
from services.agent.action_engine import ActionEngine
from services.agent.risk_engine import RiskEngine

logger = logging.getLogger("verinova.agent.orchestrator")

class AgentOrchestrator:
    @staticmethod
    def run_orchestrated_task(
        task: core_models.Task,
        db: Session,
        current_user: models.User,
        confirm_action_id: Optional[int] = None,
        max_iterations: int = 10,
        max_cost: float = 5.0
    ) -> str:
        # 1. Fetch or Create SQL Plan & Step checkpoints (Section 3 & 4)
        plan_record = db.query(core_models.Plan).filter(
            core_models.Plan.task_id == task.id
        ).first()
        
        if not plan_record:
            # Build context & generate structured plan dict
            ctx = ContextBuilder.build_agent_context(
                user_id=task.user_id,
                task_id=task.id,
                query_text=task.description,
                db=db
            )
            plan_dict = TaskPlanner.plan_task(
                user_goal=task.description,
                conversation_context=ctx.get("short_term_memory", []),
                user_preferences=ctx.get("user_preferences", []),
                security_policy=ctx.get("security_policy", ""),
                automation_policy=json.dumps(ctx.get("automation_policy", {}))
            )
            
            # Save Plan record
            plan_id = f"plan_{uuid.uuid4().hex[:8]}"
            plan_record = core_models.Plan(
                plan_id=plan_id,
                task_id=task.id,
                user_id=task.user_id,
                goal=task.description,
                status="READY",
                estimated_cost=plan_dict.get("estimated_cost", 0.15),
                risk_level=plan_dict.get("risk_level", "LOW")
            )
            db.add(plan_record)
            db.commit()
            
            # Save Plan steps (Section 4)
            for idx, step in enumerate(plan_dict.get("steps", [])):
                tool_id = step.get("tool")
                agent_id = AgentCapabilityRegistry.match_capability(tool_id) or "research_agent"
                step_record = core_models.PlanStep(
                    step_id=f"step_{plan_id}_{idx+1}",
                    plan_id=plan_id,
                    agent_id=agent_id,
                    tool_id=tool_id,
                    description=step.get("description", ""),
                    input_data=step.get("input", {}),
                    dependencies=step.get("dependencies", []),
                    status="PENDING",
                    risk_level=RiskEngine.classify(tool_id) if tool_id else "LOW"
                )
                db.add(step_record)
            db.commit()
            db.refresh(plan_record)
            
        # 2. Check Plan state limits
        if plan_record.status in ("COMPLETED", "FAILED", "CANCELLED"):
            return f"Plan is already in terminal state: {plan_record.status}."
            
        if plan_record.actual_cost >= max_cost:
            plan_record.status = "FAILED"
            db.commit()
            return "Orchestration aborted: Max planning budget exceeded."

        plan_record.status = "RUNNING"
        plan_record.started_at = datetime.utcnow()
        task.execution_status = "RUNNING"
        task.status = "running"
        db.commit()
        
        steps = db.query(core_models.PlanStep).filter(
            core_models.PlanStep.plan_id == plan_record.plan_id
        ).all()
        
        loop_counter = 0
        tool_counts = {}
        
        while loop_counter < max_iterations:
            loop_counter += 1
            
            # Check completion status
            completed_ids = {s.step_id for s in steps if s.status == "COMPLETED"}
            all_steps_done = all(s.status == "COMPLETED" for s in steps)
            if all_steps_done:
                plan_record.status = "COMPLETED"
                task.status = "completed"
                task.execution_status = "COMPLETED"
                break
                
            any_steps_failed = any(s.status == "FAILED" for s in steps)
            if any_steps_failed:
                plan_record.status = "PARTIALLY_COMPLETED"
                task.status = "completed"
                task.execution_status = "PARTIALLY_COMPLETED"
                break
                
            # Filter steps ready to execute (dependencies completed) (Section 5)
            ready_steps = []
            for s in steps:
                if s.status in ("PENDING", "READY"):
                    deps = s.dependencies or []
                    # Map step_number/index dependency to step_id format
                    deps_satisfied = True
                    for d in deps:
                        # Convert simple index like 1 to step_id suffix check
                        matched_dep = False
                        for comp in completed_ids:
                            if comp.endswith(f"_{d}"):
                                matched_dep = True
                                break
                        if not matched_dep:
                            deps_satisfied = False
                            break
                    if deps_satisfied:
                        ready_steps.append(s)
                        
            if not ready_steps:
                # Deadlock detection
                if any(s.status in ("PENDING", "READY") for s in steps):
                    plan_record.status = "FAILED"
                    task.status = "failed"
                    task.execution_status = "FAILED"
                    db.commit()
                    return "Plan execution halted due to deadlock/circular dependencies."
                break
                
            # 3. Parallel step execution where independent (Section 6)
            def execute_single_step(step: core_models.PlanStep) -> core_models.PlanStep:
                step.status = "RUNNING"
                step.started_at = datetime.utcnow()
                step.attempt_count = (step.attempt_count or 0) + 1
                
                # Loop detection (Section 52)
                tool = step.tool_id
                tool_counts[tool] = tool_counts.get(tool, 0) + 1
                if tool_counts[tool] >= 4:
                    step.status = "FAILED"
                    step.error = "Loop limit exceeded: redundant execution."
                    return step
                    
                # Action Confirmation Gate check (Section 15 & 16)
                risk = RiskEngine.classify(tool)
                if risk in ("HIGH", "CRITICAL"):
                    if not confirm_action_id:
                        step.status = "WAITING"
                        plan_record.status = "WAITING"
                        return step
                        
                # Execute action via ActionEngine
                res = ActionEngine.execute_action(
                    user_id=task.user_id,
                    task_id=task.id,
                    tool_id=tool,
                    arguments=step.input_data or {},
                    db=db,
                    confirmation_id=f"conf_{confirm_action_id}" if confirm_action_id else None
                )
                
                if res.get("status") == "COMPLETED":
                    step.status = "COMPLETED"
                    step.output_data = res.get("data", {})
                else:
                    step.status = "FAILED"
                    step.error = res.get("message", "Execution failed")
                    
                step.completed_at = datetime.utcnow()
                return step

            # Run in parallel if safe (independent steps)
            with concurrent.futures.ThreadPoolExecutor() as executor:
                futures = [executor.submit(execute_single_step, rs) for rs in ready_steps]
                completed_steps = [f.result() for f in concurrent.futures.as_completed(futures)]
                
            db.commit()
            
            # Check if any step paused at confirmation gate
            if any(s.status == "WAITING" for s in completed_steps):
                plan_record.status = "WAITING"
                task.status = "running"
                task.execution_status = "WAITING_CONFIRMATION"
                db.commit()
                return "Workflow paused. User confirmation required to proceed."
                
        # Final updates
        plan_record.completed_at = datetime.utcnow()
        db.commit()
        return "Orchestration finished."
