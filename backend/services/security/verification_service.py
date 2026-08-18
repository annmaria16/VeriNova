import re
import uuid
import hashlib
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
import core_models

logger = logging.getLogger("verinova.verification")

class ClaimExtractionEngine:
    @staticmethod
    def extract_claims(task_id: int, user_id: int, text: str, db: Session) -> List[core_models.FactualClaim]:
        # Identify factual claims: prices, flight numbers, locations, dates
        # E.g. find patterns matching INR/Rs/₹, flights, dates, hotels
        claims = []
        
        # 1. Price claims
        price_matches = re.findall(r'(?:inr|rs\.?|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)', text, re.IGNORECASE)
        for idx, pm in enumerate(price_matches):
            price_val = pm.replace(",", "")
            claims.append(core_models.FactualClaim(
                claim_id=f"clm_{uuid.uuid4().hex[:8]}_{idx+1}",
                task_id=task_id,
                user_id=user_id,
                text=f"Product price is INR {price_val}",
                claim_type="NUMERICAL",
                importance="MEDIUM"
            ))
            
        # 2. Travel/flight claims
        flight_matches = re.findall(r'\b([a-z0-9]{2,3}-\d{3,4})\b', text, re.IGNORECASE)
        for idx, fm in enumerate(flight_matches):
            claims.append(core_models.FactualClaim(
                claim_id=f"clm_{uuid.uuid4().hex[:8]}_fl_{idx+1}",
                task_id=task_id,
                user_id=user_id,
                text=f"Flight number is {fm.upper()}",
                claim_type="TRAVEL_INFORMATION",
                importance="MEDIUM"
            ))
            
        # Fallback general claim if none extracted
        if not claims:
            claims.append(core_models.FactualClaim(
                claim_id=f"clm_{uuid.uuid4().hex[:8]}_gen",
                task_id=task_id,
                user_id=user_id,
                text=text[:100],
                claim_type="FACTUAL",
                importance="MEDIUM"
            ))
            
        for c in claims:
            db.add(c)
        db.commit()
        return claims


class ConflictDetectionEngine:
    @staticmethod
    def detect_conflicts(evidence_list: List[core_models.ClaimEvidence]) -> Optional[Dict]:
        # Compare independent sources for numeric or factual discrepancies (Section 14)
        if len(evidence_list) < 2:
            return None
            
        # Extract numeric values (e.g. price)
        values_mapped = {}
        for ev in evidence_list:
            if ev.relation != "SUPPORTS":
                continue
            # Look for number / price
            num_match = re.search(r'\d+', ev.content)
            if num_match:
                val = int(num_match.group(0))
                values_mapped[ev.provider] = val
                
        # Check if values differ
        if len(set(values_mapped.values())) > 1:
            # Conflict detected!
            return {
                "detected": True,
                "values": values_mapped,
                "reason": f"Discrepancy detected between sources: {values_mapped}"
            }
        return None


class AutomaticVerificationEngine:
    @staticmethod
    def verify_claim(claim: core_models.FactualClaim, evidence_list: List[core_models.ClaimEvidence], db: Session) -> Dict:
        # 1. Deduplicate evidence by content hash (Section 11)
        seen_hashes = set()
        deduped = []
        for ev in evidence_list:
            content_hash = hashlib.sha256(ev.content.encode("utf-8")).hexdigest()
            ev.hash = content_hash
            if content_hash not in seen_hashes:
                seen_hashes.add(content_hash)
                deduped.append(ev)
                
        # 2. Check Freshness states (Section 16)
        # Numerical/Price data decays in 10 minutes; general research in 2 hours
        fresh_count = 0
        for ev in deduped:
            age = datetime.utcnow() - ev.retrieved_at
            threshold = timedelta(minutes=10) if claim.claim_type in ("NUMERICAL", "FINANCIAL_INFORMATION") else timedelta(hours=2)
            if age <= threshold:
                ev.freshness = "FRESH"
                fresh_count += 1
            else:
                ev.freshness = "STALE"
                
        if not deduped:
            claim.status = "UNSUPPORTED"
            claim.confidence = 0.0
            db.commit()
            return {"status": "UNSUPPORTED", "confidence": 0.0, "reason": "No evidence found."}
            
        # 3. Detect conflicts
        conflict = ConflictDetectionEngine.detect_conflicts(deduped)
        if conflict:
            claim.status = "CONFLICTING"
            claim.confidence = 0.3
            db.commit()
            
            # Log Conflict record in DB
            cr = core_models.ConflictRecord(
                task_id=claim.task_id,
                claim=claim.text,
                source_a=list(conflict["values"].keys())[0],
                source_b=list(conflict["values"].keys())[1],
                values=conflict["values"],
                resolution="Awaiting clarification / provider re-fetch."
            )
            db.add(cr)
            db.commit()
            return {"status": "CONFLICTING", "confidence": 0.3, "reason": conflict["reason"]}
            
        # 4. Check sufficiency and authority
        # If we have at least one fresh reputable source, mark verified
        supporting = [e for e in deduped if e.relation == "SUPPORTS" and e.freshness == "FRESH"]
        if supporting:
            claim.status = "VERIFIED"
            claim.confidence = 0.9 if len(supporting) >= 2 else 0.7
            claim.verified_at = datetime.utcnow()
        else:
            # All evidence is stale
            claim.status = "STALE"
            claim.confidence = 0.4
            
        db.commit()
        return {
            "status": claim.status,
            "confidence": claim.confidence,
            "reason": f"Verification completed with status: {claim.status}"
        }

    @staticmethod
    def update_task_summary(task_id: int, db: Session) -> core_models.TaskVerificationSummary:
        claims = db.query(core_models.FactualClaim).filter(core_models.FactualClaim.task_id == task_id).all()
        
        total = len(claims)
        verified = sum(1 for c in claims if c.status == "VERIFIED")
        conflicting = sum(1 for c in claims if c.status == "CONFLICTING")
        unsupported = sum(1 for c in claims if c.status == "UNSUPPORTED")
        stale = sum(1 for c in claims if c.status == "STALE")
        
        overall = "FULLY_VERIFIED"
        if conflicting > 0:
            overall = "CONFLICTING"
        elif unsupported > 0 or stale > 0:
            overall = "PARTIALLY_VERIFIED" if verified > 0 else "INSUFFICIENT_EVIDENCE"
            
        summary = db.query(core_models.TaskVerificationSummary).filter(
            core_models.TaskVerificationSummary.task_id == task_id
        ).first()
        
        if not summary:
            summary = core_models.TaskVerificationSummary(task_id=task_id)
            db.add(summary)
            
        summary.total_claims = total
        summary.verified_claims = verified
        summary.conflicting_claims = conflicting
        summary.unsupported_claims = unsupported
        summary.stale_claims = stale
        summary.overall_status = overall
        
        db.commit()
        return summary
