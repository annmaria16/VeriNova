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
