import logging

logger = logging.getLogger("verinova.trust")

def calculate_trust(evidence_list: list) -> dict:
    """Calculates a trust score and category dynamically based on verified inputs."""
    if not evidence_list:
        return {
            "trustScore": 0.0,
            "confidence": "UNVERIFIED",
            "reasons": ["No evidence could be gathered from sources."]
        }
        
    score = 0.5 # Baseline default score
    reasons = []
    
    # 1. Source Quality check
    sources = [ev.get("source_name", ev.get("source")) for ev in evidence_list if ev]
    unique_sources = set(s for s in sources if s)
    
    if len(unique_sources) >= 3:
        score += 0.2
        reasons.append(f"Verified against {len(unique_sources)} independent sources")
    elif len(unique_sources) == 2:
        score += 0.1
        reasons.append("Verified against 2 independent sources")
    else:
        score -= 0.1
        reasons.append("Only a single source was checked")
        
    # 2. Status Consistency check
    failures = [ev for ev in evidence_list if ev and ev.get("status") == "failed"]
    if len(failures) == 0:
        score += 0.15
        reasons.append("No conflicting values or errors detected")
    else:
        score -= 0.25
        reasons.append(f"Detected {len(failures)} failures/conflicts in source responses")
        
    # 3. Completeness ratio check
    passed_count = len([ev for ev in evidence_list if ev and ev.get("status") == "passed"])
    completeness_ratio = passed_count / len(evidence_list)
    if completeness_ratio == 1.0:
        score += 0.15
        reasons.append("All planned evidence was successfully collected")
    elif completeness_ratio >= 0.5:
        score += 0.05
        reasons.append("Majority of evidence was collected")
    else:
        score -= 0.2
        reasons.append("Significant amount of planned evidence failed collection")
        
    # Bound the score
    trust_score = max(0.0, min(1.0, score))
    
    # Map to Trust Levels
    if trust_score >= 0.85:
        level = "HIGH"
    elif trust_score >= 0.6:
        level = "MEDIUM"
    elif trust_score >= 0.3:
        level = "LOW"
    else:
        level = "UNVERIFIED"
        
    return {
        "trustScore": round(trust_score, 2),
        "confidence": level,
        "reasons": reasons
    }
