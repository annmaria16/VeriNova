import logging
import re
import json
from typing import Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import core_models
import models
from services.agent.tool_registry import register_tool
from services.agent.ai_provider import get_active_provider

logger = logging.getLogger("verinova.memory")

def retrieve_relevant_memories(user_id: int, query_text: str, db: Session, agent_id: Optional[str] = None) -> list:
    # 1. Fetch user memory settings
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not getattr(user, "memory_enabled", True):
        logger.info(f"Memory is disabled for user {user_id}. Skipping retrieval.")
        return []

    memories = db.query(core_models.UserMemory).filter(
        core_models.UserMemory.user_id == user_id,
        core_models.UserMemory.status == "ACTIVE"
    ).all()
    
    # 2. Agent-specific memory permissions scope isolation check (Section 34)
    if agent_id:
        scoped_memories = []
        for mem in memories:
            content_lower = mem.content.lower()
            if agent_id == "shopping_agent":
                if any(x in content_lower for x in ("price", "buy", "budget", "brand", "laptop", "phone", "shop")):
                    scoped_memories.append(mem)
            elif agent_id == "travel_agent":
                if any(x in content_lower for x in ("travel", "hotel", "flight", "destination", "trip", "room", "stay")):
                    scoped_memories.append(mem)
            elif agent_id in ("scheduling_agent", "calendar_agent"):
                if any(x in content_lower for x in ("calendar", "meeting", "schedule", "time", "date")):
                    scoped_memories.append(mem)
            else:
                scoped_memories.append(mem)
        memories = scoped_memories
    
    # 3. Simple keyword matching score
    keywords = set(re.findall(r'\w+', query_text.lower()))
    scored_memories = []
    
    from datetime import datetime, timedelta
    for mem in memories:
        mem_words = set(re.findall(r'\w+', mem.content.lower()))
        intersection = keywords.intersection(mem_words)
        
        # Base semantic relevance score
        score = float(len(intersection))
        
        if mem.category == "preference":
            score += 1.0
            
        # Recency boost (within 24 hours)
        time_diff = datetime.utcnow() - mem.created_at
        if time_diff < timedelta(days=1):
            score += 1.5
            
        # Importance boost
        score += getattr(mem, "importance", 1) * 0.5
        
        # Confidence boost
        score += getattr(mem, "confidence", 1.0) * 0.5
        
        scored_memories.append((score, mem))
        
    scored_memories.sort(key=lambda x: x[0], reverse=True)
    
    # Keep only top items up to budget limit (maxMemoryItems = 5)
    selected = [m[1] for m in scored_memories if m[0] > 0 or m[1].category == "preference"][:5]
    
    # Update lastUsedAt timestamp on retrieved records
    for s in selected:
        s.last_used_at = datetime.utcnow()
    db.commit()
    
    return selected


def extract_and_store_memory(user_id: int, user_message: str, db: Session):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not getattr(user, "memory_enabled", True):
        return

    # Call OpenAI to check if message contains long-term preferences
    system_prompt = (
        "You are the VeriNova User Preference Extractor.\n"
        "Analyze the user message and extract long-term preferences, choices, or facts about the user.\n"
        "Categories: preference, short-term, long-term.\n"
        "Return a JSON object in this format:\n"
        "{\n"
        "  \"has_memory\": true,\n"
        "  \"memories\": [\n"
        "    {\"content\": \"User prefers budget hotels near the city center.\", \"category\": \"preference\", \"confidence\": 0.95}\n"
        "  ]\n"
        "}\n"
        "If no preferences are found, set has_memory to false."
    )
    
    try:
        response = get_active_provider().generate([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"User message: {user_message}"}
        ], response_format={"type": "json_object"})
        
        content = json.loads(response["choices"][0]["message"]["content"])
        if content.get("has_memory") and content.get("memories"):
            for m in content["memories"]:
                # Check for duplicates first to prevent inflation
                exists = db.query(core_models.UserMemory).filter(
                    core_models.UserMemory.user_id == user_id,
                    core_models.UserMemory.content == m["content"]
                ).first()
                if not exists:
                    mem = core_models.UserMemory(
                        user_id=user_id,
                        content=m["content"],
                        category=m["category"],
                        confidence=m.get("confidence", 1.0),
                        source="extraction"
                    )
                    db.add(mem)
            db.commit()
    except Exception as e:
        logger.error(f"Failed to extract preferences: {str(e)}")


# ============================================================
# TOOL: MANAGE USER MEMORY
# ============================================================

class ManageMemoryInput(BaseModel):
    operation: str = Field(..., description="The operation to perform ('view', 'delete', 'clear_all').")
    memory_id: Optional[int] = Field(None, description="The specific memory ID to delete.")
    content_query: Optional[str] = Field(None, description="Keyword query to match memories to delete.")

@register_tool(
    name="manage_user_memory",
    description="Manage or clear elements of your personal preferences and memory.",
    input_schema=ManageMemoryInput,
    risk_level="LOW",
    requires_auth=True
)
def manage_user_memory(operation: str, memory_id: Optional[int] = None, content_query: Optional[str] = None, db: Session = None, current_user: models.User = None) -> dict:
    if not db or not current_user:
        raise RuntimeError("Missing database session or authenticated user identity.")

    if operation == "view":
        memories = db.query(core_models.UserMemory).filter(core_models.UserMemory.user_id == current_user.id).all()
        return {
            "success": True,
            "memories": [
                {"id": m.id, "content": m.content, "category": m.category, "confidence": m.confidence}
                for m in memories
            ]
        }
        
    elif operation == "delete":
        if memory_id:
            db.query(core_models.UserMemory).filter(
                core_models.UserMemory.user_id == current_user.id,
                core_models.UserMemory.id == memory_id
            ).delete()
            db.commit()
            return {"success": True, "message": f"Memory #{memory_id} deleted."}
            
        elif content_query:
            # Query match content
            matched = db.query(core_models.UserMemory).filter(
                core_models.UserMemory.user_id == current_user.id,
                core_models.UserMemory.content.like(f"%{content_query}%")
            ).all()
            count = len(matched)
            for m in matched:
                db.delete(m)
            db.commit()
            return {"success": True, "message": f"Deleted {count} memories matching '{content_query}'."}
        return {"success": False, "error": "Must provide memory_id or content_query to delete."}
        
    elif operation == "clear_all":
        db.query(core_models.UserMemory).filter(core_models.UserMemory.user_id == current_user.id).delete()
        db.commit()
        return {"success": True, "message": "All preferences and memories cleared."}
        
    return {"success": False, "error": f"Invalid operation '{operation}'."}
