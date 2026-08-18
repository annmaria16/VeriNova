import os
import logging

logger = logging.getLogger("verinova.model_router")

class ModelRouter:
    @staticmethod
    def route_model(task_type: str, contains_sensitive_data: bool = False) -> str:
        # Prevent routing sensitive data to external or untrusted providers (Section 49)
        if contains_sensitive_data:
            logger.info("Sensitive data detected. Routing to private local instance / gpt-4-private.")
            return "gpt-4-private"
            
        # Model Selection logic (Section 48)
        task_type_lower = task_type.lower()
        if "planning" in task_type_lower or "reasoning" in task_type_lower or "compare" in task_type_lower:
            # High-capability reasoning model
            logger.info(f"Complex task type '{task_type}' mapped to gpt-4-turbo.")
            return "gpt-4-turbo"
        elif "summariz" in task_type_lower or "summary" in task_type_lower or "classification" in task_type_lower:
            # Low-cost efficient model
            logger.info(f"Summarization/classification task type '{task_type}' mapped to gpt-3.5-turbo.")
            return "gpt-3.5-turbo"
        else:
            # Default general model
            logger.info(f"General task type '{task_type}' mapped to gpt-4.")
            return "gpt-4"
