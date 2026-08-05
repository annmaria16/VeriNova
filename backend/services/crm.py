import logging
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

def execute_crm_update(email: str, status: str, fullname: str = None, phone: str = None, db: Session = None) -> dict:
    """
    Updates or inserts a customer record in the local database and returns the row.
    Display Name in UI: CRM Service
    """
    if db is None:
        logger.error("Database session is required for CRM service update.")
        return {
            "status": "failed",
            "service": "CRM Service",
            "error": "Database session not provided"
        }

    logger.info(f"Executing CRM update for customer {email} (status={status}, fullname={fullname}, phone={phone})...")

    # Look up customer
    customer = db.query(models.Customer).filter(models.Customer.email == email).first()

    if not customer:
        logger.info(f"Customer {email} not found in local DB. Creating new record...")
        customer = models.Customer(
            email=email,
            fullname=fullname or email.split('@')[0].title(),
            phone=phone or "+1-555-0100",
            status=status or "active"
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    else:
        logger.info(f"Updating existing customer record for {email}...")
        customer.status = status
        if fullname:
            customer.fullname = fullname
        if phone:
            customer.phone = phone
        db.commit()
        db.refresh(customer)

    # Return updated row as evidence dictionary
    return {
        "status": "updated",
        "service": "CRM Service",
        "customer": {
            "id": customer.id,
            "fullname": customer.fullname,
            "email": customer.email,
            "phone": customer.phone,
            "status": customer.status,
            "updated_at": customer.updated_at.isoformat() if customer.updated_at else None
        },
        "message": f"Successfully updated customer record for {email}."
    }
