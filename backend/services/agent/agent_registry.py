import logging
from typing import Dict, List, Optional
from pydantic import BaseModel

logger = logging.getLogger("verinova.agent_registry")

class AgentCapabilitySchema(BaseModel):
    capability_id: str
    agent_id: str
    name: str
    description: str
    input_schema: dict
    output_schema: dict
    required_tools: List[str]
    risk_level: str = "LOW"

class AgentRegistrySchema(BaseModel):
    agent_id: str
    name: str
    description: str
    version: str = "1.0.0"
    capabilities: List[AgentCapabilitySchema]
    allowed_tools: List[str]
    risk_policy: str = "LOW"
    enabled: bool = True
    configuration: dict = {}

class AgentRegistry:
    _agents: Dict[str, AgentRegistrySchema] = {}

    @classmethod
    def register_agent(cls, agent: AgentRegistrySchema):
        cls._agents[agent.agent_id] = agent
        logger.info(f"Registered Agent: {agent.name} (ID: {agent.agent_id}) with version {agent.version}.")

    @classmethod
    def get_agent(cls, agent_id: str) -> Optional[AgentRegistrySchema]:
        return cls._agents.get(agent_id)

    @classmethod
    def list_agents(cls) -> List[AgentRegistrySchema]:
        return list(cls._agents.values())

# Define initial specialized agent capability schemas
def init_agent_registry():
    # 1. ResearchAgent
    AgentRegistry.register_agent(AgentRegistrySchema(
        agent_id="research_agent",
        name="ResearchAgent",
        description="Handles web search, fact extraction, source comparison and summarization.",
        capabilities=[
            AgentCapabilitySchema(
                capability_id="web_research",
                agent_id="research_agent",
                name="web research",
                description="Performs broad search query lookups",
                input_schema={"query": "string"},
                output_schema={"results": "array"},
                required_tools=["web_search", "web_fetch"]
            )
        ],
        allowed_tools=["web_search", "web_fetch"],
        configuration={"max_iterations": 3}
    ))

    # 2. ShoppingAgent
    AgentRegistry.register_agent(AgentRegistrySchema(
        agent_id="shopping_agent",
        name="ShoppingAgent",
        description="Supports product search, match normalizations, and total-cost comparison rankings.",
        capabilities=[
            AgentCapabilitySchema(
                capability_id="product_compare",
                agent_id="shopping_agent",
                name="product matching and comparison",
                description="Compares options for best overall value",
                input_schema={"product": "string"},
                output_schema={"offers": "array"},
                required_tools=["web_search", "web_fetch", "price_compare", "compare_shopping_offers"]
            )
        ],
        allowed_tools=["web_search", "web_fetch", "price_compare", "compare_shopping_offers"],
        configuration={"max_iterations": 5}
    ))

    # 3. TravelAgent
    AgentRegistry.register_agent(AgentRegistrySchema(
        agent_id="travel_agent",
        name="TravelAgent",
        description="Coordinates hotel search, transport research, itinerary building, and hotel availability checks.",
        capabilities=[
            AgentCapabilitySchema(
                capability_id="trip_planner",
                agent_id="travel_agent",
                name="itinerary and lodging planner",
                description="Drafts schedules and finds rooms",
                input_schema={"destination": "string"},
                output_schema={"hotels": "array", "flights": "array"},
                required_tools=["web_search", "web_fetch", "weather_lookup"]
            )
        ],
        allowed_tools=["web_search", "web_fetch", "weather_lookup"],
        configuration={}
    ))

    # 4. SchedulingAgent
    AgentRegistry.register_agent(AgentRegistrySchema(
        agent_id="scheduling_agent",
        name="SchedulingAgent",
        description="Coordinates calendar availability checks, event creation, and updates.",
        capabilities=[
            AgentCapabilitySchema(
                capability_id="calendar_manage",
                agent_id="scheduling_agent",
                name="calendar management",
                description="Creates and cancels event reminders",
                input_schema={"title": "string", "start_time": "string"},
                output_schema={"event_id": "string"},
                required_tools=["create_calendar_event"]
            )
        ],
        allowed_tools=["create_calendar_event"],
        configuration={}
    ))

    # 5. CommunicationAgent
    AgentRegistry.register_agent(AgentRegistrySchema(
        agent_id="communication_agent",
        name="CommunicationAgent",
        description="Handles email draft composition, replies generation, and sending.",
        capabilities=[
            AgentCapabilitySchema(
                capability_id="email_send",
                agent_id="communication_agent",
                name="email communications",
                description="Drafts and sends message notifications",
                input_schema={"to": "string", "body": "string"},
                output_schema={"draft_id": "string"},
                required_tools=["draft_email", "send_email"]
            )
        ],
        allowed_tools=["draft_email", "send_email"],
        configuration={}
    ))

    # 6. VerificationAgent
    AgentRegistry.register_agent(AgentRegistrySchema(
        agent_id="verification_agent",
        name="VerificationAgent",
        description="Verifies claims against evidence database files, consistency checks, and source freshness validations.",
        capabilities=[
            AgentCapabilitySchema(
                capability_id="claims_verification",
                agent_id="verification_agent",
                name="claims verification",
                description="Evaluates data discrepancy points",
                input_schema={"claims": "array"},
                output_schema={"verified": "boolean"},
                required_tools=["verify_claim"]
            )
        ],
        allowed_tools=["verify_claim"],
        configuration={}
    ))

    # 7. PlanningAgent
    AgentRegistry.register_agent(AgentRegistrySchema(
        agent_id="planning_agent",
        name="PlanningAgent",
        description="Deconstructs vague user objectives into modular sequential plans.",
        capabilities=[
            AgentCapabilitySchema(
                capability_id="task_deconstruct",
                agent_id="planning_agent",
                name="task deconstruction",
                description="Creates plans",
                input_schema={"goal": "string"},
                output_schema={"plan": "object"},
                required_tools=[]
            )
        ],
        allowed_tools=[],
        configuration={}
    ))

# Seed registry on initialization
init_agent_registry()
