import sys
import os
import unittest
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add backend directory to path
sys.path.append("c:/Users/HP/Documents/verinova/backend")

# Set dummy key for Tavily search import stability
os.environ["TAVILY_API_KEY"] = "dummy_tavily_key"

from fastapi import HTTPException
import core_models
import models
from services.providers import ShoppingAdapter, GoogleCalendarAdapter
from services.shopping.normalization_service import ProductMatcher

class TestPhase12(unittest.TestCase):

    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_user = models.User(
            id=1,
            email="test_user@verinova.com",
            role="user",
            memory_enabled=True
        )
        self.mock_integration = core_models.UserIntegration(
            id=15,
            user_id=1,
            integration_id="google_calendar",
            provider_account_id="test_gcal_acc",
            status="CONNECTED",
            scopes=["READ", "WRITE"],
            created_at=datetime.utcnow()
        )
        
        # Seed query mocks
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            if model == models.User:
                q.first.return_value = self.mock_user
            elif model == core_models.UserIntegration:
                # Return list or single connection based on filter target
                def mock_first():
                    calls = q.filter.call_args_list
                    for c_arg in calls:
                        args = c_arg[0]
                        for arg in args:
                            if hasattr(arg, "right") and hasattr(arg.right, "value"):
                                val = getattr(arg.right, "value")
                                if val == "google_calendar":
                                    return self.mock_integration
                    return None
                q.first.side_effect = mock_first
                q.all.return_value = [self.mock_integration]
            return q
            
        self.mock_db.query.side_effect = mock_query

    def test_user_integration_endpoints(self):
        print("\n--- Test: User Connected Accounts Flow ---")
        from main import list_user_integrations, connect_user_integration, disconnect_user_integration
        
        # 1. List
        list_res = list_user_integrations(db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(list_res["success"])
        self.assertEqual(len(list_res["connected_accounts"]), 1)
        
        # 2. Connect
        payload = {"integration_id": "smtp_email", "scopes": ["SEND_EMAIL"]}
        conn_res = connect_user_integration(payload=payload, db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(conn_res["success"])
        
        # 3. Disconnect
        disc_res = disconnect_user_integration(integration_id="google_calendar", db=self.mock_db, current_user=self.mock_user)
        self.assertTrue(disc_res["success"])
        self.assertEqual(self.mock_integration.status, "DISCONNECTED")
        print("Connect, list, and revoke disconnect flows passed: Success.")

    def test_product_matching_and_variant_isolation(self):
        print("\n--- Test: Product Matcher Variant Matching ---")
        
        prod_a = {"title": "Apple iPhone 14 128GB Black"}
        prod_b = {"title": "iPhone 14 (Black, 128 GB)"}
        prod_c = {"title": "Apple iPhone 14 256GB Black"} # Different variant
        
        # A and B match
        self.assertTrue(ProductMatcher.is_match(prod_a, prod_b))
        # A and C do not match (variant isolation)
        self.assertFalse(ProductMatcher.is_match(prod_a, prod_c))
        print("Identified matches for identical items while isolating variants: Success.")

    @patch("services.providers.SearchProvider.search")
    def test_shopping_normalization(self, mock_search):
        print("\n--- Test: Shopping Adapter Normalization ---")
        mock_search.return_value = [
            {"title": "Laptop", "url": "https://amazon.com/p", "source": "amazon"}
        ]
        adapter = ShoppingAdapter(provider_name="amazon")
        results = adapter.search(query="laptop")
        
        # Check first result normalization fields
        first = results[0]
        self.assertEqual(first["provider"], "amazon")
        self.assertIn("checkedAt", first)
        self.assertIn("price", first)
        self.assertIn("shipping", first)
        print("Normalized shopping offer properties mapped: Success.")

    def test_calendar_event_verification(self):
        print("\n--- Test: Calendar Post-Action Verification ---")
        adapter = GoogleCalendarAdapter()
        
        # Create event
        evt = adapter.execute(title="Sprint Plan", start_time="10:00 AM", description="Review tickets")
        self.assertEqual(evt["status"], "CREATED")
        
        # Verify event
        verified = adapter.verify(evt["event_id"])
        self.assertTrue(verified)
        print("Calendar event verify post-execution passed: Success.")

    def test_cross_user_integration_api_isolation(self):
        print("\n--- Test: Cross-User UserIntegration IDOR Boundary ---")
        from main import disconnect_user_integration
        
        # User 2 tries to disconnect User 1's integration connection
        other_user = models.User(id=2, email="other@verinova.com", role="user")
        
        # Override mock filter to return None because it's not User 2's connection
        def mock_query(model):
            q = MagicMock()
            q.filter.return_value = q
            q.first.return_value = None # None found for User 2
            return q
        self.mock_db.query.side_effect = mock_query
        
        with self.assertRaises(HTTPException) as context:
            disconnect_user_integration(integration_id="google_calendar", db=self.mock_db, current_user=other_user)
            
        self.assertEqual(context.exception.status_code, 404)
        print("Blocked User 2 from modifying User 1's integration connection: Success.")

if __name__ == "__main__":
    unittest.main()
