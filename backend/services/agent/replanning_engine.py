import logging
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
import core_models
from services.agent.agent_capability_registry import AgentCapabilityRegistry

logger = logging.getLogger("verinova.agent.replanning")

class ReplanningEngine:
    @staticmethod
    def replan_failed_step(
        plan_id: str,
        failed_step_id: str,
        failure_reason: str,
        db: Session
    ) -> bool:
        logger.info(f"Initiating replanning for Plan: {plan_id}, Failed Step: {failed_step_id}. Reason: {failure_reason}")
        
        # 1. Fetch current plan steps
        steps = db.query(core_models.PlanStep).filter(
            core_models.PlanStep.plan_id == plan_id
        ).all()
        
        failed_step = next((s for s in steps if s.step_id == failed_step_id), None)
        if not failed_step:
            logger.warning(f"Failed step {failed_step_id} not found in plan database.")
            return False
            
        # 2. Check if fallback exists
        # E.g. If Amazon failed, fallback to Flipkart
        current_tool = failed_step.tool_id
        fallback_tool = None
        if current_tool == "search_products_amazon":
            fallback_tool = "search_products_flipkart"
        elif current_tool == "search_products":
            fallback_tool = "search_products_fallback"
            
        # Find highest plan version so far
        last_revision = db.query(core_models.PlanRevision).filter(
            core_models.PlanRevision.plan_id == plan_id
        ).order_by(core_models.PlanRevision.plan_version.desc()).first()
        
        next_version = (last_revision.plan_version + 1) if last_revision else 2
        
        # 3. Apply changes and create a PlanRevision record (Section 20)
        if fallback_tool:
            # Change tool to fallback
            failed_step.tool_id = fallback_tool
            failed_step.description = f"Fallback query using {fallback_tool}"
            failed_step.status = "PENDING"
            failed_step.attempt_count = 0
            
            revision = core_models.PlanRevision(
                plan_id=plan_id,
                plan_version=next_version,
                reason=f"Replaced failed tool '{current_tool}' with fallback '{fallback_tool}'.",
                changed_steps={"step_id": failed_step_id, "new_tool": fallback_tool}
            )
            db.add(revision)
            db.commit()
            logger.info(f"Replanning successful: replaced with fallback tool '{fallback_tool}'.")
            return True
            
        # No fallback tool: mark failed step as blocked/re-plan to human escalation (Section 46)
        escalation_id = f"esc_{uuid.uuid4().hex[:8]}"
        esc = core_models.HumanEscalation(
            escalation_id=escalation_id,
            task_id=failed_step.plan_id,  # Link to task/plan id
            status="OPEN",
            reason=f"Workflow step '{failed_step.description}' failed with reason: {failure_reason}."
        )
        db.add(esc)
        
        failed_step.status = "FAILED"
        revision = core_models.PlanRevision(
            plan_id=plan_id,
            plan_version=next_version,
            reason=f"Failed permanently. Escalated to human operator with ID: {escalation_id}.",
            changed_steps={"step_id": failed_step_id, "action": "ESCALATED"}
        )
        db.add(revision)
        db.commit()
        logger.info(f"No fallback tool available. Escalated task step to human: {escalation_id}")
        return False
