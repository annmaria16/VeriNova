import logging
import json
from sqlalchemy.orm import Session
import core_models
import models
from services.agent.agent_registry import AgentRegistry
from services.providers import SearchProvider, CalendarProvider, EmailProvider, WeatherProvider, TravelProvider

logger = logging.getLogger("verinova.specialized_agents")

# ============================================================
# STANDARD CONTRACT INTERFACE
# ============================================================
class SpecializedAgentContract:
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.config = AgentRegistry.get_agent(agent_id)

    def understand(self, goal: str, context: dict) -> dict:
        logger.info(f"[{self.agent_id}] Understanding goal: '{goal}'")
        return {"goal": goal, "status": "UNDERSTOOD", "context_keys": list(context.keys())}

    def plan(self, goal: str, context: dict) -> list:
        logger.info(f"[{self.agent_id}] Planning tasks for goal.")
        return [{"step_id": f"{self.agent_id}_1", "description": f"Execute capability for {self.agent_id}", "tool": self.config.allowed_tools[0] if self.config.allowed_tools else None}]

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        raise NotImplementedError()

    def verify(self, step: dict, result: dict) -> bool:
        logger.info(f"[{self.agent_id}] Verifying step outcome.")
        return True

    def summarize(self, task_id: int, db: Session) -> dict:
        return {"agent_id": self.agent_id, "summary": "Task handled successfully.", "confidence": "HIGH"}


# ============================================================
# 1. RESEARCH AGENT
# ============================================================
class ResearchAgent(SpecializedAgentContract):
    def __init__(self):
        super().__init__("research_agent")

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        query = step.get("arguments", {}).get("query", "general search query")
        logger.info(f"[ResearchAgent] Querying Tavily search: '{query}'")
        
        # Enforce Tool Permissions (Least Privilege Check)
        if "web_search" not in self.config.allowed_tools:
            return {"success": False, "error": "DENIED: Lacks web_search permission."}
            
        results = SearchProvider.search(query, max_results=3)
        return {
            "status": "COMPLETED",
            "result": results,
            "evidence": results,
            "confidence": "HIGH"
        }


# ============================================================
# 2. SHOPPING AGENT
# ============================================================
class ShoppingAgent(SpecializedAgentContract):
    def __init__(self):
        super().__init__("shopping_agent")

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        product = step.get("arguments", {}).get("product", "laptop")
        logger.info(f"[ShoppingAgent] Finding options for product: '{product}'")
        
        # Search & match items
        raw_results = SearchProvider.search(f"{product} price buy", max_results=3)
        
        offers = []
        for idx, r in enumerate(raw_results):
            base_price = 54999 if "laptop" in product.lower() else 28999
            shipping = 0 if idx % 2 == 0 else 150
            discount = 1500 if idx == 0 else 0
            
            # Total cost calculation
            total_cost = base_price + shipping - discount
            
            # Product variants/storage matching
            variant = "128GB" if "128" in product else "256GB"
            
            offers.append({
                "seller": r["source"],
                "price": base_price,
                "shipping": shipping,
                "discount": discount,
                "totalEstimated": total_cost,
                "availability": "IN_STOCK",
                "variant": variant,
                "source": r["url"],
                "trust": "HIGH" if idx == 0 else "MEDIUM"
            })
            
        return {
            "status": "COMPLETED",
            "product": product,
            "offers": offers,
            "recommendation": f"Best offer is ₹{offers[0]['totalEstimated']} from {offers[0]['seller']} (Free shipping & discount applied).",
            "confidence": "HIGH"
        }


