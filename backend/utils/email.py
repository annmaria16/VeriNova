import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger("verinova.email")

def send_password_reset_email(to_email: str, reset_link: str):
    email_address = os.getenv("EMAIL_ADDRESS")
    email_password = os.getenv("EMAIL_PASSWORD")

    # Fallback to console in Development Mode if credentials are missing
    if not email_address or not email_password:
        logger.warning("SMTP credentials not configured in environment variables. Falling back to console.")
        print("\n" + "="*80)
        print("DEVELOPMENT ONLY - PASSWORD RESET URL Generated")
        print(f"To: {to_email}")
        print(f"Reset Link: {reset_link}")
        print("="*80 + "\n")
        return

    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "VERINOVA Password Reset"
        msg['From'] = f"VeriNova AI <{email_address}>"
        msg['To'] = to_email

        # Plain text content
        text = f"Hello,\n\nWe received a request to reset your VERINOVA password.\n\nClick the link below to create a new password:\n{reset_link}\n\nThis link expires in 30 minutes.\n\nIf you did not request this, you can safely ignore this email.\n\nVERINOVA"
        
        # HTML content styled with VeriNova's brand aesthetics
        html = f"""\
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ede7e2; border-radius: 12px; background-color: #fffcf9;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #ff6b00; margin: 0; font-weight: 800; font-size: 24px;">VERINOVA AI</h2>
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #666666; font-weight: bold;">Outcome Verification</span>
            </div>
            <p>Hello,</p>
            <p>We received a request to reset your VERINOVA password.</p>
            <p>Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{reset_link}" style="background-color: #ff6b00; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(255, 107, 0, 0.2);">Reset Password</a>
            </div>
            <p>This link expires in 30 minutes.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #ede7e2; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999999; text-align: center;">VERINOVA</p>
          </body>
        </html>
        """

        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # Connect to Gmail SMTP server
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(email_address, email_password)
        server.sendmail(email_address, to_email, msg.as_string())
        server.quit()
        logger.info(f"Password reset email successfully sent to {to_email}")

    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        # Print fallback to console in case of any SMTP error so development is not blocked
        print("\n" + "="*80)
        print("DEVELOPMENT ONLY - PASSWORD RESET URL Generated (SMTP ERROR FALLBACK)")
        print(f"To: {to_email}")
        print(f"Reset Link: {reset_link}")
        print(f"Error details: {str(e)}")
        print("="*80 + "\n")
