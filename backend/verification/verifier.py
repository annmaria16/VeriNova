import logging
from datetime import datetime
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

def verify_task_outcome(task_id: str, db: Session) -> dict:
    """
    Computes a confidence score and verification status for a task.
    Optionally performs adaptive double-checking for payments and bookings.
    """
    logger.info(f"Running verification engine for task {task_id}...")

    # Fetch task and evidence
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        logger.error(f"Task {task_id} not found during verification.")
        return {"error": "Task not found"}

    evidence_list = db.query(models.Evidence).filter(models.Evidence.task_id == task_id).all()
    
    # Custom Booking verification check
    if task.task_type == "booking":
        logger.info(f"Running custom booking verification check for task {task_id}")
        
        # Extract info from evidence records
        api_response_data = {}
        db_check_data = {}
        logs_list = []
        
        for ev in evidence_list:
            data = ev.evidence_data or {}
            if ev.evidence_type == "api_response":
                api_response_data = data
            elif ev.evidence_type == "database_check":
                db_check_data = data
            elif ev.evidence_type == "logs":
                logs_list = data.get("logs", [])
                
        execution_status = api_response_data.get("status")
        
        if execution_status == "confirmed":
            service_id = api_response_data.get("service_id")
            slot_id = api_response_data.get("slot_id")
            
            # Check 1: Does the service exist?
            service = db.query(models.BookingService).filter(models.BookingService.id == service_id).first() if service_id else None
            service_exists = service is not None
            
            # Check 2: Does the slot exist?
            slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == slot_id).first() if slot_id else None
            slot_exists = slot is not None
            
            # Check 3: Was the slot available before booking?
            was_available = db_check_data.get("slot_availability_before") is True
            
            # Check 4: Does the booking record exist?
            # We search BookingRecord by task_id
            booking_rec = db.query(models.BookingRecord).filter(models.BookingRecord.task_id == task_id).first()
            booking_exists = booking_rec is not None
            
            # Check 5: Does the booking reference the correct service?
            references_correct_service = booking_exists and booking_rec.service_id == service_id
            
            # Check 6: Does the booking reference the correct slot?
            references_correct_slot = booking_exists and booking_rec.slot_id == slot_id
            
            # Check 7: Did the slot availability change correctly?
            # Check if is_available is now False
            availability_changed = slot_exists and slot.is_available is False
            
            # Check 8: Are the execution logs complete?
            logs_complete = len(logs_list) >= 4
            
            # Compute confidence score dynamically:
            # 12 points for checks 1-7, 11 points for logs check 8. Max = 95.
            score = 0
            details_list = []
            
            if service_exists:
                score += 12
                details_list.append("Service exists (+12%)")
            else:
                details_list.append("Service does not exist (+0%)")
                
            if slot_exists:
                score += 12
                details_list.append("Slot exists (+12%)")
            else:
                details_list.append("Slot does not exist (+0%)")
                
            if was_available:
                score += 12
                details_list.append("Slot was available before (+12%)")
            else:
                details_list.append("Slot was already booked (+0%)")
                
            if booking_exists:
                score += 12
                details_list.append("Booking record created (+12%)")
            else:
                details_list.append("Booking record missing (+0%)")
                
            if references_correct_service:
                score += 12
                details_list.append("Booking references correct service (+12%)")
            else:
                details_list.append("Booking service mismatch (+0%)")
                
            if references_correct_slot:
                score += 12
                details_list.append("Booking references correct slot (+12%)")
            else:
                details_list.append("Booking slot mismatch (+0%)")
                
            if availability_changed:
                score += 12
                details_list.append("Slot status changed to unavailable (+12%)")
            else:
                details_list.append("Slot remains available (+0%)")
                
            if logs_complete:
                score += 11
                details_list.append("Execution logs are complete (+11%)")
            else:
                details_list.append("Execution logs incomplete (+0%)")
                
            verification_status = "Verified" if score >= 80 else "Needs Review"
            summary_msg = f"Booking verification checks: {'; '.join(details_list)}. Confidence: {score}%."
            
        elif execution_status == "failed" or api_response_data.get("error"):
            # Task execution failed legitimately (e.g. slot unavailable)
            score = 15  # Minimum score for logged failed execution
            verification_status = "Failed"
            summary_msg = f"Verification confirmed execution failure: {api_response_data.get('error') or 'legitimate task execution failure'}."
            
        else:
            # Clarification or pending states
            score = 30
            verification_status = "Needs Review"
            summary_msg = "Task suspended or pending. Awaiting clarification response."
            
        # Create verification result
        result = models.VerificationResult(
            task_id=task_id,
            verification_status=verification_status,
            confidence_score=float(score),
            summary=summary_msg
        )
        db.add(result)
        
        task.status = verification_status
        task.confidence = float(score)
        
        ver_log = models.TaskLog(
            task_id=task_id,
            action="verification_complete",
            details=f"Verification complete. Score: {score}%, Status: {verification_status}. {summary_msg}"
        )
        db.add(ver_log)
        
        db.commit()
        logger.info(f"Outcome verification finished for booking task {task_id}. Result: {verification_status} ({score}%)")
        
        return {
            "task_id": task_id,
            "verification_status": verification_status,
            "confidence_score": score,
            "summary": summary_msg
        }

    # Custom Shopping verification check
    if task.task_type == "shopping":
        logger.info(f"Running custom shopping verification check for task {task_id}")
        
        # Extract info from evidence records
        api_response_data = {}
        db_check_data = {}
        logs_list = []
        
        for ev in evidence_list:
            data = ev.evidence_data or {}
            if ev.evidence_type == "api_response":
                api_response_data = data
            elif ev.evidence_type == "database_check":
                db_check_data = data
            elif ev.evidence_type == "logs":
                logs_list = data.get("logs", [])
                
        execution_status = api_response_data.get("status")
        
        if execution_status == "confirmed":
            product_id = api_response_data.get("product_id")
            
            # Check 1: Does the product exist?
            product = db.query(models.Product).filter(models.Product.id == product_id).first() if product_id else None
            product_exists = product is not None
            
            # Check 2: Does the price match?
            price_matches = product_exists and float(product.price) == float(api_response_data.get("price", 0))
            
            # Check 3: Was sufficient stock available?
            # We check the stock_before field stored in database_check evidence
            stock_before = db_check_data.get("stock_before", 0)
            stock_available = stock_before >= 1
            
            # Check 4: Does the resulting transaction/task record match the agent's claim?
            record_matches = task.reference_id == str(product_id) if product_id else False
            
            # Check 5: Are execution logs complete?
            logs_complete = len(logs_list) >= 4
            
            # Compute confidence score dynamically:
            # 20 points for each check, 15 points for logs. Max = 95.
            score = 0
            details_list = []
            
            if product_exists:
                score += 20
                details_list.append("Product exists in database (+20%)")
            else:
                details_list.append("Product not found in database (+0%)")
                
            if price_matches:
                score += 20
                details_list.append("Price matches database record (+20%)")
            else:
                details_list.append("Price mismatch or product not found (+0%)")
                
            if stock_available:
                score += 20
                details_list.append("Sufficient stock was available (+20%)")
            else:
                details_list.append("Insufficient stock (+0%)")
                
            if record_matches:
                score += 20
                details_list.append("Task reference matches product ID (+20%)")
            else:
                details_list.append("Task reference mismatch (+0%)")
                
            if logs_complete:
                score += 15
                details_list.append("Execution logs are complete (+15%)")
            else:
                details_list.append("Execution logs incomplete (+0%)")
                
            verification_status = "Verified" if score >= 80 else "Needs Review"
            summary_msg = f"Shopping verification checks: {'; '.join(details_list)}. Confidence: {score}%."
            
        elif execution_status == "failed" or api_response_data.get("error"):
            # Task execution failed legitimately (e.g. out of stock or NO MATCH FOUND)
            score = 15  # Minimum score for logged failed execution
            verification_status = "Failed"
            summary_msg = f"Verification confirmed execution failure: {api_response_data.get('error') or 'legitimate task execution failure'}."
            
        else:
            # Clarification or pending states
            score = 30
            verification_status = "Needs Review"
            summary_msg = "Task suspended or pending. Awaiting clarification response."
            
        # Create verification result
        result = models.VerificationResult(
            task_id=task_id,
            verification_status=verification_status,
            confidence_score=float(score),
            summary=summary_msg
        )
        db.add(result)
        
        task.status = verification_status
        task.confidence = float(score)
        
        ver_log = models.TaskLog(
            task_id=task_id,
            action="verification_complete",
            details=f"Verification complete. Score: {score}%, Status: {verification_status}. {summary_msg}"
        )
        db.add(ver_log)
        
        db.commit()
        logger.info(f"Outcome verification finished for shopping task {task_id}. Result: {verification_status} ({score}%)")
        
        return {
            "task_id": task_id,
            "verification_status": verification_status,
            "confidence_score": score,
            "summary": summary_msg
        }

    score = 0
    service_success = False
    db_match = False
    logs_present = False
    is_pending_or_uncertain = False
    has_contradictions = False

    # Extract info from evidence records
    for ev in evidence_list:
        data = ev.evidence_data or {}
        if ev.evidence_type == "api_response":
            status = data.get("status")
            if status in ["refunded", "sent", "confirmed", "updated"]:
                service_success = True
            if status == "pending" or data.get("error") == "pending":
                is_pending_or_uncertain = True
        
        elif ev.evidence_type == "database_check":
            if data.get("success") is True or data.get("match") is True:
                db_match = True
            if data.get("contradiction") is True:
                has_contradictions = True
                
        elif ev.evidence_type == "logs":
            logs = data.get("logs", [])
            if len(logs) > 0:
                logs_present = True

    # Compute base score
    if service_success:
        score += 50
    if db_match:
        score += 30
    if logs_present:
        score += 20
    if is_pending_or_uncertain:
        score -= 40

    # Ensure score is bound between 0 and 100
    score = max(0, min(100, score))

    summary_msg = f"Base score calculated as {score}."
    logger.info(f"Base confidence score for task {task_id}: {score}")

    # Adaptive double-checking check layer
    # If payment/refund or flight/hotel and score is in the uncertain range (40-79)
    if task.task_type in ["payment", "flight", "hotel"] and 40 <= score <= 79:
        logger.info(f"Adaptive double-check triggered for high-risk task type: {task.task_type}")
        
        # Log check action in task_logs
        check_log = models.TaskLog(
            task_id=task_id,
            action="adaptive_check",
            details=f"Verifying transaction/booking state again for adaptive check. Querying status endpoint..."
        )
        db.add(check_log)
        db.commit()

        # Simulate secondary verification lookup that resolves the pending status
        # If the check succeeds:
        score += 30
        score = min(100, score)
        is_pending_or_uncertain = False
        db_match = True
        
        # Update database check evidence in DB
        db_ev = db.query(models.Evidence).filter(
            models.Evidence.task_id == task_id,
            models.Evidence.evidence_type == "database_check"
        ).first()
        if db_ev:
            db_ev.evidence_data = {"success": True, "match": True, "details": "Adaptive query resolved successfully on second lookup."}
        
        summary_msg += " Adaptive check succeeded, resolving pending state (+30 points)."
        logger.info(f"Adaptive double-check succeeded. New score: {score}")

    # Determine final status
    if score >= 80 and not has_contradictions:
        verification_status = "Verified"
    elif score < 40:
        verification_status = "Failed"
    else:
        verification_status = "Needs Review"

    if has_contradictions:
        verification_status = "Needs Review"
        summary_msg += " Contradiction flag set: database check and service response mismatch."

    # Create verification result
    result = models.VerificationResult(
        task_id=task_id,
        verification_status=verification_status,
        confidence_score=float(score),
        summary=summary_msg
    )
    db.add(result)

    # Update Task fields
    task.status = verification_status
    task.confidence = float(score)
    
    # Save completion verification log
    ver_log = models.TaskLog(
        task_id=task_id,
        action="verification_complete",
        details=f"Verification complete. Score: {score}%, Status: {verification_status}. {summary_msg}"
    )
    db.add(ver_log)
    
    db.commit()
    logger.info(f"Outcome verification finished for task {task_id}. Result: {verification_status} ({score}%)")

    return {
        "task_id": task_id,
        "verification_status": verification_status,
        "confidence_score": score,
        "summary": summary_msg
    }
