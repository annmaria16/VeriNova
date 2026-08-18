import logging
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.security.rbac")

# Standard role mapping permissions (Least Privilege Section 7 & 8)
ROLE_PERMISSIONS = {
    "OWNER": ["*"],
    "ADMIN": ["organization:update", "members:read", "members:invite", "members:remove", "teams:create", "teams:update", "projects:create", "projects:read", "agents:run", "agents:manage", "workflows:create", "workflows:run", "verification:run", "integrations:manage", "api_keys:manage", "billing:read", "audit:read", "analytics:read", "policies:manage"],
    "MANAGER": ["members:read", "teams:create", "teams:update", "projects:read", "agents:run", "workflows:run", "verification:run", "analytics:read"],
    "MEMBER": ["projects:read", "agents:run", "workflows:run", "verification:run"],
    "VIEWER": ["projects:read"],
    "DEVELOPER": ["projects:read", "agents:run", "workflows:create", "workflows:run", "api_keys:manage"],
    "AUDITOR": ["audit:read", "analytics:read"]
}

class RBACService:
    @staticmethod
    def has_permission(
        user_id: int,
        org_id: int,
        permission: str,
        db: Session
    ) -> bool:
        # 1. Fetch organization membership
        member = db.query(core_models.OrganizationMember).filter(
            core_models.OrganizationMember.organization_id == org_id,
            core_models.OrganizationMember.user_id == user_id,
            core_models.OrganizationMember.status == "ACTIVE"
        ).first()
        
        if not member:
            logger.warning(f"User {user_id} is not an active member of organization {org_id}.")
            return False
            
        role = member.role_id
        allowed = ROLE_PERMISSIONS.get(role, [])
        
        if "*" in allowed or permission in allowed:
            return True
            
        logger.warning(f"Access Denied: User {user_id} with role '{role}' lacks permission '{permission}'.")
        return False


class PolicyEngine:
    @staticmethod
    def validate_action(
        org_id: int,
        agent_id: str,
        tool_id: str,
        task_cost: float,
        db: Session
    ) -> bool:
        # Load Organization policies (Section 13 & 14)
        policy = db.query(core_models.OrgPolicy).filter(
            core_models.OrgPolicy.organization_id == org_id
        ).first()
        
        if not policy:
            # Default fallback policy if none is created
            return task_cost <= 10.0
            
        # Agent restriction
        if policy.allowed_agents and agent_id not in policy.allowed_agents:
            logger.warning(f"Agent '{agent_id}' is blocked by organization policy.")
            return False
            
        # Tool restriction (Section 16)
        if policy.allowed_tools and tool_id not in policy.allowed_tools:
            logger.warning(f"Tool '{tool_id}' is blocked by organization policy.")
            return False
            
        # Cost enforcement (Section 49)
        if task_cost > policy.max_task_cost:
            logger.warning(f"Task cost {task_cost} exceeds maximum allowed budget {policy.max_task_cost}.")
            return False
            
        return True


class RiskEngine:
    @staticmethod
    def classify_risk(
        action_type: str,
        amount: float = 0.0
    ) -> str:
        # Classify severity thresholds (Section 28 & 29)
        if action_type in ("purchase", "booking") and amount > 10000.0:
            return "CRITICAL"
        elif action_type in ("purchase", "booking", "send_email_external"):
            return "HIGH"
        elif action_type in ("calendar_write", "teams_update"):
            return "MEDIUM"
        return "LOW"
