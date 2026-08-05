import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

def execute_send_email(to_email: str, message: str) -> dict:
    """
    Sends an email using Gmail SMTP or SendGrid, or falls back to simulation.
    Display Name in UI: Email Service
    """
    email_address = os.getenv("EMAIL_ADDRESS")
    email_password = os.getenv("EMAIL_PASSWORD")
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")

    # SendGrid option
    if sendgrid_api_key:
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content
            logger.info("Initializing SendGrid client...")
            sg = sendgrid.SendGridAPIClient(api_key=sendgrid_api_key)
            from_email = Email(os.getenv("FROM_EMAIL", "verify@verinova.ai"))
            to_email_obj = To(to_email)
            subject = "VeriNova Automated Notification"
            content = Content("text/plain", message)
            mail = Mail(from_email, to_email_obj, subject, content)
            
            response = sg.client.mail.send.post(request_body=mail.get())
            logger.info(f"SendGrid sent status code: {response.status_code}")
            return {
                "status": "sent",
                "service": "SendGrid API",
                "to": to_email,
                "message_snippet": message[:100],
                "status_code": response.status_code
            }
        except ImportError:
            logger.warning("sendgrid package not installed. Trying SMTP or falling back.")
        except Exception as e:
            logger.error(f"SendGrid failed: {str(e)}")

    # SMTP option (using Gmail SMTP or custom server)
    if email_address and email_password:
        try:
            logger.info("Sending email via SMTP...")
            msg = MIMEMultipart()
            msg["Subject"] = "VeriNova Automated Notification"
            msg["From"] = email_address
            msg["To"] = to_email
            msg.attach(MIMEText(message, "plain"))

            server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
            server.starttls()
            server.login(email_address, email_password)
            server.sendmail(email_address, [to_email], msg.as_string())
            server.quit()
            
            logger.info("Email sent successfully via SMTP.")
            return {
                "status": "sent",
                "service": "SMTP Service",
                "to": to_email,
                "message_snippet": message[:100]
            }
        except Exception as e:
            logger.error(f"SMTP failed: {str(e)}")

    # Simulation fallback
    logger.info("Running simulated email delivery...")
    if "fail" in to_email.lower():
        return {
            "status": "failed",
            "service": "Email Simulator",
            "to": to_email,
            "error": "Simulated SMTP relay connection timed out"
        }
    else:
        return {
            "status": "sent",
            "service": "Email Simulator",
            "to": to_email,
            "message_snippet": message[:100],
            "details": "Simulated successful delivery to standard SMTP mailbox"
        }
