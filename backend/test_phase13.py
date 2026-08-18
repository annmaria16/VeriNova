import sys
import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.append("c:/Users/HP/Documents/verinova/backend")

# Set dummy key for Tavily search import stability
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"

from fastapi import HTTPException
import core_models
import models
from services.security.verification_service import (
    ClaimExtractionEngine,
    ConflictDetectionEngine,
    AutomaticVerificationEngine
)

class TestPhase13(unittest.TestCase):

    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_user = models.User(
            id=1,
            email="test_user@verinova.com",
            role="user",
            memory_enabled=True
        )
        self.mock_task = core_models.Task(
            id=101,
            user_id=1,
            description="Is flight AI-102 cheaper on Amazon than Flipkart?",
            status="pending"
        )
        
        # Seed Mock DB queries
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == models.User:
                q.first.return_value = self.mock_user
            elif model == core_models.Task:
                q.first.return_value = self.mock_task
            else:
                q.first.return_value = None
            return q
            
        self.mock_db.query.side_effect = mock_query

    def test_claim_extraction(self):
        print("\n--- Test: Factual Claim Extraction ---")
        text = "Flight AI-102 is INR 50000 on Amazon and ₹52000 on Flipkart."
        
        claims = ClaimExtractionEngine.extract_claims(
            task_id=101,
            user_id=1,
            text=text,
            db=self.mock_db
        )
        
        # Flight matches & price matches
        self.assertTrue(any(c.claim_type == "TRAVEL_INFORMATION" for c in claims))
        self.assertTrue(any(c.claim_type == "NUMERICAL" for c in claims))
        print(f"Extracted {len(claims)} distinct claims: Success.")

    def test_evidence_deduplication(self):
        print("\n--- Test: Evidence Content Hash Deduplication ---")
        claim = core_models.FactualClaim(claim_id="c_1", task_id=101, user_id=1, claim_type="NUMERICAL")
        
        # Duplicate evidence content
        ev1 = core_models.ClaimEvidence(evidence_id="e_1", claim_id="c_1", content="Price is 50000", provider="Amazon", retrieved_at=datetime.utcnow(), relation="SUPPORTS")
        ev2 = core_models.ClaimEvidence(evidence_id="e_2", claim_id="c_1", content="Price is 50000", provider="Amazon Copy", retrieved_at=datetime.utcnow(), relation="SUPPORTS")
        
        res = AutomaticVerificationEngine.verify_claim(claim, [ev1, ev2], self.mock_db)
        # Confidences should reflect deduplication (0.7 rather than 0.9 boost)
        self.assertEqual(res["confidence"], 0.7)
        print("Deduplicated same content values successfully: Success.")

    def test_conflict_detection(self):
        print("\n--- Test: Factual Source Conflict Detection ---")
        claim = core_models.FactualClaim(claim_id="c_2", task_id=101, user_id=1, claim_type="NUMERICAL")
        
        # Conflicting prices
        ev1 = core_models.ClaimEvidence(evidence_id="e_3", claim_id="c_2", content="Price is 50000", provider="Amazon", retrieved_at=datetime.utcnow(), relation="SUPPORTS")
        ev2 = core_models.ClaimEvidence(evidence_id="e_4", claim_id="c_2", content="Price is 55000", provider="Flipkart", retrieved_at=datetime.utcnow(), relation="SUPPORTS")
        
        res = AutomaticVerificationEngine.verify_claim(claim, [ev1, ev2], self.mock_db)
        self.assertEqual(res["status"], "CONFLICTING")
        print(f"Conflict Status: {res['status']}. Conflicting values blocked: Success.")

    def test_freshness_decay_stale(self):
        print("\n--- Test: Temporal Freshness Decay ---")
        claim = core_models.FactualClaim(claim_id="c_3", task_id=101, user_id=1, claim_type="NUMERICAL")
        
        # Stale price (11 minutes old)
        ev = core_models.ClaimEvidence(
            evidence_id="e_5",
            claim_id="c_3",
            content="Price is 50000",
            provider="Amazon",
            retrieved_at=datetime.utcnow() - timedelta(minutes=11),
            relation="SUPPORTS"
        )
        
        res = AutomaticVerificationEngine.verify_claim(claim, [ev], self.mock_db)
        self.assertEqual(res["status"], "STALE")
        print(f"Decayed Status: {res['status']}. Old values flagged STALE: Success.")

    def test_task_verification_report(self):
        print("\n--- Test: Task Verification Report IDOR Boundaries ---")
        from main import get_task_verification_report
        
        summary_mock = core_models.TaskVerificationSummary(
            task_id=101,
            total_claims=3,
            verified_claims=2,
            conflicting_claims=1,
            overall_status="CONFLICTING"
        )
        claim_mock = core_models.FactualClaim(
            claim_id="clm_1",
            task_id=101,
            user_id=1,
            text="Price mismatch",
            status="CONFLICTING"
        )
        
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == core_models.Task:
                q.first.return_value = self.mock_task
            elif model == core_models.TaskVerificationSummary:
                q.first.return_value = summary_mock
            elif model == core_models.FactualClaim:
                q.all.return_value = [claim_mock]
            return q
        self.mock_db.query.side_effect = mock_query
        
        # Check success report
        report = get_task_verification_report(task_id=101, db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(report["success"])
        self.assertEqual(report["summary"]["overall_status"], "CONFLICTING")
        
        # Check IDOR block
        other_user = models.User(id=2, email="other@verinova.com", role="user")
        with self.assertRaises(HTTPException) as context:
            get_task_verification_report(task_id=101, db=self.mock_db, current_user=other_user)
            
        self.assertEqual(context.exception.status_code, 403)
        print("Task report returned successfully and blocked User 2: Success.")

if __name__ == "__main__":
    unittest.main()
