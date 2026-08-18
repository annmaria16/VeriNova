import os
import json
import urllib.request
import urllib.error
import logging

logger = logging.getLogger("verinova.openai")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

class OpenAIServiceError(Exception):
    pass

def call_openai_chat(
    messages: list,
    response_format: dict = None,
    model: str = None,
    task_id: int = None,
    user_id: int = None,
    db = None
) -> dict:
    if not OPENAI_API_KEY:
        raise OpenAIServiceError("OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.")

    # 1. Resolve model routing (cheaper/standard/stronger)
    target_model = model or OPENAI_MODEL
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }

    payload = {
        "model": target_model,
        "messages": messages
    }
    if response_format:
        payload["response_format"] = response_format

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = response.read().decode("utf-8")
            res_json = json.loads(res_data)
            
            # Log cost & usage
            _record_cost_metrics(target_model, res_json, task_id, user_id, db)
            return res_json
            
    except Exception as e:
        logger.error(f"OpenAI API Primary Model '{target_model}' failed: {str(e)}")
        
        # 2. Model Fallback Routine: Fallback from gpt-4o to standard gpt-4o-mini
        if target_model != "gpt-4o-mini":
            logger.info("Retrying query with fallback model: gpt-4o-mini")
            payload["model"] = "gpt-4o-mini"
            try:
                fallback_req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
                with urllib.request.urlopen(fallback_req, timeout=30) as response:
                    res_data = response.read().decode("utf-8")
                    res_json = json.loads(res_data)
                    _record_cost_metrics("gpt-4o-mini", res_json, task_id, user_id, db)
                    return res_json
            except Exception as fe:
                logger.error(f"OpenAI Fallback model also failed: {str(fe)}")
        
        raise OpenAIServiceError("AI service unavailable.")


def _record_cost_metrics(model_name: str, response_json: dict, task_id: int, user_id: int, db):
    if not db:
        return
        
    usage = response_json.get("usage", {})
    input_tokens = usage.get("prompt_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0)
    
    # Calculate costs:
    # gpt-4o-mini: Input: $0.15/M, Output: $0.60/M
    # gpt-4o: Input: $5.00/M, Output: $15.00/M
    if "gpt-4o-mini" in model_name:
        cost = (input_tokens * 0.15 / 1000000) + (output_tokens * 0.60 / 1000000)
    elif "gpt-4o" in model_name:
        cost = (input_tokens * 5.00 / 1000000) + (output_tokens * 15.00 / 1000000)
    else:
        cost = (input_tokens * 0.15 / 1000000) + (output_tokens * 0.60 / 1000000)
        
    try:
        import core_models
        cost_record = core_models.AiCostLog(
            task_id=task_id,
            user_id=user_id,
            model=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=cost
        )
        db.add(cost_record)
        
        # Log to Phase 6 model_usages table
        model_usage = core_models.ModelUsage(
            task_id=task_id,
            model_name=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost
        )
        db.add(model_usage)
        
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record AI cost log metrics: {str(e)}")

