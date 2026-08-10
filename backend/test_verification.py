import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_verifier")

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from verification.evidence_collector import collect_and_save_evidence
from verification.verifier import verify_task_outcome

def cleanup_test_data(db):
    logger.info("Cleaning up test data...")
    # Delete test verification results
    db.query(models.VerificationResult).filter(models.VerificationResult.task_id.like("test-%")).delete(synchronize_session=False)
    db.query(models.TaskLog).filter(models.TaskLog.task_id.like("test-%")).delete(synchronize_session=False)
    db.query(models.Evidence).filter(models.Evidence.task_id.like("test-%")).delete(synchronize_session=False)
    db.query(models.AgentExecution).filter(models.AgentExecution.task_id.like("test-%")).delete(synchronize_session=False)
    db.query(models.BookingRecord).filter(models.BookingRecord.task_id.like("test-%")).delete(synchronize_session=False)
    db.query(models.Task).filter(models.Task.id.like("test-%")).delete(synchronize_session=False)
    
    # Delete temporary test services/slots/products if any
    db.query(models.BookingSlot).filter(models.BookingSlot.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)).delete(synchronize_session=False)
    db.query(models.BookingService).filter(models.BookingService.service_name.like("Test %")).delete(synchronize_session=False)
    db.query(models.Product).filter(models.Product.name.like("Test %")).delete(synchronize_session=False)
    
    db.commit()

