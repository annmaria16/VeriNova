import os
import json
import urllib.request
import urllib.parse
import logging
from pydantic import BaseModel, Field
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.search_tool")

class SearchWebInput(BaseModel):
    query: str = Field(..., description="The query to search the web for.")

@register_tool(
    name="search_web",
    description="Search the web for up-to-date public information, returning a success flag and search results.",
    input_schema=SearchWebInput
)
def search_web(query: str) -> dict:
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        return {
            "success": False,
            "query": query,
            "results": [],
            "error": "Search provider not configured. Please set the TAVILY_API_KEY environment variable on the backend."
        }

    url = "https://api.tavily.com/search"
    headers = {"Content-Type": "application/json"}
    payload = {
        "api_key": api_key,
        "query": query,
        "include_answer": False,
        "max_results": 5
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            results = []
            for item in res_data.get("results", []):
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", "")
                })
            return {
                "success": True,
                "query": query,
                "results": results
            }
    except Exception as e:
        logger.error(f"Search web Tavily API call failed: {str(e)}")
        return {
            "success": False,
            "query": query,
            "results": [],
            "error": f"Search execution failed: {str(e)}"
        }
