from pydantic import BaseModel, Field
from services.agent.tool_registry import register_tool
from services.providers import WeatherProvider, MapsProvider

# ============================================================
# WEATHER TOOL
# ============================================================
class WeatherLookupInput(BaseModel):
    location: str = Field(..., description="The city or location to search weather for (e.g. 'Kochi').")
    date: str = Field("tomorrow", description="The date or time window for the forecast.")

@register_tool(
    name="weather_lookup",
    description="Retrieve weather forecast details for a specific city.",
    input_schema=WeatherLookupInput,
    risk_level="READ_ONLY",
    requires_auth=False
)
def weather_lookup(location: str, date: str = "tomorrow") -> dict:
    try:
        data = WeatherProvider.get_weather(location, date)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================
# MAPS TOOLS
# ============================================================
class RouteSearchInput(BaseModel):
    origin: str = Field(..., description="Start location name.")
    destination: str = Field(..., description="End destination name.")

@register_tool(
    name="route_search",
    description="Retrieve navigation routes between two locations.",
    input_schema=RouteSearchInput,
    risk_level="READ_ONLY",
    requires_auth=False
)
def route_search(origin: str, destination: str) -> dict:
    try:
        route = MapsProvider.route(origin, destination)
        dist = MapsProvider.distance(origin, destination)
        time_est = MapsProvider.travel_time(origin, destination)
        return {
            "success": True,
            "data": {
                "origin": origin,
                "destination": destination,
                "distance": dist,
                "travel_time": time_est,
                "directions": route
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
