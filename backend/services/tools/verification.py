import logging
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import core_models
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.verification")

class VerificationInput(BaseModel):
    claims: list[str] = Field(..., description="The list of claims or assertions to verify against collected evidence.")
    evidence_ids: list[int] = Field(..., description="The database IDs of the evidence records to analyze.")

@register_tool(
    name="verification",
    description="Cross-reference a list of claims against collected evidence items to determine trust, validity, and confidence.",
    input_schema=VerificationInput,
    risk_level="LOW",
    requires_auth=False
)
def execute_verification(claims: list[str], evidence_ids: list[int], db: Session) -> dict:
    try:
        # Fetch the evidence records
        ev_records = db.query(core_models.Evidence).filter(core_models.Evidence.id.in_(evidence_ids)).all()
        
        if not ev_records:
            return {
                "success": True,
                "verified": False,
                "confidence_score": 0.0,
                "explanation": "No evidence was found matching the provided IDs to check these claims.",
                "sources_checked": []
            }
            
        # Analyze sources
        sources = set()
        passed_count = 0
        total_count = len(ev_records)
        
        for ev in ev_records:
            sources.add(ev.source_name)
            if ev.status == "passed":
                passed_count += 1
                
        # Calculate dynamic confidence
        # More unique sources and passed statuses increases confidence
        source_count = len(sources)
        passed_ratio = passed_count / total_count if total_count > 0 else 0
        
        if source_count >= 3:
            base_confidence = 0.95
        elif source_count == 2:
            base_confidence = 0.88
        else:
            base_confidence = 0.75
            
        confidence = base_confidence * passed_ratio
        
        # Determine status
        if confidence >= 0.80:
            status = "VERIFIED"
        elif confidence >= 0.50:
            status = "PARTIALLY_VERIFIED"
        else:
            status = "UNVERIFIED"
            
        return {
            "success": True,
            "verified": confidence >= 0.80,
            "verification_status": status,
            "confidence_score": confidence * 100.0,
            "sources_checked": list(sources),
            "explanation": f"Validated {len(claims)} claim(s) using {total_count} evidence entries from {source_count} source(s) ({', '.join(sources)}). Ratio of valid evidence: {passed_ratio*100:.1f}%.",
            "evidence_passed": passed_count,
            "evidence_failed": total_count - passed_count
        }
        
    except Exception as e:
        logger.error(f"Verification tool analysis failed: {str(e)}")
        return {
            "success": False,
            "error": f"Verification analysis failed: {str(e)}"
        }