def run_tests():
    db = SessionLocal()
    cleanup_test_data(db)
    
    # Seed a standard user to link tasks
    test_user = db.query(models.User).first()
    if not test_user:
        logger.error("No user found in DB. Run seed or startup main.py first.")
        return
        
    user_id = test_user.id
    
    # Create test product, service, and slot for bookings/shopping tests
    test_product = models.Product(
        name="Test Laptop",
        description="A laptop for testing",
        price=1000.0,
        stock=10,
        is_active=True,
        created_by=user_id
    )
    db.add(test_product)
    
    test_service = models.BookingService(
        service_name="Test Turf",
        service_type="Sports",
        price=500.0,
        capacity=10,
        created_by=user_id,
        is_active=True
    )
    db.add(test_service)
    db.commit()
    
    test_slot = models.BookingSlot(
        service_id=test_service.id,
        slot_time=datetime.utcnow(),
        is_available=True
    )
    db.add(test_slot)
    db.commit()
    
    logger.info(f"Created test product: ID={test_product.id}, service: ID={test_service.id}, slot: ID={test_slot.id}")
    
    try:
        # =====================================================================
        # SCENARIO 1: All Evidence Succeeds (Booking Task)
        # =====================================================================
        logger.info("\n--- Scenario 1: All Evidence Succeeds ---")
        task_id_1 = "test-task-1"
        task_1 = models.Task(
            id=task_id_1,
            name="Book Test Turf",
            description="Book Test Turf tomorrow morning",
            expected_outcome="Turf booked successfully",
            status="Running",
            date="2026-08-11",
            user_id=user_id,
            task_type="booking",
            reference_id=None
        )
        db.add(task_1)
        db.commit()
        
        # Simulate execution
        # 1. Deduct slot availability
        test_slot.is_available = False
        db.commit()
        
        # 2. Create booking record
        booking_rec_1 = models.BookingRecord(
            task_id=task_id_1,
            service_id=test_service.id,
            slot_id=test_slot.id,
            user_id=user_id,
            price=test_service.price,
            status="confirmed"
        )
        db.add(booking_rec_1)
        db.commit()
        task_1.reference_id = str(booking_rec_1.id)
        db.commit()
        
        # Save AgentExecution params
        exec_1 = models.AgentExecution(
            task_id=task_id_1,
            parsed_intent={
                "task_type": "booking",
                "params": {"service_name": "Test Turf", "date": "2026-08-11", "time": "10 AM"}
            },
            execution_status="Completed"
        )
        db.add(exec_1)
        db.commit()
        
        # 3. Collect evidence
        api_res_1 = {
            "status": "confirmed",
            "booking_id": f"BK-{booking_rec_1.id}",
            "service_id": test_service.id,
            "slot_id": test_slot.id
        }
        db_check_1 = {
            "success": True,
            "match": True,
            "details": "Direct consistency check verified."
        }
        logs_1 = [
            "Initializing task",
            "Checking slot availability",
            "Acquiring database write lock on slot",
            "Creating booking record in database"
        ]
        
        collect_and_save_evidence(task_id_1, api_res_1, db_check_1, logs_1, db)
        
        # 4. Verify outcome
        res_1 = verify_task_outcome(task_id_1, db)
        assert res_1["verification_status"] == "Verified", f"Expected Verified, got {res_1['verification_status']}"
        assert res_1["confidence_score"] == 100, f"Expected 100 confidence, got {res_1['confidence_score']}"
        assert res_1["checks_performed"] == 4, f"Expected 4 checks performed, got {res_1['checks_performed']}"
        logger.info("Scenario 1 passed successfully!")

        # =====================================================================
        # SCENARIO 2: Database Mismatch (Booking Task)
        # =====================================================================
        logger.info("\n--- Scenario 2: Database Mismatch ---")
        task_id_2 = "test-task-2"
        task_2 = models.Task(
            id=task_id_2,
            name="Book Test Turf",
            description="Book Test Turf",
            status="Running",
            date="2026-08-11",
            user_id=user_id,
            task_type="booking"
        )
        db.add(task_2)
        db.commit()
        
        # API response reports success, but database BookingRecord is missing
        api_res_2 = {
            "status": "confirmed",
            "service_id": test_service.id,
            "slot_id": test_slot.id
        }
        db_check_2 = {
            "success": False,
            "match": False,
            "details": "Booking record missing from database"
        }
        collect_and_save_evidence(task_id_2, api_res_2, db_check_2, logs_1, db)
        
        res_2 = verify_task_outcome(task_id_2, db)
        # Score should be: Service success (+50) + Database Match (+0) + Logs complete (+20) = 70.
        # Status should be Needs Review.
        assert res_2["verification_status"] == "Needs Review", f"Expected Needs Review, got {res_2['verification_status']}"
        assert res_2["confidence_score"] == 70, f"Expected 70 confidence, got {res_2['confidence_score']}"
        logger.info("Scenario 2 passed successfully!")

        # =====================================================================
        # SCENARIO 3: Service Failure (Explicit service failure)
        # =====================================================================
        logger.info("\n--- Scenario 3: Service Failure ---")
        task_id_3 = "test-task-3"
        task_3 = models.Task(
            id=task_id_3,
            name="Book Turf Failed",
            description="Book turf",
            status="Running",
            date="2026-08-11",
            user_id=user_id,
            task_type="booking"
        )
        db.add(task_3)
        db.commit()
        
        api_res_3 = {
            "status": "failed",
            "error": "No booking service found matching 'non-existent'"
        }
        db_check_3 = {
            "success": False,
            "match": False,
            "details": "Service check failed"
        }
        collect_and_save_evidence(task_id_3, api_res_3, db_check_3, logs_1, db)
        
        res_3 = verify_task_outcome(task_id_3, db)
        assert res_3["verification_status"] == "Failed", f"Expected Failed, got {res_3['verification_status']}"
        assert res_3["confidence_score"] <= 15, f"Expected score <= 15, got {res_3['confidence_score']}"
        logger.info("Scenario 3 passed successfully!")

        # =====================================================================
        # SCENARIO 4: Pending response (Simple Task - Movie)
        # =====================================================================
        logger.info("\n--- Scenario 4: Pending response ---")
        task_id_4 = "test-task-4"
        task_4 = models.Task(
            id=task_id_4,
            name="Book Movie Ticket",
            description="Book Interstellar ticket",
            status="Running",
            date="2026-08-11",
            user_id=user_id,
            task_type="movie"
        )
        db.add(task_4)
        db.commit()
        
        exec_4 = models.AgentExecution(
            task_id=task_id_4,
            parsed_intent={
                "task_type": "movie",
                "params": {"movie_name": "Interstellar", "theater": "IMAX", "showtime": "7 PM"}
            },
            execution_status="Running"
        )
        db.add(exec_4)
        db.commit()
        
        api_res_4 = {
            "status": "pending",
            "movie_name": "Interstellar",
            "theater": "IMAX",
            "showtime": "7 PM"
        }
        db_check_4 = {
            "success": True,
            "match": True
        }
        collect_and_save_evidence(task_id_4, api_res_4, db_check_4, logs_1, db)
        
        res_4 = verify_task_outcome(task_id_4, db)
        # Score: Service pending (+10) + Database match (+30) + Logs complete (+20) = 60
        # Status: Needs Review (since score is 60)
        assert res_4["verification_status"] == "Needs Review", f"Expected Needs Review, got {res_4['verification_status']}"
        assert res_4["confidence_score"] == 60, f"Expected 60 confidence, got {res_4['confidence_score']}"
        logger.info("Scenario 4 passed successfully!")

        # =====================================================================
        # SCENARIO 5: Missing Evidence (Logs and DB check missing)
        # =====================================================================
        logger.info("\n--- Scenario 5: Missing Evidence ---")
        task_id_5 = "test-task-5"
        task_5 = models.Task(
            id=task_id_5,
            name="Book Movie Ticket",
            description="Book Interstellar",
            status="Running",
            date="2026-08-11",
            user_id=user_id,
            task_type="movie"
        )
        db.add(task_5)
        db.commit()
        
        # Only save api_response evidence
        api_ev = models.Evidence(
            task_id=task_id_5,
            evidence_type="api_response",
            evidence_data={"status": "confirmed", "movie_name": "Interstellar", "theater": "IMAX", "showtime": "7 PM"}
        )
        db.add(api_ev)
        db.commit()
        
        res_5 = verify_task_outcome(task_id_5, db)
        # Score: Service success (+50) + Database Match (+0) + Logs complete (+0) = 50. Status: Needs Review.
        assert res_5["verification_status"] == "Needs Review", f"Expected Needs Review, got {res_5['verification_status']}"
        assert res_5["confidence_score"] == 50, f"Expected 50 confidence, got {res_5['confidence_score']}"
        logger.info("Scenario 5 passed successfully!")

        # =====================================================================
        # SCENARIO 6: Contradictory Evidence (Price/Budget Mismatch)
        # =====================================================================
        logger.info("\n--- Scenario 6: Contradictory Evidence ---")
        task_id_6 = "test-task-6"
        task_6 = models.Task(
            id=task_id_6,
            name="Buy Product",
            description="Buy Test Laptop under ₹800", # Budget is 800, but product price is 1000!
            status="Running",
            date="2026-08-11",
            user_id=user_id,
            task_type="shopping",
            reference_id=str(test_product.id)
        )
        db.add(task_6)
        db.commit()
        
        exec_6 = models.AgentExecution(
            task_id=task_id_6,
            parsed_intent={
                "task_type": "shopping",
                "params": {"product_name": "Test Laptop", "max_price": 800.0}
            },
            execution_status="Completed"
        )
        db.add(exec_6)
        db.commit()
        
        api_res_6 = {
            "status": "confirmed",
            "product_id": test_product.id,
            "price": 1000.0
        }
        db_check_6 = {
            "stock_before": 10,
            "stock_after": 9
        }
        # Decrement stock in DB to match
        test_product.stock = 9
        db.commit()
        
        collect_and_save_evidence(task_id_6, api_res_6, db_check_6, logs_1, db)
        
        res_6 = verify_task_outcome(task_id_6, db)
        # Price (1000) exceeds budget (800) -> contradiction!
        # Score: Service success (+50) + Database Match (+0 due to mismatch/contradiction) + Logs complete (+20) - Contradiction penalty (40) = 30
        # Status: Needs Review (forced by contradiction)
        assert res_6["verification_status"] == "Needs Review", f"Expected Needs Review, got {res_6['verification_status']}"
        assert res_6["confidence_score"] == 30, f"Expected 30 confidence, got {res_6['confidence_score']}"
        logger.info("Scenario 6 passed successfully!")

        # =====================================================================
        # SCENARIO 7: Uncertain 40-79 score (demonstrated in Scenario 4)
        # =====================================================================
        logger.info("\n--- Scenario 7: Uncertain 40-79 score ---")
        # In Scenario 4, the score was 60, resulting in "Needs Review" which is tested.
        logger.info("Scenario 7 validated via Scenario 4.")

        # =====================================================================
        # SCENARIO 8: Additional Verification (High-risk Pending Task)
        # =====================================================================
        logger.info("\n--- Scenario 8: Additional Verification (Adaptive check) ---")
        task_id_8 = "test-task-8"
        task_8 = models.Task(
            id=task_id_8,
            name="Refunding amount",
            description="Refund ₹100 for order order_123",
            status="Running",
            date="2026-08-11",
            user_id=user_id,
            task_type="payment"
        )
        db.add(task_8)
        db.commit()
        
        exec_8 = models.AgentExecution(
            task_id=task_id_8,
            parsed_intent={
                "task_type": "payment",
                "params": {"amount": 100.0, "order_id": "order_123"}
            },
            execution_status="Completed"
        )
        db.add(exec_8)
        db.commit()
        
        # Service response is pending (yielding 10 base service points)
        api_res_8 = {
            "status": "pending",
            "amount": 100.0,
            "order_id": "order_123"
        }
        db_check_8 = {
            "success": True,
            "match": True
        }
        collect_and_save_evidence(task_id_8, api_res_8, db_check_8, logs_1, db)
        
        # Wait, if we verify now:
        # Base score is: Service response pending (+10) + Database match (+30) + Logs complete (+20) = 60.
        # This triggers adaptive double-checking since 40 <= 60 <= 79 and task_type is payment!
        # Re-check passes, adding +30 points. Final score = 90 (Verified).
        res_8 = verify_task_outcome(task_id_8, db)
        assert res_8["verification_status"] == "Verified", f"Expected Verified, got {res_8['verification_status']}"
        assert res_8["confidence_score"] == 90, f"Expected 90 confidence, got {res_8['confidence_score']}"
        assert res_8["checks_performed"] == 5, f"Expected 5 checks performed, got {res_8['checks_performed']}"
        logger.info("Scenario 8 passed successfully!")

        logger.info("\nALL TEST SCENARIOS PASSED SUCCESSFULLY!")
        
    except AssertionError as e:
        logger.error(f"Assertion failed: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Error running tests: {str(e)}")
        raise e
    finally:
        cleanup_test_data(db)
        db.close()

if __name__ == "__main__":
    run_tests()
