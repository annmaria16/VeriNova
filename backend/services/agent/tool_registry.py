from pydantic import BaseModel
from typing import Callable, Type, Dict, Any, List

class Tool(BaseModel):
    name: str
    description: str
    input_schema: Type[BaseModel]
    func: Callable
    risk_level: str = "LOW"
    requires_auth: bool = False
    
    # Extended properties for Phase 5 registry format
    version: str = "1.0.0"
    inputSchema: dict = {}
    outputSchema: dict = {}
    permissions: list = []
    riskLevel: str = "LOW_RISK"
    enabled: bool = True

    class Config:
        arbitrary_types_allowed = True

_registry: Dict[str, Tool] = {}

def register_tool(
    name: str,
    description: str,
    input_schema: Type[BaseModel],
    risk_level: str = "LOW",
    requires_auth: bool = False,
    version: str = "1.0.0",
    permissions: list = None,
    enabled: bool = True
):
    def decorator(func: Callable):
        # Determine risk mapping
        risk_level_map = {
            "LOW": "LOW_RISK",
            "MEDIUM": "MEDIUM_RISK",
            "HIGH": "HIGH_RISK",
            "CRITICAL": "CRITICAL",
            "READ_ONLY": "READ_ONLY"
        }
        r_level = risk_level_map.get(risk_level.upper(), "LOW_RISK")
        
        tool = Tool(
            name=name,
            description=description,
            input_schema=input_schema,
            func=func,
            risk_level=risk_level,
            requires_auth=requires_auth,
            version=version,
            inputSchema=input_schema.schema() if hasattr(input_schema, "schema") else {},
            outputSchema={"type": "object", "properties": {"success": {"type": "boolean"}}},
            permissions=permissions or ([] if risk_level.upper() in ("LOW", "READ_ONLY") else [name.lower()]),
            riskLevel=r_level,
            enabled=enabled
        )
        _registry[name] = tool
        return func
    return decorator

def get_tool(name: str) -> Tool:
    return _registry.get(name)

def list_tools() -> List[Tool]:
    return list(_registry.values())
