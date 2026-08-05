import os
import secrets
import logging

logger = logging.getLogger(__name__)

def execute_payment_refund(amount: float, order_id: str) -> dict:
    """
    Executes a refund via Razorpay test mode or falls back to simulation.
    Display Name in UI: Payment Service
    """
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if key_id and key_secret:
        try:
            import razorpay
            logger.info("Initializing Razorpay client...")
            client = razorpay.Client(auth=(key_id, key_secret))
            # In a real integration, the order_id is a Razorpay payment_id (e.g. pay_XXXXXX)
            # Create a refund request
            refund = client.refund.create({
                "payment_id": order_id,
                "amount": int(amount * 100)  # Razorpay expects amount in paise
            })
            logger.info(f"Razorpay refund successful: {refund}")
            return {
                "status": "refunded",
                "service": "Razorpay Test Mode",
                "transaction_id": refund.get("id"),
                "amount": amount,
                "order_id": order_id,
                "raw_response": refund
            }
        except ImportError:
            logger.warning("razorpay package not installed. Falling back to simulation.")
        except Exception as e:
            logger.error(f"Razorpay API call failed: {str(e)}. Falling back to simulation.")
            return {
                "status": "failed",
                "service": "Razorpay Test Mode",
                "transaction_id": None,
                "amount": amount,
                "order_id": order_id,
                "error": str(e)
            }

    # Simulation fallback
    logger.info("Running simulated payment refund...")
    if "fail" in str(order_id).lower() or amount <= 0:
        return {
            "status": "failed",
            "service": "Razorpay Sandbox (Simulated)",
            "transaction_id": None,
            "amount": amount,
            "order_id": order_id,
            "error": "Transaction not found or insufficient funds for refund"
        }
    else:
        return {
            "status": "refunded",
            "service": "Razorpay Sandbox (Simulated)",
            "transaction_id": f"rfnd_{secrets.token_hex(8)}",
            "amount": amount,
            "order_id": order_id,
            "message": "Refund processed and settled"
        }
