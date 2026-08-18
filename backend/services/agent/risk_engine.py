import logging
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.risk_engine")

class RiskEngine:
    @staticmethod
    def classify(tool_name: str) -> str:
        tool_lower = (tool_name or "").lower()
        
        # LOW TIER: search, weather lookup, maps, public info
        if tool_lower in ("web_search", "web_fetch", "price_compare", "compare_shopping_offers", "weather", "weather_lookup", "maps", "route_search"):
            return "LOW"
            
        # MEDIUM TIER: save preferences, reminders, drafting email
        elif tool_lower in ("draft_email", "manage_user_memory", "create_reminder"):
            return "MEDIUM"
            
        # HIGH TIER: send email, create calendar event, make reservation
        elif tool_lower in ("send_email", "create_calendar_event", "execute_booking", "booking"):
            return "HIGH"
            
        # CRITICAL TIER: purchase, payments, financial transactions
        elif tool_lower in ("execute_purchase", "purchase", "payment", "delete_account"):
            return "CRITICAL"
            
        return "LOW"

class ActionRiskEngine:
    @staticmethod
    def classify_action(tool_name: str) -> str:
        # Keep Phase 5 compatibility
        risk = RiskEngine.classify(tool_name)
        mapping = {
            "LOW": "LOW_RISK",
            "MEDIUM": "MEDIUM_RISK",
            "HIGH": "HIGH_RISK",
            "CRITICAL": "CRITICAL"
        }
        return mapping.get(risk, "LOW_RISK")

    @staticmethod
    def is_confirmation_required(user_id: int, tool_name: str, db: Session) -> bool:
        risk = RiskEngine.classify(tool_name)
        if risk == "LOW":
            return False
            
        settings = db.query(core_models.AutomationSetting).filter(
            core_models.AutomationSetting.user_id == user_id
        ).first()
        
        if not settings:
            return True
            
        if risk == "MEDIUM":
            return not settings.allow_email and not settings.allow_booking
        elif risk == "HIGH":
            return not settings.allow_email and not settings.allow_booking
        elif risk == "CRITICAL":
            return not settings.allow_purchase
            
        return True
