import logging
from typing import Optional
from pydantic import BaseModel, Field
from services.agent.tool_registry import register_tool
from services.providers import CalendarProvider

logger = logging.getLogger("verinova.tools.calendar")

class CalendarEventInput(BaseModel):
    title: str = Field(..., description="The title of the reminder or calendar event.")
    start_time: str = Field(..., description="The time of the event (e.g., ISO timestamp or human text 'tomorrow at 10 AM').")
    description: Optional[str] = Field(None, description="Optional notes context for the calendar reminder.")

@register_tool(
    name="create_calendar_event",
    description="Set calendar reminder alerts and organize calendar events.",
    input_schema=CalendarEventInput,
    risk_level="LOW",
    requires_auth=False
)
def create_calendar_event(title: str, start_time: str, description: Optional[str] = None) -> dict:
    event = CalendarProvider.create_event(title, start_time, description or "")
    # Post-action verification: check event state matches
    verified = CalendarProvider.verify_event(event["event_id"])
    return {
        "success": True,
        "event_id": event["event_id"],
        "title": event["title"],
        "start_time": event["start_time"],
        "status": "CREATED_AND_VERIFIED" if verified else "CREATED",
        "verification": {
            "verified": verified,
            "state_checked": "calendar_sync_successful"
        }
    }
