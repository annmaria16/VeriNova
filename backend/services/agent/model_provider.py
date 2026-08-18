import logging
from services.agent.ai_provider import get_active_provider

logger = logging.getLogger("verinova.model_provider")

class ModelProvider:
    @staticmethod
    def get_model_for_task(task_type: str) -> str:
        # Dynamic routing rules:
        # Complex planning or critical operations -> gpt-4o
        # Simple retrieval, research, or structured inputs -> gpt-4o-mini
        task_lower = (task_type or "").lower()
        if any(x in task_lower for x in ("compare", "shopping", "booking", "verify", "critical")):
            return "gpt-4o"
        return "gpt-4o-mini"

    @staticmethod
    def call_model(
        messages: list,
        task_type: str,
        response_format: dict = None,
        task_id: int = None,
        user_id: int = None,
        db = None
    ) -> dict:
        model = ModelProvider.get_model_for_task(task_type)
        logger.info(f"Routing request to model: '{model}' based on task type: '{task_type}'")
        
        provider = get_active_provider()
        return provider.generate(
            messages=messages,
            response_format=response_format,
            task_id=task_id,
            user_id=user_id,
            db=db
        )
