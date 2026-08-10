import logging
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

def collect_and_save_evidence(task_id: str, service_response: dict, db_check_data: dict, logs: list, db: Session) -> list:
    """
    Saves service response, database verification checks, and execution logs
    to the evidence table. Zero user file-upload required.
    """
    logger.info(f"Collecting and saving evidence for task {task_id}...")
    evidence_records = []

    # 1. Save Service Response
    api_ev = models.Evidence(
        task_id=task_id,
        evidence_type="api_response",
        evidence_data=service_response
    )
    db.add(api_ev)
    evidence_records.append(api_ev)

    # 2. Save Database Consistency Check
    db_ev = models.Evidence(
        task_id=task_id,
        evidence_type="database_check",
        evidence_data=db_check_data
    )
    db.add(db_ev)
    evidence_records.append(db_ev)

    # 3. Save Execution Logs
    logs_ev = models.Evidence(
        task_id=task_id,
        evidence_type="logs",
        evidence_data={"logs": logs}
    )
    db.add(logs_ev)
    evidence_records.append(logs_ev)

    # 4. Save Relevant task/reference record
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task:
        ref_data = {
            "task_id": task.id,
            "name": task.name,
            "description": task.description,
            "expected_outcome": task.expected_outcome,
            "task_type": task.task_type,
            "reference_id": task.reference_id,
            "priority": task.priority,
            "date": task.date,
            "status": task.status,
            "confidence": task.confidence
        }
        ref_ev = models.Evidence(
            task_id=task_id,
            evidence_type="reference_record",
            evidence_data=ref_data
        )
        db.add(ref_ev)
        evidence_records.append(ref_ev)

    # Add task logs indicating evidence was collected
    ev_log = models.TaskLog(
        task_id=task_id,
        action="evidence_collection",
        details="Automatically compiled service response, database check, execution logs, and relevant task reference record."
    )
    db.add(ev_log)

    db.commit()
    logger.info(f"Successfully saved {len(evidence_records)} evidence records to DB.")
    return evidence_records