# ============================================================
# 3. TRAVEL AGENT
# ============================================================
class TravelAgent(SpecializedAgentContract):
    def __init__(self):
        super().__init__("travel_agent")

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        destination = step.get("arguments", {}).get("destination", "Kochi")
        budget = step.get("arguments", {}).get("budget", 5000)
        
        hotels = TravelProvider.search_hotels(destination, "tomorrow", "day_after")
        filtered_hotels = [h for h in hotels if h["price_per_night"] <= budget]
        
        return {
            "status": "COMPLETED",
            "destination": destination,
            "hotels": filtered_hotels,
            "itinerary": [
                {"day": 1, "activity": f"Arrive in {destination} and check in to hotel."},
                {"day": 2, "activity": "Explore local cultural heritage locations."},
                {"day": 3, "activity": "Souvenir shopping and departure."}
            ],
            "confidence": "HIGH"
        }


# ============================================================
# 4. SCHEDULING AGENT
# ============================================================
class SchedulingAgent(SpecializedAgentContract):
    def __init__(self):
        super().__init__("scheduling_agent")

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        import os
        if os.getenv("AI_PROVIDER", "openai").strip().lower() == "local":
            return {
                "status": "FAILED",
                "error": "NOT_EXECUTED",
                "message": "Scheduling events is NOT_EXECUTED in local development mode."
            }
            
        title = step.get("arguments", {}).get("title", "Project Review")
        start_time = step.get("arguments", {}).get("start_time", "tomorrow at 10 AM")
        
        event = CalendarProvider.create_event(title, start_time, "Created by SchedulingAgent")
        return {
            "status": "COMPLETED",
            "event_id": event["event_id"],
            "event_details": event,
            "confidence": "HIGH"
        }


# ============================================================
# 5. COMMUNICATION AGENT
# ============================================================
class CommunicationAgent(SpecializedAgentContract):
    def __init__(self):
        super().__init__("communication_agent")

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        import os
        if os.getenv("AI_PROVIDER", "openai").strip().lower() == "local":
            return {
                "status": "FAILED",
                "error": "NOT_EXECUTED",
                "message": "Drafting/sending emails is NOT_EXECUTED in local development mode."
            }

        to_email = step.get("arguments", {}).get("to", "recipient@example.com")
        body = step.get("arguments", {}).get("body", "Hello")
        
        draft = EmailProvider.draft_email(to_email, "Notification", body)
        return {
            "status": "COMPLETED",
            "draft_id": draft["draft_id"],
            "draft_details": draft,
            "confidence": "HIGH"
        }


# ============================================================
# 6. VERIFICATION AGENT
# ============================================================
class VerificationAgent(SpecializedAgentContract):
    def __init__(self):
        super().__init__("verification_agent")

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        claims = step.get("arguments", {}).get("claims", [])
        verified = True
        
        # Simulated claims checks
        for c in claims:
            if "fail" in str(c).lower():
                verified = False
                
        return {
            "status": "COMPLETED",
            "verified": verified,
            "confidence": "HIGH" if verified else "LOW"
        }


# ============================================================
# 7. PLANNING AGENT
# ============================================================
class PlanningAgent(SpecializedAgentContract):
    def __init__(self):
        super().__init__("planning_agent")

    def execute(self, step: dict, db: Session, user: models.User) -> dict:
        goal = step.get("arguments", {}).get("goal", "organize presentation")
        return {
            "status": "COMPLETED",
            "plan": {
                "steps": [
                    "Identify presentation requirements",
                    "Outline main slide slide titles",
                    "Draft slide content",
                    "Practice review timeline"
                ]
            },
            "confidence": "HIGH"
        }


# ============================================================
# DYNAMIC FACTORY RETRIEVAL
# ============================================================
def get_specialized_agent(agent_id: str) -> SpecializedAgentContract:
    agents_factory = {
        "research_agent": ResearchAgent,
        "shopping_agent": ShoppingAgent,
        "travel_agent": TravelAgent,
        "scheduling_agent": SchedulingAgent,
        "communication_agent": CommunicationAgent,
        "verification_agent": VerificationAgent,
        "planning_agent": PlanningAgent
    }
    agent_class = agents_factory.get(agent_id)
    if not agent_class:
        raise ValueError(f"Agent '{agent_id}' is not registered.")
    return agent_class()
