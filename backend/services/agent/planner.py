import json
import logging
from typing import Optional
from services.openai_service import OpenAIServiceError
from services.agent.ai_provider import get_active_provider

logger = logging.getLogger("verinova.agent.planner")

def normalize_tool_name(tool_name: str, registered_names: list) -> str:
    t = tool_name.strip().lower()
    if t in registered_names:
        return t
        
    mappings = {
        "fetch_webpage": "web_fetch",
        "fetch_url": "web_fetch",
        "webpage_fetch": "web_fetch",
        "fetch": "web_fetch",
        "get_webpage": "web_fetch",
        "search_web": "web_search",
        "google_search": "web_search",
        "search": "web_search",
        "duckduckgo_search": "web_search",
        "tavily_search": "web_search",
        "compare_offers": "compare_shopping_offers",
        "compare_products": "compare_products",
        "laptop_comparison": "compare_products",
        "product_comparison": "compare_products"
    }
    
    mapped = mappings.get(t)
    if mapped and mapped in registered_names:
        return mapped
        
    for registered in registered_names:
        if t in registered or registered in t:
            return registered
            
    return tool_name

def detect_cycle(steps: list) -> bool:
    graph = {}
    for s in steps:
        step_id = s.get("step_id")
        deps = s.get("dependencies", [])
        graph[step_id] = deps
        
    visited = set()
    rec_stack = set()
    
    def dfs(node):
        visited.add(node)
        rec_stack.add(node)
        
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True
                
        rec_stack.remove(node)
        return False
        
    for step in steps:
        step_id = step.get("step_id")
        if step_id not in visited:
            if dfs(step_id):
                return True
    return False

def validate_plan(plan_data: dict, registered_names: list) -> Optional[str]:
    steps = plan_data.get("steps", [])
    if not steps:
        return "Plan has no steps or empty steps list."
        
    for idx, step in enumerate(steps):
        step["step_id"] = step.get("step_number", idx + 1)
        if "dependencies" not in step:
            step["dependencies"] = []
        if "status" not in step:
            step["status"] = "PENDING"
            
        tool = step.get("tool", "")
        if not tool:
            return f"Step {step.get('step_id')} is missing 'tool' attribute."
            
        normalized = normalize_tool_name(tool, registered_names)
        if normalized in registered_names:
            step["tool"] = normalized
        else:
            return f"Tool '{tool}' in Step {step.get('step_id')} is not registered."
            
    if detect_cycle(steps):
        return "Dependency cycle detected in step execution plan."
        
    return None

class TaskPlanner:
    @staticmethod
    def plan_task(
        user_goal: str,
        conversation_context: list = None,
        user_preferences: list = None,
        available_tools: list = None,
        security_policy: str = "",
        automation_policy: str = ""
    ) -> dict:
        try:
            from services.agent.executor import list_tools
            registered_names = [t.name for t in list_tools()]
        except Exception as ex:
            logger.warning(f"Could not load registered tool names: {ex}")
            registered_names = []

        try:
            provider = get_active_provider()
            plan_data = provider.plan(
                user_goal=user_goal,
                conversation_context=conversation_context,
                user_preferences=user_preferences,
                available_tools=available_tools,
                security_policy=security_policy,
                automation_policy=automation_policy
            )
            
            validation_error = validate_plan(plan_data, registered_names)
            
            # Controlled Repair Attempt
            if validation_error:
                logger.warning(f"Plan validation failed: {validation_error}. Attempting self-repair...")
                repair_goal = (
                    f"{user_goal}\n\n"
                    f"IMPORTANT REPAIR REQUIREMENT:\n"
                    f"Your previous plan failed validation with error: {validation_error}\n"
                    f"You must generate a corrected, valid plan. Ensure all tools are selected from the available registry and no dependency cycles exist."
                )
                plan_data = provider.plan(
                    user_goal=repair_goal,
                    conversation_context=conversation_context,
                    user_preferences=user_preferences,
                    available_tools=available_tools,
                    security_policy=security_policy,
                    automation_policy=automation_policy
                )
                validation_error = validate_plan(plan_data, registered_names)
                
            if validation_error:
                logger.error(f"Plan repair failed. Final validation error: {validation_error}")
                raise ValueError(f"Invalid plan generated: {validation_error}")
                
            return plan_data
        except Exception as e:
            logger.error(f"Error generating plan: {str(e)}")
            raise

def generate_plan(task_description: str) -> dict:
    return TaskPlanner.plan_task(user_goal=task_description)
