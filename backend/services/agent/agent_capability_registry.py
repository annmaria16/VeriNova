import logging
from typing import Optional

logger = logging.getLogger("verinova.agent_registry")

class AgentCapabilityRegistry:
    # Map Agent -> List of allowed capability tools (Section 27)
    REGISTRY = {
        "shopping_agent": ["search_products", "compare_products", "execute_purchase"],
        "travel_agent": ["search_flights", "search_hotels", "execute_booking"],
        "calendar_agent": ["read_calendar", "create_calendar_event"],
        "email_agent": ["draft_email", "send_email", "simulate_connection_failure"],
        "research_agent": ["web_search", "weather_search"],
    }
    
    @classmethod
    def match_capability(cls, tool_id: str) -> Optional[str]:
        # Return correct agent supporting target capability (Section 28)
        for agent_id, tools in cls.REGISTRY.items():
            if tool_id in tools:
                return agent_id
        return None
        
    @classmethod
    def is_substitution_valid(cls, orig_agent_id: str, new_agent_id: str) -> bool:
        # Prevent blind substitutions (Section 26)
        if orig_agent_id == new_agent_id:
            return True
        # Only allow substitution if capability boundaries are comparable/intersecting
        orig_capabilities = set(cls.REGISTRY.get(orig_agent_id, []))
        new_capabilities = set(cls.REGISTRY.get(new_agent_id, []))
        return len(orig_capabilities.intersection(new_capabilities)) > 0
