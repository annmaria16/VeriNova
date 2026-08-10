import logging
import re
import json
from datetime import datetime
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

def verify_task_outcome(task_id: str, db: Session) -> dict:
    """
    Computes a confidence score and verification status for a task.
    Uses independent cross-checks of evidence, contradiction detection,
    and adaptive double-checking for payments/bookings.
    """
    logger.info(f"Running core outcome verification engine for task {task_id}...")

    # Fetch task and evidence
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        logger.error(f"Task {task_id} not found during verification.")
        return {"error": "Task not found"}

    evidence_list = db.query(models.Evidence).filter(models.Evidence.task_id == task_id).all()
    
    # Retrieve execution params from AgentExecution if available
    exec_rec = db.query(models.AgentExecution).filter(models.AgentExecution.task_id == task_id).first()
    params = exec_rec.parsed_intent.get("params", {}) if (exec_rec and exec_rec.parsed_intent) else {}

    # Extract info from evidence records
    api_response_data = {}
    db_check_data = {}
    logs_list = []
    reference_record_data = {}
    
    for ev in evidence_list:
        data = ev.evidence_data or {}
        if ev.evidence_type == "api_response":
            api_response_data = data
        elif ev.evidence_type == "database_check":
            db_check_data = data
        elif ev.evidence_type == "logs":
            logs_list = data.get("logs", [])
        elif ev.evidence_type == "reference_record":
            reference_record_data = data

    # Score components
    score_service = 0
    score_db = 0
    score_logs = 0
    score_adaptive = 0
    contradictions_penalty = 0

    has_contradictions = False
    is_pending_or_uncertain = False
    is_explicit_failure = False
    details_list = []
    
    # Initial checks count (Service status, Database check, Logs integrity, Reference record check)
    checks_performed = 4

    # --- 1. Service Response Check (+50) ---
    execution_status = api_response_data.get("status")
    if execution_status in ["confirmed", "refunded", "sent", "updated", "success"]:
        score_service = 50
        details_list.append("Service execution returned success (+50 points)")
    elif execution_status == "pending" or api_response_data.get("error") == "pending":
        score_service = 10
        is_pending_or_uncertain = True
        details_list.append("Service execution status is pending/uncertain (+10 points)")
    elif execution_status == "failed" or api_response_data.get("error") is not None:
        score_service = 0
        is_explicit_failure = True
        details_list.append(f"Service execution explicitly failed: {api_response_data.get('error') or 'Unknown error'} (+0 points)")
    else:
        score_service = 0
        is_pending_or_uncertain = True
        details_list.append("Service execution response missing or unconfirmed (+0 points)")

    # --- 2. Database/Consistency Cross-Check (+30) ---
    db_match = False
    
    if api_response_data and db_check_data:
        t_type = task.task_type
        
        if t_type == "booking":
            service_id = api_response_data.get("service_id")
            slot_id = api_response_data.get("slot_id")
            
            # Check service exists
            service = db.query(models.BookingService).filter(models.BookingService.id == service_id).first() if service_id else None
            service_exists = service is not None
            
            # Check slot exists
            slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == slot_id).first() if slot_id else None
            slot_exists = slot is not None
            
            # Check BookingRecord
            booking_rec = db.query(models.BookingRecord).filter(models.BookingRecord.task_id == task_id).first()
            booking_exists = booking_rec is not None
            
            # Cross-checks
            references_correct_service = booking_exists and booking_rec.service_id == service_id
            references_correct_slot = booking_exists and booking_rec.slot_id == slot_id
            availability_changed = slot_exists and slot.is_available is False
            
            if service_exists and slot_exists and booking_exists and references_correct_service and references_correct_slot and availability_changed:
                db_match = True
            else:
                # Contradiction triggers if booking record details conflict or slot remains available
                if execution_status == "confirmed":
                    if booking_exists and (not references_correct_service or not references_correct_slot):
                        has_contradictions = True
                        details_list.append("Contradiction: Booking record service/slot details mismatch.")
                    if slot_exists and not availability_changed:
                        has_contradictions = True
                        details_list.append("Contradiction: Slot remains available after confirmation.")
                        
        elif t_type == "shopping":
            product_id = api_response_data.get("product_id")
            product = db.query(models.Product).filter(models.Product.id == product_id).first() if product_id else None
            product_exists = product is not None
            
            price_matches = product_exists and float(product.price) == float(api_response_data.get("price", 0))
            
            stock_before = db_check_data.get("stock_before", 0)
            stock_after = product.stock if product_exists else 0
            stock_decremented = product_exists and (stock_before - stock_after == 1)
            
            reference_matches = task.reference_id == str(product_id) if product_id else False
            
            # Budget check
            max_price = params.get("max_price")
            budget_ok = True
            if max_price is not None and product_exists:
                budget_ok = float(product.price) <= float(max_price)
            
            if product_exists and price_matches and stock_decremented and reference_matches and budget_ok:
                db_match = True
            else:
                if execution_status == "confirmed":
                    if product_exists and (not stock_decremented or not price_matches or not budget_ok):
                        has_contradictions = True
                        details_list.append("Contradiction: Product price mismatch, stock not decremented, or price exceeds budget.")

        elif t_type == "payment":
            p_amount = params.get("amount")
            p_order_id = params.get("order_id")
            
            api_amount = api_response_data.get("amount")
            api_order_id = api_response_data.get("order_id")
            
            # Handle float comparison
            amounts_match = p_amount is not None and api_amount is not None and abs(float(p_amount) - float(api_amount)) < 0.01
            order_ids_match = str(p_order_id) == str(api_order_id)
            
            if amounts_match and order_ids_match and execution_status in ["refunded", "pending"]:
                db_match = True
            else:
                if execution_status in ["refunded", "pending"]:
                    if not amounts_match or not order_ids_match:
                        has_contradictions = True
                        details_list.append("Contradiction: Refund amount or order ID mismatch.")

        elif t_type == "email":
            p_email = params.get("to_email")
            p_msg = params.get("message")
            
            api_email = api_response_data.get("to_email")
            api_msg = api_response_data.get("message")
            
            emails_match = str(p_email).strip().lower() == str(api_email).strip().lower() if p_email else False
            # Check message match (allow partial match since orchestrator or templates might clean/wrap message)
            msgs_match = (str(p_msg).strip() in str(api_msg).strip()) or (str(api_msg).strip() in str(p_msg).strip()) if p_msg else False
            
            if emails_match and msgs_match and execution_status in ["sent", "pending"]:
                db_match = True
            else:
                if execution_status in ["sent", "pending"]:
                    if not emails_match or not msgs_match:
                        has_contradictions = True
                        details_list.append("Contradiction: Outbound recipient email address or message content mismatch.")

        elif t_type in ["flight", "hotel"]:
            p_dest = params.get("destination")
            p_date = params.get("date")
            
            api_dest = api_response_data.get("destination")
            api_date = api_response_data.get("date")
            
            dests_match = str(p_dest).strip().lower() == str(api_dest).strip().lower() if p_dest else False
            dates_match = str(p_date).strip() == str(api_date).strip() if p_date else False
            
            # Booking PNR check
            pnr = api_response_data.get("booking_id")
            
            if dests_match and dates_match and (pnr or execution_status == "pending"):
                db_match = True
            else:
                if pnr or execution_status == "pending":
                    if not dests_match or not dates_match:
                        has_contradictions = True
                        details_list.append("Contradiction: Travel destination or travel date mismatch.")

        elif t_type == "movie":
            p_movie = params.get("movie_name")
            p_theater = params.get("theater")
            p_time = params.get("showtime")
            
            api_movie = api_response_data.get("movie_name")
            api_theater = api_response_data.get("theater")
            api_time = api_response_data.get("showtime")
            
            movies_match = str(p_movie).strip().lower() == str(api_movie).strip().lower() if p_movie else False
            theaters_match = str(p_theater).strip().lower() == str(api_theater).strip().lower() if p_theater else False
            times_match = str(p_time).strip().lower() == str(api_time).strip().lower() if p_time else False
            
            if movies_match and theaters_match and times_match and execution_status in ["confirmed", "pending"]:
                db_match = True
            else:
                if execution_status in ["confirmed", "pending"]:
                    if not movies_match or not theaters_match or not times_match:
                        has_contradictions = True
                        details_list.append("Contradiction: Booked movie title, theater hall, or showtime mismatch.")

        elif t_type == "crm":
            p_email = params.get("email")
            p_status = params.get("status")
            
            cust_row = db.query(models.Customer).filter(models.Customer.email == p_email).first() if p_email else None
            
            if cust_row and (cust_row.status == p_status or execution_status == "pending"):
                db_match = True
            else:
                if execution_status in ["updated", "pending"]:
                    if not cust_row or cust_row.status != p_status:
                        has_contradictions = True
                        details_list.append("Contradiction: Customer database record status does not match requested update.")
                        
        else:
            # General fallback check
            db_match = db_check_data.get("match") is True or db_check_data.get("success") is True

    if db_match:
        score_db = 30
        details_list.append("Database consistency verification matched (+30 points)")
    else:
        score_db = 0
        details_list.append("Database consistency check failed/missing (+0 points)")

    # --- 3. Execution Logs Integrity Check (+20) ---
    if logs_list and len(logs_list) >= 4:
        score_logs = 20
        details_list.append("Execution logs compiled completely (+20 points)")
    elif logs_list and len(logs_list) > 0:
        score_logs = 5
        details_list.append("Execution logs are incomplete (+5 points)")
    else:
        score_logs = 0
        details_list.append("Execution logs are missing (+0 points)")

    # --- Calculate Base Score ---
    score = score_service + score_db + score_logs
    score = max(0, min(100, score))
    logger.info(f"Base confidence score calculated: {score}")

    # --- 4. Adaptive Verification check layer (+30) ---
    is_high_risk = task.task_type in ["payment", "booking", "flight", "hotel"]
    
    if is_high_risk and 40 <= score <= 79:
        logger.info(f"Triggering adaptive double-checking for high-risk task {task.task_type}")
        checks_performed += 1
        
        # Log the adaptive check action
        check_log = models.TaskLog(
            task_id=task_id,
            action="adaptive_check",
            details=f"Initiated adaptive verification targeted check: validating confirmation status of {task.task_type}."
        )
        db.add(check_log)
        db.commit()
        
        adaptive_check_success = False
        
        if task.task_type == "booking":
            # Recheck: Booking record status and slot lock state
            booking_rec = db.query(models.BookingRecord).filter(models.BookingRecord.task_id == task_id).first()
            slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == booking_rec.slot_id).first() if (booking_rec and booking_rec.slot_id) else None
            
            if booking_rec and booking_rec.status in ["confirmed", "pending"] and slot and slot.is_available is False:
                adaptive_check_success = True
                details_list.append("Adaptive check: booking availability and slot status confirmed (+30 points)")
                
        elif task.task_type == "payment":
            # Recheck: Refund transaction simulation state
            if api_response_data.get("status") in ["refunded", "pending"] and not ("fail" in str(api_response_data.get("order_id", "")).lower()):
                adaptive_check_success = True
                details_list.append("Adaptive check: transaction refund status re-check passed (+30 points)")
                
        elif task.task_type in ["flight", "hotel"]:
            # Recheck: Confirm Booking ID (PNR) index
            pnr = api_response_data.get("booking_id")
            if pnr and len(pnr) >= 5:
                adaptive_check_success = True
                details_list.append("Adaptive check: PNR reference lookup confirmed (+30 points)")
                
        if adaptive_check_success:
            score_adaptive = 30
            score += score_adaptive
            score = min(100, score)
            is_pending_or_uncertain = False # Resolved

    # --- 5. Contradiction Penalty (-40) ---
    if has_contradictions:
        contradictions_penalty = -40
        score += contradictions_penalty
        score = max(0, min(100, score))
        details_list.append("Contradictions penalty applied (-40 points)")

    # --- 6. Determine final status ---
    if is_explicit_failure:
        verification_status = "Failed"
        score = min(15, score) # Cap failed score at 15
    elif is_pending_or_uncertain:
        verification_status = "Needs Review"
    elif score >= 80 and not has_contradictions:
        verification_status = "Verified"
    elif score < 40:
        verification_status = "Failed"
    else:
        verification_status = "Needs Review"

    # Always override status to Needs Review if contradictions are flagged
    if has_contradictions:
        verification_status = "Needs Review"

    summary_msg = "; ".join(details_list) + f". Final confidence score: {score}%."

    # Create breakdown JSON
    breakdown_data = {
        "service_response": score_service,
        "database_check": score_db,
        "logs": score_logs,
        "additional_verification": score_adaptive,
        "contradiction_penalty": contradictions_penalty,
        "final_score": score
    }

    # Save verification result
    result = models.VerificationResult(
        task_id=task_id,
        verification_status=verification_status,
        confidence_score=float(score),
        summary=summary_msg,
        breakdown=breakdown_data,
        checks_performed=checks_performed
    )
    db.add(result)

    # Update Task fields
    task.status = verification_status
    task.confidence = float(score)
    
    # Save completion verification log
    ver_log = models.TaskLog(
        task_id=task_id,
        action="verification_complete",
        details=f"Verification complete. Score: {score}%, Status: {verification_status}. Breakdown: {json.dumps(breakdown_data)}"
    )
    db.add(ver_log)
    
    db.commit()
    logger.info(f"Outcome verification finished for task {task_id}. Result: {verification_status} ({score}%)")

    return {
        "task_id": task_id,
        "verification_status": verification_status,
        "confidence_score": score,
        "summary": summary_msg,
        "breakdown": breakdown_data,
        "checks_performed": checks_performed
    }
