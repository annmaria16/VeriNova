import logging
import secrets
import os
import json
import re
import urllib.request
import urllib.parse
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from database import engine, get_db, Base, SessionLocal
import models
import schemas
import auth

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OAuth environment variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

def make_http_request(url: str, method: str = "GET", headers: dict = None, data: dict = None):
    headers = headers or {}
    req_data = None
    if data is not None:
        if headers.get("Content-Type") == "application/json":
            req_data = json.dumps(data).encode("utf-8")
        else:
            req_data = urllib.parse.urlencode(data).encode("utf-8")
            if "Content-Type" not in headers:
                headers["Content-Type"] = "application/x-www-form-urlencoded"
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        logger.error(f"HTTPError to {url}: {e.code} - {error_body}")
        try:
            return json.loads(error_body)
        except Exception:
            raise Exception(f"Request failed: {e.code} - {error_body}")

# Initialize DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="VeriNova AI API", version="1.0.0")

@app.on_event("startup")
def startup_db_migration():
    logger.info("Running startup DB migration to ensure password column is nullable and reset columns exist")
    with engine.connect() as connection:
        try:
            # Check if reports table has 'report_name' column (old schema)
            res = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'report_name'")).fetchone()
            if res:
                logger.info("Detected old reports table schema. Dropping and recreating reports table...")
                connection.execute(text("DROP TABLE IF EXISTS reports CASCADE"))
                connection.commit()
                Base.metadata.create_all(bind=engine)
                
            # Check if notifications table has 'status' column (old schema)
            res_notif = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'status'")).fetchone()
            if res_notif:
                logger.info("Detected old notifications table schema. Dropping and recreating notifications table...")
                connection.execute(text("DROP TABLE IF EXISTS notifications CASCADE"))
                connection.commit()
                Base.metadata.create_all(bind=engine)
                
            # Users migrations
            connection.execute(text("ALTER TABLE users ALTER COLUMN password DROP NOT NULL"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP NULL"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'standard_user'"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL"))
            
            # Tasks migrations
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) NULL"))
            connection.execute(text("ALTER TABLE tasks ALTER COLUMN task_type DROP NOT NULL"))
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium'"))
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"))
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50) NULL"))
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS method VARCHAR(100) NULL"))
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NULL"))
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS date VARCHAR(10) NULL"))
            connection.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100) NULL"))
            
            # Reports migrations
            connection.execute(text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_path VARCHAR(500) NULL"))
            
            connection.commit()
            logger.info("Successfully completed all startup DB migrations.")
        except Exception as e:
            logger.error(f"Error altering tables during startup DB migration: {str(e)}")
            pass

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify front-end domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Initial Data Helper
def seed_user_data(db: Session, user_id: int):
    logger.info(f"Seeding database for user_id: {user_id}")
    
    # 1. Seed Tasks (Total = 28: Verified = 22, Pending = 4, Failed = 2)
    initial_tasks = [
        {
            "id": f"task-1-{user_id}",
            "name": "Generate Monthly Report",
            "description": "Generates user analytics and cost reports for June 2026.",
            "expected_outcome": "PDF generated and sent to S3 bucket reports/june-2026.pdf",
            "evidence_type": "logs",
            "method": "Autonomous Agent Audit",
            "status": "Verified",
            "confidence": 98.0,
            "date": "2026-07-24"
        },
        {
            "id": f"task-2-{user_id}",
            "name": "Deploy Application",
            "description": "Deploys service containers to production cluster.",
            "expected_outcome": "Pod status running and ingress responding with 200 OK",
            "evidence_type": "logs",
            "method": "Code Execution Sandbox",
            "status": "Running",
            "confidence": None,
            "date": "2026-07-24"
        },
        {
            "id": f"task-3-{user_id}",
            "name": "Send Email Campaign",
            "description": "Send product update email notification to active subscriber lists.",
            "expected_outcome": "All 12,450 emails processed without SMTP relay failure",
            "evidence_type": "api_response",
            "method": "LLM Assertions",
            "status": "Failed",
            "confidence": 35.0,
            "date": "2026-07-23"
        },
        {
            "id": f"task-4-{user_id}",
            "name": "Database Backup",
            "description": "Executes pg_dump on primary production schema.",
            "expected_outcome": "Database archive written to secure cold storage, integrity check pass",
            "evidence_type": "logs",
            "method": "Regex Pattern Matcher",
            "status": "Verified",
            "confidence": 100.0,
            "date": "2026-07-23"
        },
        {
            "id": f"task-5-{user_id}",
            "name": "Verify Cloud API Gateway",
            "description": "Check OAuth authorization token delegation endpoints.",
            "expected_outcome": "Token validation response latency under 15ms",
            "evidence_type": "api_response",
            "method": "LLM Assertions",
            "status": "Verified",
            "confidence": 95.0,
            "date": "2026-07-22"
        },
        {
            "id": f"task-6-{user_id}",
            "name": "Kubernetes Namespace Cleanup",
            "description": "Delete ephemeral test namespaces older than 48 hours.",
            "expected_outcome": "Namespaces deleted, releasing allocated cluster memory quota",
            "evidence_type": "logs",
            "method": "Autonomous Agent Audit",
            "status": "Verified",
            "confidence": 92.0,
            "date": "2026-07-22"
        },
        {
            "id": f"task-7-{user_id}",
            "name": "Audit IAM Policies",
            "description": "Audit wildcard permissions on cloud console users.",
            "expected_outcome": "Zero wildcard user bindings active on non-admin accounts",
            "evidence_type": "logs",
            "method": "Autonomous Agent Audit",
            "status": "Failed",
            "confidence": 48.0,
            "date": "2026-07-21"
        },
        {
            "id": f"task-8-{user_id}",
            "name": "Test User Registration Endpoint",
            "description": "Simulate registration requests and check token output.",
            "expected_outcome": "Returns HTTP 201 with auth bearer payload",
            "evidence_type": "api_response",
            "method": "Code Execution Sandbox",
            "status": "Verified",
            "confidence": 99.0,
            "date": "2026-07-21"
        },
        {
            "id": f"task-9-{user_id}",
            "name": "Scan Code Base for API Keys",
            "description": "Run TruffleHog scanner over main git branches.",
            "expected_outcome": "Zero secret keys discovered in repository files",
            "evidence_type": "logs",
            "method": "Regex Pattern Matcher",
            "status": "Verified",
            "confidence": 100.0,
            "date": "2026-07-20"
        },
        {
            "id": f"task-10-{user_id}",
            "name": "Check Redis Memory Consumption",
            "description": "Verify eviction parameters and memory utilization metrics.",
            "expected_outcome": "Memory consumption stays below 80% maximum cache size",
            "evidence_type": "sensor_data",
            "method": "Regex Pattern Matcher",
            "status": "Verified",
            "confidence": 96.0,
            "date": "2026-07-20"
        },
        {
            "id": f"task-11-{user_id}",
            "name": "Simulate DDoS Traffic Load",
            "description": "Trigger stress test on edge CDN firewall rules.",
            "expected_outcome": "Firewall blocks malicious spikes while leaving legit routes available",
            "evidence_type": "sensor_data",
            "method": "LLM Assertions",
            "status": "Verified",
            "confidence": 89.0,
            "date": "2026-07-19"
        }
    ]

    # Remaining Verified tasks to add: 22 - 8 = 14 tasks
    for i in range(12, 26):
        initial_tasks.append({
            "id": f"task-{i}-{user_id}",
            "name": f"Automated Service Audit {i}",
            "description": f"Continuous background validation check for microservice module {i}.",
            "expected_outcome": "Return status OK and zero error logs in past 1 hour",
            "evidence_type": "logs",
            "method": "Regex Pattern Matcher",
            "status": "Verified",
            "confidence": 90.0 + (i % 11),
            "date": "2026-07-18"
        })
    
    # 2 Pending tasks
    for i in range(26, 28):
        initial_tasks.append({
            "id": f"task-{i}-{user_id}",
            "name": f"Pending Task Validation {i}",
            "description": f"Awaiting execution trigger for system hook validation {i}.",
            "expected_outcome": "Webhook request successfully received and parsed",
            "evidence_type": "api_response",
            "method": "LLM Assertions",
            "status": "Pending",
            "confidence": None,
            "date": "2026-07-17"
        })

    # Add tasks to DB
    for task_data in initial_tasks:
        task = models.Task(**task_data, user_id=user_id)
        db.add(task)
    
    # 2. Seed Verification Logs
    initial_logs = [
        {"task_id": f"task-1-{user_id}", "step": 1, "message": "Fetching artifact from AWS S3 bucket: reports/june-2026.pdf"},
        {"task_id": f"task-1-{user_id}", "step": 2, "message": "Parsing document metadata. Signature matches VeriNova CA."},
        {"task_id": f"task-1-{user_id}", "step": 3, "message": "Verifying text accuracy. Checked 45 columns, integrity score: 100%."},
        {"task_id": f"task-1-{user_id}", "step": 4, "message": "Task verification completed successfully. Confidence: 98%."},
        {"task_id": f"task-3-{user_id}", "step": 1, "message": "Connecting to SMTP relay server relay.verinova.ai:587..."},
        {"task_id": f"task-3-{user_id}", "step": 2, "message": "Warning: Socket timeout during authentication handshake. Retrying..."},
        {"task_id": f"task-3-{user_id}", "step": 3, "message": "Fatal: SMTP Authentication failed. Error code: 535."},
    ]
    for log_data in initial_logs:
        log = models.VerificationLog(**log_data)
        db.add(log)



    # 4. Seed Reports
    initial_reports = [
        {
            "id": f"report-1-{user_id}",
            "name": "monthly_analytics_june_2026.pdf",
            "type": "PDF",
            "timestamp": "2026-07-24 14:32",
            "status": "Generated",
            "size": "2.4 MB"
        },
        {
            "id": f"report-2-{user_id}",
            "name": "security_audit_logs.csv",
            "type": "CSV",
            "timestamp": "2026-07-23 09:15",
            "status": "Generated",
            "size": "856 KB"
        },
        {
            "id": f"report-3-{user_id}",
            "name": "cluster_perf_metrics.xlsx",
            "type": "EXCEL",
            "timestamp": "2026-07-22 18:45",
            "status": "Generated",
            "size": "5.1 MB"
        }
    ]
    for report_data in initial_reports:
        report = models.Report(**report_data, user_id=user_id)
        db.add(report)

    db.commit()
    logger.info("Database seeding finished.")


# =====================================================================
# API Endpoints
# =====================================================================

# POST /api/auth/register
@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered."
        )
    
    hashed_password = auth.get_password_hash(user_in.password)
    db_user = models.User(
        fullname=user_in.fullname,
        email=user_in.email,
        password=hashed_password,
        provider="email"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    try:
        seed_user_data(db, db_user.id)
    except Exception as e:
        logger.error(f"Seeding user data failed: {str(e)}")
        pass

    return db_user


# POST /api/auth/login
@app.post("/api/auth/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if db_user.password is None or not auth.verify_password(login_in.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_418_IM_A_TEAPOT if db_user.password is None else status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Track user session
    session_token = secrets.token_urlsafe(32)
    session_expires = datetime.utcnow() + timedelta(days=7)
    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )
    db.add(db_session)
    db.commit()

    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# POST /api/auth/oauth
@app.post("/api/auth/oauth", response_model=schemas.Token)
def oauth_login(oauth_in: schemas.OAuthLoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == oauth_in.email).first()
    if not db_user:
        db_user = models.User(
            fullname=oauth_in.fullname,
            email=oauth_in.email,
            password=None,
            provider=oauth_in.provider
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        try:
            seed_user_data(db, db_user.id)
        except Exception as e:
            logger.error(f"Seeding user data failed: {str(e)}")
            pass
            
    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# GET /api/auth/google/login
@app.get("/api/auth/google/login")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Client ID is not configured in backend environment."
        )
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


# GET /api/auth/google/callback
@app.get("/api/auth/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth credentials not configured."
        )
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": f"{BACKEND_URL}/api/auth/google/callback",
        "grant_type": "authorization_code"
    }
    
    try:
        token_res = make_http_request(token_url, method="POST", data=data)
        access_token = token_res.get("access_token")
        if not access_token:
            raise Exception(token_res.get("error_description") or "No access token returned from Google.")
    except Exception as e:
        logger.error(f"Google token exchange failed: {str(e)}")
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error={urllib.parse.quote(str(e))}")
        
    # Get user profile
    profile_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
    try:
        profile = make_http_request(profile_url)
        email = profile.get("email")
        fullname = profile.get("name", email.split('@')[0] if email else "Google User")
        google_id = profile.get("sub")
        picture = profile.get("picture")
        if not email:
            raise Exception("No email in Google profile.")
    except Exception as e:
        logger.error(f"Google user profile fetch failed: {str(e)}")
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error={urllib.parse.quote(str(e))}")

    # Check database
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        # Create user automatically
        db_user = models.User(
            fullname=fullname,
            email=email,
            password=None,
            provider="google"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        try:
            seed_user_data(db, db_user.id)
        except Exception as e:
            logger.error(f"Seeding user data failed: {str(e)}")
            pass
            
    # Save/update OAuth account info
    oauth_acc = db.query(models.OAuthAccount).filter(
        models.OAuthAccount.provider == "google",
        models.OAuthAccount.provider_user_id == google_id
    ).first()
    if not oauth_acc:
        oauth_acc = models.OAuthAccount(
            user_id=db_user.id,
            provider="google",
            provider_user_id=google_id,
            profile_image=picture
        )
        db.add(oauth_acc)
        db.commit()
    elif oauth_acc.profile_image != picture:
        oauth_acc.profile_image = picture
        db.commit()
        
    # Create secure session
    session_token = secrets.token_urlsafe(32)
    session_expires = datetime.utcnow() + timedelta(days=7)
    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )
    db.add(db_session)
    db.commit()
    
    # Generate JWT
    jwt_token = auth.create_access_token(data={"sub": db_user.email})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt_token}")


# GET /api/auth/github/login
@app.get("/api/auth/github/login")
def github_login():
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub Client ID is not configured in backend environment."
        )
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/api/auth/github/callback",
        "scope": "user:email"
    }
    url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


# GET /api/auth/github/callback
@app.get("/api/auth/github/callback")
def github_callback(code: str, db: Session = Depends(get_db)):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub OAuth credentials not configured."
        )
    # Exchange code for tokens
    token_url = "https://github.com/login/oauth/access_token"
    data = {
        "code": code,
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "redirect_uri": f"{BACKEND_URL}/api/auth/github/callback"
    }
    headers = {
        "Accept": "application/json"
    }
    
    try:
        token_res = make_http_request(token_url, method="POST", headers=headers, data=data)
        access_token = token_res.get("access_token")
        if not access_token:
            raise Exception(token_res.get("error_description") or "No access token returned from GitHub.")
    except Exception as e:
        logger.error(f"GitHub token exchange failed: {str(e)}")
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error={urllib.parse.quote(str(e))}")
        
    # Get user profile
    profile_url = "https://api.github.com/user"
    profile_headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "VeriNova-App"
    }
    try:
        profile = make_http_request(profile_url, headers=profile_headers)
        github_id = str(profile.get("id"))
        fullname = profile.get("name") or profile.get("login") or f"GitHub User {github_id}"
        picture = profile.get("avatar_url")
        email = profile.get("email")
        
        # If email is not public, fetch primary email
        if not email:
            emails_url = "https://api.github.com/user/emails"
            emails = make_http_request(emails_url, headers=profile_headers)
            primary_email = next((e.get("email") for e in emails if e.get("primary")), None)
            email = primary_email or (emails[0].get("email") if emails else None)
            
        if not email:
            raise Exception("No primary email found in GitHub account.")
    except Exception as e:
        logger.error(f"GitHub user profile fetch failed: {str(e)}")
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error={urllib.parse.quote(str(e))}")

    # Check database
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        # Create user automatically
        db_user = models.User(
            fullname=fullname,
            email=email,
            password=None,
            provider="github"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        try:
            seed_user_data(db, db_user.id)
        except Exception as e:
            logger.error(f"Seeding user data failed: {str(e)}")
            pass
            
    # Save/update OAuth account info
    oauth_acc = db.query(models.OAuthAccount).filter(
        models.OAuthAccount.provider == "github",
        models.OAuthAccount.provider_user_id == github_id
    ).first()
    if not oauth_acc:
        oauth_acc = models.OAuthAccount(
            user_id=db_user.id,
            provider="github",
            provider_user_id=github_id,
            profile_image=picture
        )
        db.add(oauth_acc)
        db.commit()
    elif oauth_acc.profile_image != picture:
        oauth_acc.profile_image = picture
        db.commit()
        
    # Create secure session
    session_token = secrets.token_urlsafe(32)
    session_expires = datetime.utcnow() + timedelta(days=7)
    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )
    db.add(db_session)
    db.commit()
    
    # Generate JWT
    jwt_token = auth.create_access_token(data={"sub": db_user.email})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={jwt_token}")


# Helper to send OTP email
def send_otp_email(to_email: str, otp_code: str):
    subject = "VeriNova Password Reset Verification"
    
    # HTML template matching green modern cyber style
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeriNova Password Reset</title>
  <style>
    body {{
      background-color: #08120F;
      color: #E2E8F0;
      font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      background-color: #08120F;
      padding: 40px 20px;
    }}
    .container {{
      max-width: 500px;
      margin: 0 auto;
      background-color: #10211C;
      border: 1px solid #14532D;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
    }}
    .logo-container {{
      text-align: center;
      margin-bottom: 24px;
    }}
    .logo {{
      color: #22C55E;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 1px;
      margin: 0;
      text-transform: uppercase;
    }}
    .logo-subtitle {{
      color: #94A3B8;
      font-size: 11px;
      letter-spacing: 0.5px;
      margin-top: 4px;
      text-transform: uppercase;
    }}
    .divider {{
      border: 0;
      height: 1px;
      background: #14532D;
      margin: 20px 0;
    }}
    h2 {{
      color: #FFFFFF;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      text-align: center;
    }}
    p {{
      color: #94A3B8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }}
    .otp-card {{
      background-color: #08120F;
      border: 1px dashed #22C55E;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      color: #22C55E;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      margin: 0;
      font-family: monospace;
    }}
    .footer {{
      text-align: center;
      margin-top: 32px;
      font-size: 11px;
      color: #475569;
      line-height: 1.5;
    }}
    .footer a {{
      color: #475569;
      text-decoration: none;
      margin: 0 6px;
    }}
    .footer a:hover {{
      color: #22C55E;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo-container">
        <h1 class="logo">VeriNova</h1>
        <div class="logo-subtitle">AI-Powered Intelligent Task Verification Platform</div>
      </div>
      <div class="divider"></div>
      <h2>Password Reset Verification</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password.</p>
      <p>Your verification code is:</p>
      <div class="otp-card">
        <div class="otp-code">{otp_code}</div>
      </div>
      <p>This code expires in 5 minutes.</p>
      <p>Never share this OTP with anyone.</p>
      <p>If you didn't request this password reset, simply ignore this email.</p>
      <p>Regards,<br>VeriNova Team</p>
    </div>
    <div class="footer">
      <p>VeriNova<br>AI-Powered Intelligent Task Verification Platform</p>
      <p>
        <a href="{FRONTEND_URL}/privacy">Privacy Policy</a> | 
        <a href="{FRONTEND_URL}/terms">Terms & Conditions</a>
      </p>
      <p>&copy; 2026 VeriNova. All rights reserved.</p>
    </div>
  </div>
</body>
</html>"""

    # Plain text version matching user's spec exactly:
    text_content = f"""VeriNova

AI-Powered Intelligent Task Verification Platform

Password Reset Verification

Hello,

We received a request to reset your password.

Your verification code is:

{otp_code}

This code expires in 5 minutes.

Never share this OTP with anyone.

If you didn't request this password reset, simply ignore this email.

Regards,
VeriNova Team"""

    email_address = os.getenv("EMAIL_ADDRESS")
    email_password = os.getenv("EMAIL_PASSWORD")
    
    if not email_address or not email_password:
        logger.error("Gmail SMTP configuration missing. EMAIL_ADDRESS or EMAIL_PASSWORD not set in environment.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = email_address
        msg["To"] = to_email
        
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)
        
        # Connect to Gmail SMTP server using TLS on port 587
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(email_address, email_password)
        server.sendmail(email_address, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Successfully sent OTP email to {to_email} via Gmail SMTP.")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email} via Gmail SMTP: {str(e)}")


# POST /api/auth/forgot-password
@app.post("/api/auth/forgot-password")
def forgot_password(forgot_in: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Account Privacy: Use generic message for success/failure
    generic_success_response = {
        "message": "If an account exists with this email, a verification code has been sent."
    }
    
    db_user = db.query(models.User).filter(models.User.email == forgot_in.email).first()
    if not db_user:
        return generic_success_response



    # Invalidate previous OTP requests for this user
    db.query(models.PasswordResetOTP).filter(
        models.PasswordResetOTP.user_id == db_user.id
    ).delete()
    
    # Generate 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(1000000):06d}"
    otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    # Save OTP to PostgreSQL
    otp_record = models.PasswordResetOTP(
        user_id=db_user.id,
        otp_hash=otp_hash,
        expires_at=expires_at,
        purpose="password_reset",
        attempts=0,
        verified=False
    )
    db.add(otp_record)
    db.commit()
    
    # Send email
    send_otp_email(db_user.email, otp_code)
    
    return generic_success_response


# POST /api/auth/resend-reset-otp
@app.post("/api/auth/resend-reset-otp")
def resend_reset_otp(resend_in: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    generic_success_response = {
        "message": "If an account exists with this email, a verification code has been sent."
    }
    
    db_user = db.query(models.User).filter(models.User.email == resend_in.email).first()
    if not db_user:
        return generic_success_response



    # Invalidate previous OTP requests for this user
    db.query(models.PasswordResetOTP).filter(
        models.PasswordResetOTP.user_id == db_user.id
    ).delete()
    
    # Generate 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(1000000):06d}"
    otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    # Save OTP to PostgreSQL
    otp_record = models.PasswordResetOTP(
        user_id=db_user.id,
        otp_hash=otp_hash,
        expires_at=expires_at,
        purpose="password_reset",
        attempts=0,
        verified=False
    )
    db.add(otp_record)
    db.commit()
    
    # Send email
    send_otp_email(db_user.email, otp_code)
    
    return generic_success_response


# POST /api/auth/verify-reset-otp
@app.post("/api/auth/verify-reset-otp")
def verify_reset_otp(verify_in: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    if len(verify_in.otp) != 6 or not verify_in.otp.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again."
        )

    db_user = db.query(models.User).filter(models.User.email == verify_in.email).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again."
        )
        
    otp_record = db.query(models.PasswordResetOTP).filter(
        models.PasswordResetOTP.user_id == db_user.id,
        models.PasswordResetOTP.purpose == "password_reset"
    ).order_by(models.PasswordResetOTP.created_at.desc()).first()
    
    if not otp_record or otp_record.verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again."
        )
        
    if otp_record.attempts >= 5:
        otp_record.expires_at = datetime.utcnow()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new OTP."
        )
        
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has expired. Please request a new OTP."
        )
        
    input_hash = hashlib.sha256(verify_in.otp.encode("utf-8")).hexdigest()
    if input_hash != otp_record.otp_hash:
        otp_record.attempts += 1
        db.commit()
        if otp_record.attempts >= 5:
            otp_record.expires_at = datetime.utcnow()
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many incorrect attempts. Please request a new OTP."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again."
        )
        
    otp_record.verified = True
    reset_token = secrets.token_urlsafe(32)
    reset_token_expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    otp_record.reset_token = reset_token
    otp_record.reset_token_expires_at = reset_token_expires_at
    db.commit()
    
    return {
        "reset_token": reset_token,
        "message": "OTP Verified"
    }


# POST /api/auth/reset-password
@app.post("/api/auth/reset-password")
def reset_password(reset_in: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    otp_record = db.query(models.PasswordResetOTP).filter(
        models.PasswordResetOTP.reset_token == reset_in.token,
        models.PasswordResetOTP.verified == True,
        models.PasswordResetOTP.reset_token_expires_at > datetime.utcnow()
    ).first()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset authorization. Please try again."
        )
        
    db_user = db.query(models.User).filter(models.User.id == otp_record.user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    password = reset_in.password
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters long.")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least one uppercase letter.")
    if not any(c.islower() for c in password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least one lowercase letter.")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least one number.")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:',.<>?/\"`~" for c in password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least one special character.")
    if " " in password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must not contain spaces.")

    db_user.password = auth.get_password_hash(password)
    db.delete(otp_record)
    
    db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == db_user.id).delete()
    db.query(models.UserSession).filter(models.UserSession.user_id == db_user.id).delete()
    
    db.commit()
    return {"message": "Password reset successfully."}


# GET /api/user/profile
@app.get("/api/user/profile", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.put("/api/user/profile", response_model=schemas.UserResponse)
def update_profile(
    profile_in: schemas.ProfileUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    fullname = profile_in.fullname.strip()
    if len(fullname) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full Name must be at least 3 characters long."
        )
    current_user.fullname = fullname
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/api/user/profile/photo", response_model=schemas.UserResponse)
def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Validate format
    allowed_exts = {"jpg", "jpeg", "png", "webp"}
    ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP."
        )
    
    # Check mime type as well
    allowed_content_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content type. Supported formats: JPG, JPEG, PNG, WEBP."
        )

    # Validate size: 5 MB limit
    MAX_SIZE = 5 * 1024 * 1024
    contents = file.file.read()
    file_size = len(contents)
    if file_size > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds the maximum limit of 5 MB."
        )
    
    # Save the file locally
    import os
    import glob
    import time
    
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Remove any existing photo file for this user
    existing_files = glob.glob(os.path.join(upload_dir, f"avatar_{current_user.id}.*"))
    for f in existing_files:
        try:
            os.remove(f)
        except Exception:
            pass
            
    # Write the new file
    file_path = os.path.join(upload_dir, f"avatar_{current_user.id}.{ext}")
    with open(file_path, "wb") as f_out:
        f_out.write(contents)
        
    # Update user's avatar_url in database
    timestamp = int(time.time())
    current_user.avatar_url = f"/api/user/profile/photo/{current_user.id}?t={timestamp}"
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/api/user/profile/photo/{user_id}")
def get_user_profile_photo(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User or profile photo not found."
        )
        
    # Find matching file on disk
    import os
    import glob
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    files = glob.glob(os.path.join(upload_dir, f"avatar_{user_id}.*"))
    if not files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile photo file not found on server."
        )
        
    file_path = files[0]
    ext = file_path.split(".")[-1].lower()
    media_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp"
    }
    media_type = media_types.get(ext, "image/png")
    
    with open(file_path, "rb") as f:
        content = f.read()
    return Response(content=content, media_type=media_type)



# GET /api/tasks/statistics
@app.get("/api/tasks/statistics", response_model=schemas.TaskStatistics)
def get_task_statistics(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    user_tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    
    total = len(user_tasks)
    verified = sum(1 for t in user_tasks if t.status == "Verified")
    pending = sum(1 for t in user_tasks if t.status in ("Pending", "Running"))
    failed = sum(1 for t in user_tasks if t.status == "Failed")
    
    verified_confidences = [t.confidence for t in user_tasks if t.status == "Verified" and t.confidence is not None]
    avg_confidence = sum(verified_confidences) / len(verified_confidences) if verified_confidences else 0.0
    
    return {
        "totalTasks": total,
        "verifiedTasks": verified,
        "pendingTasks": pending,
        "failedTasks": failed,
        "avgConfidence": round(avg_confidence, 1)
    }


# GET /api/dashboard/statistics
@app.get("/api/dashboard/statistics", response_model=schemas.DashboardStatistics)
def get_dashboard_statistics(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.now().date()
    user_tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    
    total = len(user_tasks)
    verified = sum(1 for t in user_tasks if t.status == "Verified")
    pending = sum(1 for t in user_tasks if t.status == "Pending")
    running = sum(1 for t in user_tasks if t.status == "Running")
    failed = sum(1 for t in user_tasks if t.status == "Failed")
    
    verified_confidences = [t.confidence for t in user_tasks if t.status == "Verified" and t.confidence is not None]
    avg_confidence = sum(verified_confidences) / len(verified_confidences) if verified_confidences else 0.0
    
    start_this_week = today - timedelta(days=6)
    start_last_week = today - timedelta(days=13)
    
    this_week_tasks = []
    last_week_tasks = []
    
    for t in user_tasks:
        try:
            t_date = datetime.strptime(t.date, "%Y-%m-%d").date()
            if start_this_week <= t_date <= today:
                this_week_tasks.append(t)
            elif start_last_week <= t_date < start_this_week:
                last_week_tasks.append(t)
        except Exception:
            pass
            
    prev_total = len(last_week_tasks)
    curr_total = len(this_week_tasks)
    
    prev_verified = sum(1 for t in last_week_tasks if t.status == "Verified")
    curr_verified = sum(1 for t in this_week_tasks if t.status == "Verified")
    
    prev_pending = sum(1 for t in last_week_tasks if t.status in ("Pending", "Running"))
    curr_pending = sum(1 for t in this_week_tasks if t.status in ("Pending", "Running"))
    
    prev_failed = sum(1 for t in last_week_tasks if t.status == "Failed")
    curr_failed = sum(1 for t in this_week_tasks if t.status == "Failed")
    
    prev_conf_list = [t.confidence for t in last_week_tasks if t.status == "Verified" and t.confidence is not None]
    curr_conf_list = [t.confidence for t in this_week_tasks if t.status == "Verified" and t.confidence is not None]
    
    prev_avg_conf = sum(prev_conf_list) / len(prev_conf_list) if prev_conf_list else 0.0
    curr_avg_conf = sum(curr_conf_list) / len(curr_conf_list) if curr_conf_list else 0.0

    def make_stat_item(curr_val, prev_val):
        if prev_val == 0:
            return {"value": curr_val, "change": "No previous data", "trend": None}
        
        diff = curr_val - prev_val
        percent_change = round((diff / prev_val) * 100, 1)
        
        if percent_change > 0:
            return {"value": curr_val, "change": f"↑ {percent_change}% from last week", "trend": "up"}
        elif percent_change < 0:
            return {"value": curr_val, "change": f"↓ {abs(percent_change)}% from last week", "trend": "down"}
        else:
            return {"value": curr_val, "change": "0.0% change from last week", "trend": None}
            
    return {
        "totalTasks": make_stat_item(total, prev_total),
        "verifiedTasks": make_stat_item(verified, prev_verified),
        "pendingTasks": make_stat_item(pending + running, prev_pending),
        "failedTasks": make_stat_item(failed, prev_failed),
        "avgConfidence": make_stat_item(round(avg_confidence, 1), round(prev_avg_conf, 1))
    }


# GET /api/dashboard/activity
@app.get("/api/dashboard/activity", response_model=schemas.DashboardActivity)
def get_dashboard_activity(
    filter: str = "last_7_days",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.now().date()
    user_tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    
    if filter == "today":
        today_str = today.strftime("%Y-%m-%d")
        labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
        values = [0] * 6
        
        results = db.query(models.Task.id, models.VerificationLog.timestamp)\
            .join(models.VerificationLog, models.Task.id == models.VerificationLog.task_id)\
            .filter(models.Task.user_id == current_user.id)\
            .filter(models.Task.date == today_str)\
            .filter(models.VerificationLog.step == 1).all()
            
        for task_id, ts in results:
            if ts:
                hour = ts.hour
                bucket = min(hour // 4, 5)
                values[bucket] += 1
                
        today_tasks_count = sum(1 for t in user_tasks if t.date == today_str)
        if sum(values) == 0 and today_tasks_count > 0:
            current_hour = datetime.now().hour
            bucket = min(current_hour // 4, 5)
            values[bucket] = today_tasks_count
            
        return {"labels": labels, "values": values}
        
    elif filter == "last_7_days":
        labels = []
        values = []
        weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            labels.append(weekday_names[d.weekday()])
            count = sum(1 for t in user_tasks if t.date == d_str)
            values.append(count)
            
        return {"labels": labels, "values": values}
        
    elif filter == "last_30_days":
        labels = []
        values = []
        
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            labels.append(d.strftime("%b %d"))
            count = sum(1 for t in user_tasks if t.date == d_str)
            values.append(count)
            
        return {"labels": labels, "values": values}
        
    elif filter == "this_month":
        labels = []
        values = []
        first_day = today.replace(day=1)
        num_days = (today - first_day).days + 1
        
        for i in range(num_days):
            d = first_day + timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            labels.append(d.strftime("%b %d"))
            count = sum(1 for t in user_tasks if t.date == d_str)
            values.append(count)
            
        return {"labels": labels, "values": values}
        
    else:
        raise HTTPException(status_code=400, detail="Invalid filter type")


# GET /api/dashboard/task-status
@app.get("/api/dashboard/task-status", response_model=schemas.DashboardTaskStatus)
def get_dashboard_task_status(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    user_tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    
    total = len(user_tasks)
    verified = sum(1 for t in user_tasks if t.status == "Verified")
    pending = sum(1 for t in user_tasks if t.status == "Pending")
    running = sum(1 for t in user_tasks if t.status == "Running")
    failed = sum(1 for t in user_tasks if t.status == "Failed")
    
    return {
        "total": total,
        "verified": verified,
        "pending": pending,
        "running": running,
        "failed": failed
    }


# GET /api/tasks/recent
@app.get("/api/tasks/recent", response_model=List[schemas.TaskResponse])
def get_recent_tasks(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).order_by(models.Task.date.desc()).all()
    return tasks


# POST /api/tasks
@app.post("/api/tasks", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_in: schemas.TaskCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    task = models.Task(
        id=task_in.id,
        name=task_in.name,
        description=task_in.description,
        expected_outcome=task_in.expected_outcome,
        evidence_type=task_in.evidence_type,
        method=task_in.method,
        status=task_in.status,
        confidence=task_in.confidence,
        date=task_in.date,
        user_id=current_user.id,
        reference_id=task_in.reference_id
    )
    db.add(task)
    db.commit()
    
    # Auto-seed simulated execution steps for this new task
    logs = [
        models.VerificationLog(task_id=task.id, step=1, message="Initializing automated verification sandbox..."),
        models.VerificationLog(task_id=task.id, step=2, message=f"Evaluating evidence type: {task.evidence_type}..."),
        models.VerificationLog(task_id=task.id, step=3, message=f"Verification completed. Confidence: {task.confidence or 100}%."),
    ]
    for log in logs:
        db.add(log)
    db.commit()
    
    db.refresh(task)
    return task


# DELETE /api/tasks/{task_id}
@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return


# GET /api/verifications/recent
@app.get("/api/verifications/recent", response_model=List[schemas.VerificationLogResponse])
def get_recent_verifications(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    recent_logs = db.query(models.VerificationLog)\
                    .join(models.Task)\
                    .filter(models.Task.user_id == current_user.id)\
                    .order_by(models.VerificationLog.timestamp.desc())\
                    .limit(20).all()
    return recent_logs


# GET /api/notifications
@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(models.Notification).filter(models.Notification.user_id == current_user.id).all()
    return notifications


# PATCH /api/notifications/{notif_id}/read
@app.patch("/api/notifications/{notif_id}/read", response_model=schemas.NotificationResponse)
def read_notification(notif_id: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id, models.Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


# POST /api/notifications/read-all
@app.post("/api/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def read_all_notifications(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.user_id == current_user.id).update({models.Notification.read: True})
    db.commit()
    return


# DELETE /api/notifications/{notif_id}
@app.delete("/api/notifications/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(notif_id: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id, models.Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return


# GET /api/reports/recent
@app.get("/api/reports/recent", response_model=List[schemas.ReportResponse])
def get_recent_reports(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    reports = db.query(models.Report).filter(models.Report.user_id == current_user.id).all()
    return reports


# GET /api/products
@app.get("/api/products", response_model=List[schemas.ProductResponse])
def get_products(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Product).filter(models.Product.is_active == True).all()


# GET /api/booking-services
@app.get("/api/booking-services", response_model=List[schemas.BookingServiceResponse])
def get_booking_services(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.BookingService).filter(models.BookingService.is_active == True).all()


# =====================================================================
# PRODUCTS & BOOKING SERVICES SEED DATA
# =====================================================================
def seed_products_and_booking_services(db: Session, admin_id: int, org_id: int):
    # Check if products already exist
    product_count = db.query(models.Product).count()
    if product_count == 0:
        logger.info("Seeding products...")
        products_data = [
            {"name": "iPhone 16", "description": "Latest Apple iPhone 16 with A18 chip and advanced camera control.", "category": "Electronics", "price": 79900.0, "stock": 50, "image_url": "https://images.unsplash.com/photo-1727371752431-7e8e50b1d305?q=80&w=600&auto=format&fit=crop"},
            {"name": "Samsung Galaxy S24", "description": "Flagship Samsung Galaxy S24 with AI features and high-res camera.", "category": "Electronics", "price": 74999.0, "stock": 40, "image_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=600&auto=format&fit=crop"},
            {"name": "MacBook Pro M3", "description": "High-performance Apple MacBook Pro with M3 chip and liquid retina display.", "category": "Electronics", "price": 169900.0, "stock": 15, "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600&auto=format&fit=crop"},
            {"name": "Dell XPS 13", "description": "Premium ultra-thin laptop from Dell with infinity edge display.", "category": "Electronics", "price": 115000.0, "stock": 20, "image_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=600&auto=format&fit=crop"},
            {"name": "HP Pavilion 15", "description": "Versatile HP laptop with Intel i5, ideal for study and work.", "category": "Electronics", "price": 55000.0, "stock": 30, "image_url": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=600&auto=format&fit=crop"},
            {"name": "Sony WH-1000XM5", "description": "Industry leading active noise cancelling wireless headphones from Sony.", "category": "Audio", "price": 29990.0, "stock": 25, "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop"},
            {"name": "iPad Air M2", "description": "Powerful and thin iPad Air featuring Apple M2 chip and support for Apple Pencil.", "category": "Electronics", "price": 59900.0, "stock": 35, "image_url": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=600&auto=format&fit=crop"},
            {"name": "Apple Watch Series 9", "description": "Sleek Apple Watch with crash detection and bright always-on display.", "category": "Wearables", "price": 41900.0, "stock": 45, "image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?q=80&w=600&auto=format&fit=crop"},
            {"name": "LG Ultragear Monitor", "description": "27-inch IPS gaming monitor with 144Hz refresh rate and 1ms response time.", "category": "Electronics", "price": 24500.0, "stock": 18, "image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=600&auto=format&fit=crop"},
            {"name": "Logitech MX Keys Keyboard", "description": "Advanced wireless illuminated keyboard from Logitech.", "category": "Accessories", "price": 12995.0, "stock": 50, "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600&auto=format&fit=crop"},
            {"name": "Logitech MX Master 3S Mouse", "description": "Ergonomic wireless mouse with ultra-fast scroll wheel.", "category": "Accessories", "price": 9495.0, "stock": 60, "image_url": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=600&auto=format&fit=crop"},
            {"name": "OnePlus 12", "description": "High performance Android smartphone from OnePlus with Hasselblad camera.", "category": "Electronics", "price": 64999.0, "stock": 30, "image_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=600&auto=format&fit=crop"}
        ]
        for p in products_data:
            product = models.Product(
                name=p["name"],
                description=p["description"],
                category=p["category"],
                price=p["price"],
                stock=p["stock"],
                image_url=p["image_url"],
                created_by=admin_id,
                organization_id=org_id,
                is_active=True
            )
            db.add(product)
        db.commit()
        logger.info("Products seeded successfully.")

    # Check if booking services already exist
    service_count = db.query(models.BookingService).count()
    if service_count == 0:
        logger.info("Seeding booking services...")
        services_data = [
            {"service_name": "Cricket Turf", "service_type": "Sports", "location": "Bangalore", "price": 1500.0, "capacity": 22},
            {"service_name": "Football Turf", "service_type": "Sports", "location": "Mumbai", "price": 1800.0, "capacity": 14},
            {"service_name": "Badminton Court", "service_type": "Sports", "location": "Delhi", "price": 400.0, "capacity": 4},
            {"service_name": "Swimming Pool", "service_type": "Leisure", "location": "Chennai", "price": 250.0, "capacity": 20},
            {"service_name": "Zoo Entry", "service_type": "Entertainment", "location": "Mysore", "price": 100.0, "capacity": 100},
            {"service_name": "Cinema Hall", "service_type": "Entertainment", "location": "Bangalore", "price": 300.0, "capacity": 150}
        ]
        
        base_time = datetime.now().replace(minute=0, second=0, microsecond=0)
        for s in services_data:
            service = models.BookingService(
                service_name=s["service_name"],
                service_type=s["service_type"],
                location=s["location"],
                price=s["price"],
                capacity=s["capacity"],
                created_by=admin_id,
                organization_id=org_id,
                is_active=True
            )
            db.add(service)
            db.commit() # Commit to get service.id
            
            # Seed future slots for this service
            slots = [
                base_time + timedelta(days=1, hours=10), # Tomorrow 10:00 AM
                base_time + timedelta(days=1, hours=16), # Tomorrow 4:00 PM
                base_time + timedelta(days=2, hours=11), # Day after 11:00 AM
            ]
            for slot_time in slots:
                slot = models.BookingSlot(
                    service_id=service.id,
                    slot_time=slot_time,
                    is_available=True
                )
                db.add(slot)
        db.commit()
        logger.info("Booking services and slots seeded successfully.")


# =====================================================================
# SEED DATA HOOK
# =====================================================================
@app.on_event("startup")
def seed_admin_and_org():
    db = SessionLocal()
    try:
        logger.info("Running admin and organization seeding...")
        # Check if default admin exists
        admin = db.query(models.User).filter(models.User.email == "admin@verinova.com").first()
        if not admin:
            hashed_pw = auth.get_password_hash("Password@123")
            admin = models.User(
                fullname="Susan Admin",
                email="admin@verinova.com",
                password=hashed_pw,
                provider="email",
                role="org_admin",
                organization_id=None
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            logger.info("Admin user seeded (temporary organization_id=None).")

        # Check if default org exists
        org = db.query(models.Organization).filter(models.Organization.invite_code == "vnova-invite-777").first()
        if not org:
            org = models.Organization(
                name="VeriNova Inc.",
                invite_code="vnova-invite-777",
                admin_user_id=admin.id
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            logger.info("Default organization seeded.")

        # Update admin organization_id to point to new organization
        if admin.organization_id is None or admin.organization_id != org.id:
            admin.organization_id = org.id
            db.commit()
            try:
                seed_user_data(db, admin.id)
            except Exception as e:
                logger.error(f"Error seeding tasks for admin: {e}")
            logger.info("Admin user organization linked.")
                
        # Member user
        member = db.query(models.User).filter(models.User.email == "member@verinova.com").first()
        if not member:
            hashed_pw = auth.get_password_hash("Password@123")
            member = models.User(
                fullname="Susy Member",
                email="member@verinova.com",
                password=hashed_pw,
                provider="email",
                role="org_member",
                organization_id=org.id
            )
            db.add(member)
            db.commit()
            try:
                seed_user_data(db, member.id)
            except Exception as e:
                logger.error(f"Error seeding tasks for member: {e}")
            logger.info("Member user seeded.")
                
        # Standard user
        user = db.query(models.User).filter(models.User.email == "user@verinova.com").first()
        if not user:
            hashed_pw = auth.get_password_hash("Password@123")
            user = models.User(
                fullname="Susy User",
                email="user@verinova.com",
                password=hashed_pw,
                provider="email",
                role="standard_user"
            )
            db.add(user)
            db.commit()
            try:
                seed_user_data(db, user.id)
            except Exception as e:
                logger.error(f"Error seeding tasks for user: {e}")
            logger.info("Standard user seeded.")

        # Self-healing: Check if any existing user has 0 tasks and seed their dashboard data
        for u in db.query(models.User).all():
            t_count = db.query(models.Task).filter(models.Task.user_id == u.id).count()
            if t_count == 0:
                logger.info(f"Self-healing: User {u.fullname} (ID: {u.id}) has 0 tasks. Seeding data...")
                try:
                    seed_user_data(db, u.id)
                except Exception as e:
                    logger.error(f"Self-healing: Seeding failed for user {u.fullname}: {str(e)}")
                
        # Seed user settings for all users if missing
        for u in db.query(models.User).all():
            setting = db.query(models.UserSetting).filter(models.UserSetting.user_id == u.id).first()
            if not setting:
                setting = models.UserSetting(
                    user_id=u.id,
                    theme="emerald-dark",
                    language="English",
                    email_notifications=True,
                    push_notifications=False
                )
                db.add(setting)
        
        # Seed Products and Booking Services under the admin user
        if admin and org:
            try:
                seed_products_and_booking_services(db, admin.id, org.id)
            except Exception as e:
                logger.error(f"Error seeding products and booking services: {e}")
                
        db.commit()
    except Exception as e:
        logger.error(f"Seeding admin/org failed: {str(e)}")
    finally:
        db.close()


# =====================================================================
# TASK EXECUTION & CLARIFICATION
# =====================================================================

class RunTaskRequest(BaseModel):
    prompt: str
    priority: Optional[str] = "medium"

@app.post("/api/tasks/run")
def run_task(
    req: RunTaskRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    import uuid
    task_id = f"task-{uuid.uuid4().hex[:8]}"
    
    # Determine name
    name = req.prompt[:40] + "..." if len(req.prompt) > 40 else req.prompt
    
    # Extract intent first to satisfy database constraints
    from agent.orchestrator import parse_intent_llm_or_fallback
    parsed = parse_intent_llm_or_fallback(req.prompt)
    task_type = parsed.get("task_type", "movie")
    
    task = models.Task(
        id=task_id,
        name=name,
        description=req.prompt,
        expected_outcome="Evidence collected and verified automatically by VeriNova.",
        status="Running",
        date=datetime.now().strftime("%Y-%m-%d"),
        user_id=current_user.id,
        task_type=task_type,
        priority=req.priority or "medium"
    )
    db.add(task)
    db.commit()
    
    # Run orchestrator
    from agent.orchestrator import execute_agent_workflow
    result = execute_agent_workflow(task_id, db)
    return result


def validate_clarification(param_name: str, param_value: str):
    """
    Returns (is_valid, error_message)
    """
    val = param_value.strip()
    if not val:
        return False, "Value cannot be empty"
        
    if param_name in ("destination", "origin", "theater", "movie_name"):
        # Should not be purely numeric
        if re.match(r'^\d+$', val):
            return False, f"Invalid {param_name.replace('_', ' ')}. It cannot be purely numeric."
        if len(val) < 2:
            return False, f"Invalid {param_name.replace('_', ' ')}. It must be at least 2 characters long."
            
    elif param_name == "date":
        # Format: YYYY-MM-DD
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', val):
            return False, "Invalid date format. Expected YYYY-MM-DD (e.g. 2026-08-10)."
            
    elif param_name == "amount":
        try:
            amount = float(val)
            if amount <= 0:
                return False, "Amount must be a positive number greater than 0."
        except ValueError:
            return False, "Amount must be a valid number."
            
    elif param_name in ("email", "to_email"):
        if not re.match(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$', val):
            return False, "Invalid email address format."
            
    elif param_name == "showtime":
        if not any(k in val.lower() for k in ["am", "pm", ":"]) and not val.isdigit():
            return False, "Invalid showtime format. E.g. '7 PM' or '19:00'."

    elif param_name == "status":
        if val.lower() not in ["premium", "active", "basic", "disabled", "inactive"]:
            return False, "Invalid status. Expected premium, active, basic, disabled, or inactive."
            
    return True, ""


class ClarifyTaskRequest(BaseModel):
    param_name: str
    param_value: str

@app.post("/api/tasks/{task_id}/clarify")
def clarify_task(
    task_id: str,
    req: ClarifyTaskRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    exec_record = db.query(models.AgentExecution).filter(models.AgentExecution.task_id == task_id).first()
    if not exec_record or exec_record.execution_status != "Needs Clarification":
        raise HTTPException(status_code=400, detail="Task is not awaiting clarification")
        
    parsed_intent = exec_record.parsed_intent or {}
    
    # Track and Cap clarification attempts
    clarification_attempts = parsed_intent.get("clarification_attempts", {})
    attempts = clarification_attempts.get(req.param_name, 0)
    
    # Run input validation
    is_valid, err_msg = validate_clarification(req.param_name, req.param_value)
    if not is_valid:
        new_attempts = attempts + 1
        clarification_attempts[req.param_name] = new_attempts
        parsed_intent["clarification_attempts"] = clarification_attempts
        exec_record.parsed_intent = parsed_intent
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(exec_record, "parsed_intent")
        db.commit()
        
        if new_attempts >= 2:
            # Mark task as Failed
            task.status = "Failed"
            exec_record.execution_status = "Failed"
            db.add(models.TaskLog(
                task_id=task_id,
                action="failed",
                details=f"Task verification failed: Clarification loop capped after 2 unsuccessful attempts for parameter '{req.param_name}'."
            ))
            db.commit()
            raise HTTPException(status_code=400, detail=f"Validation failed: {err_msg} Clarification limit exceeded, task marked as FAILED.")
        else:
            raise HTTPException(status_code=400, detail=f"Validation failed: {err_msg} (Attempt {new_attempts}/2)")
            
    # Reset attempts count upon successful validation
    clarification_attempts[req.param_name] = 0
    parsed_intent["clarification_attempts"] = clarification_attempts
    
    params = parsed_intent.get("params", {})
    params[req.param_name] = req.param_value
    
    missing_params = parsed_intent.get("missing_params", [])
    if req.param_name in missing_params:
        missing_params.remove(req.param_name)
        
    parsed_intent["params"] = params
    parsed_intent["missing_params"] = missing_params
    parsed_intent["status"] = "Running"
    
    exec_record.parsed_intent = parsed_intent
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(exec_record, "parsed_intent")
    exec_record.execution_status = "Running"
    task.status = "Running"
    db.commit()
    
    db.add(models.TaskLog(
        task_id=task_id,
        action="clarify",
        details=f"User clarified parameter '{req.param_name}' with value '{req.param_value}'."
    ))
    db.commit()
    
    from agent.orchestrator import execute_agent_workflow
    result = execute_agent_workflow(task_id, db)
    return result


@app.get("/api/tasks/{task_id}/status")
def get_task_status(
    task_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.user_id != current_user.id:
        # Check org view authorization
        task_owner = db.query(models.User).filter(models.User.id == task.user_id).first()
        if not task_owner or current_user.role != "org_admin" or current_user.organization_id is None or current_user.organization_id != task_owner.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
    exec_record = db.query(models.AgentExecution).filter(models.AgentExecution.task_id == task_id).first()
    logs = db.query(models.TaskLog).filter(models.TaskLog.task_id == task_id).order_by(models.TaskLog.log_time.asc()).all()
    
    progress = 0
    current_step = 1
    
    status_map = {
        "received": (1, 15),
        "parsing": (2, 35),
        "warning": (2, 35),
        "service_call": (3, 55),
        "suspend": (3, 50),
        "clarify": (3, 55),
        "evidence_collection": (4, 75),
        "verifying": (5, 90),
        "verification_complete": (6, 100),
        "failed": (6, 100),
        "completed": (6, 100)
    }
    
    if logs:
        latest_action = logs[-1].action
        current_step, progress = status_map.get(latest_action, (1, 10))
        
    if task.status == "Needs Clarification":
        progress = 50
        current_step = 3
        
    missing_fields = []
    if exec_record and exec_record.parsed_intent:
        missing_fields = exec_record.parsed_intent.get("missing_params", [])
        
    return {
        "task_id": task_id,
        "status": task.status,
        "current_step": current_step,
        "progress": progress,
        "logs": [
            {
                "timestamp": log.log_time.isoformat(),
                "action": log.action,
                "details": log.details
            }
            for log in logs
        ],
        "missing_params": missing_fields
    }


@app.get("/api/tasks/{task_id}/result")
def get_task_result(
    task_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.user_id != current_user.id:
        task_owner = db.query(models.User).filter(models.User.id == task.user_id).first()
        if not task_owner or current_user.role != "org_admin" or current_user.organization_id is None or current_user.organization_id != task_owner.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
    ver_res = db.query(models.VerificationResult).filter(models.VerificationResult.task_id == task_id).first()
    evidence = db.query(models.Evidence).filter(models.Evidence.task_id == task_id).all()
    
    return {
        "task_id": task_id,
        "name": task.name,
        "status": ver_res.verification_status if ver_res else task.status,
        "confidence_score": ver_res.confidence_score if ver_res else (task.confidence or 0.0),
        "summary": ver_res.summary if ver_res else "No verification summary compiled yet.",
        "verified_at": ver_res.verified_at.isoformat() if ver_res else None,
        "evidence": [
            {
                "id": ev.id,
                "type": ev.evidence_type,
                "data": ev.evidence_data
            }
            for ev in evidence
        ]
    }


@app.get("/api/reports/{task_id}/download")
def download_report(
    task_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if task.user_id != current_user.id:
        task_owner = db.query(models.User).filter(models.User.id == task.user_id).first()
        if not task_owner or current_user.role != "org_admin" or current_user.organization_id is None or current_user.organization_id != task_owner.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")
            
    ver_res = db.query(models.VerificationResult).filter(models.VerificationResult.task_id == task_id).first()
    evidence = db.query(models.Evidence).filter(models.Evidence.task_id == task_id).all()
    logs = db.query(models.TaskLog).filter(models.TaskLog.task_id == task_id).order_by(models.TaskLog.log_time.asc()).all()
    
    from utils.report_generator import generate_pdf_report
    try:
        pdf_bytes = generate_pdf_report(task, ver_res, evidence, logs)
        
        report_record = db.query(models.Report).filter(models.Report.id == f"rep-{task_id}").first()
        if not report_record:
            report_record = models.Report(
                id=f"rep-{task_id}",
                name=f"verinova_report_{task_id}.pdf",
                type="PDF",
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
                status="Generated",
                size=f"{len(pdf_bytes)//1024} KB",
                user_id=task.user_id,
                report_path=f"/api/reports/{task_id}/download"
            )
            db.add(report_record)
            db.commit()
            
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=verinova_report_{task_id}.pdf"}
        )
    except Exception as e:
        logger.error(f"Report generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")


# =====================================================================
# USER SETTINGS ENDPOINT
# =====================================================================

class UserSettingsUpdate(BaseModel):
    theme: str
    language: str
    email_notifications: bool
    push_notifications: bool

@app.put("/api/user/settings")
def update_user_settings(
    settings_in: UserSettingsUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    settings_record = db.query(models.UserSetting).filter(models.UserSetting.user_id == current_user.id).first()
    if not settings_record:
        settings_record = models.UserSetting(user_id=current_user.id)
        db.add(settings_record)
        
    settings_record.theme = settings_in.theme
    settings_record.language = settings_in.language
    settings_record.email_notifications = settings_in.email_notifications
    settings_record.push_notifications = settings_in.push_notifications
    db.commit()
    
    return {"message": "Settings updated successfully"}


@app.get("/api/user/settings")
def get_user_settings(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    settings_record = db.query(models.UserSetting).filter(models.UserSetting.user_id == current_user.id).first()
    if not settings_record:
        settings_record = models.UserSetting(
            user_id=current_user.id,
            theme="emerald-dark",
            language="English",
            email_notifications=True,
            push_notifications=False
        )
        db.add(settings_record)
        db.commit()
        db.refresh(settings_record)
        
    return settings_record


# =====================================================================
# ORG ADMIN ENDPOINTS
# =====================================================================

@app.get("/api/organization/dashboard")
def get_org_dashboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "org_admin" or current_user.organization_id is None:
        raise HTTPException(status_code=403, detail="Access denied. Organization admin role required.")
        
    org_id = current_user.organization_id
    org_user_ids = [u.id for u in db.query(models.User.id).filter(models.User.organization_id == org_id).all()]
    
    org_tasks = db.query(models.Task).filter(models.Task.user_id.in_(org_user_ids)).all()
    
    total = len(org_tasks)
    verified = sum(1 for t in org_tasks if t.status == "Verified")
    pending = sum(1 for t in org_tasks if t.status in ("Pending", "Running", "Needs Clarification"))
    failed = sum(1 for t in org_tasks if t.status == "Failed")
    
    verified_confidences = [t.confidence for t in org_tasks if t.status == "Verified" and t.confidence is not None]
    avg_confidence = sum(verified_confidences) / len(verified_confidences) if verified_confidences else 0.0
    
    def make_stat_item(val):
        return {"value": val, "change": "↑ 4.2% from last week", "trend": "up"}
        
    return {
        "totalTasks": make_stat_item(total),
        "verifiedTasks": make_stat_item(verified),
        "pendingTasks": make_stat_item(pending),
        "failedTasks": make_stat_item(failed),
        "avgConfidence": make_stat_item(round(avg_confidence, 1))
    }


@app.get("/api/organization/analytics")
def get_org_analytics(
    filter: str = "last_7_days",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "org_admin" or current_user.organization_id is None:
        raise HTTPException(status_code=403, detail="Access denied. Organization admin role required.")
        
    org_id = current_user.organization_id
    org_user_ids = [u.id for u in db.query(models.User.id).filter(models.User.organization_id == org_id).all()]
    
    org_tasks = db.query(models.Task).filter(models.Task.user_id.in_(org_user_ids)).all()
    
    total = len(org_tasks)
    verified = sum(1 for t in org_tasks if t.status == "Verified")
    pending = sum(1 for t in org_tasks if t.status == "Pending")
    running = sum(1 for t in org_tasks if t.status == "Running")
    failed = sum(1 for t in org_tasks if t.status == "Failed")
    
    today = datetime.now().date()
    labels = []
    values = []
    
    days = 7 if filter == "last_7_days" else 30
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")
        labels.append(d.strftime("%b %d") if days == 30 else d.strftime("%a"))
        count = sum(1 for t in org_tasks if t.date == d_str)
        values.append(count)
        
    from sqlalchemy import func
    active_member = db.query(
        models.User.fullname,
        func.count(models.Task.id).label("task_count")
    ).join(models.Task, models.User.id == models.Task.user_id)\
     .filter(models.User.organization_id == org_id)\
     .group_by(models.User.id)\
     .order_by(text("task_count DESC")).first()
     
    most_active_name = active_member[0] if active_member else "N/A"
    most_active_count = active_member[1] if active_member else 0
    
    success_rate = (verified / total * 100) if total > 0 else 0.0
    
    return {
        "success_rate": round(success_rate, 1),
        "status_donut": {
            "verified": verified,
            "pending": pending + running,
            "failed": failed
        },
        "activity_timeline": {
            "labels": labels,
            "values": values
        },
        "most_active_member": {
            "name": most_active_name,
            "tasks": most_active_count
        }
    }


@app.get("/api/organization/members")
def get_org_members(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "org_admin" or current_user.organization_id is None:
        raise HTTPException(status_code=403, detail="Access denied. Organization admin role required.")
        
    org_id = current_user.organization_id
    members = db.query(models.User).filter(models.User.organization_id == org_id).all()
    
    members_data = []
    for m in members:
        m_tasks = db.query(models.Task).filter(models.Task.user_id == m.id).all()
        t_count = len(m_tasks)
        m_confidences = [t.confidence for t in m_tasks if t.status == "Verified" and t.confidence is not None]
        m_avg_conf = sum(m_confidences) / len(m_confidences) if m_confidences else 0.0
        
        members_data.append({
            "id": m.id,
            "fullname": m.fullname,
            "email": m.email,
            "role": m.role,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "task_count": t_count,
            "average_confidence": round(m_avg_conf, 1)
        })
        
    return members_data


@app.post("/api/organization/members/{user_id}/remove")
def remove_org_member(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "org_admin" or current_user.organization_id is None:
        raise HTTPException(status_code=403, detail="Access denied. Organization admin role required.")
        
    user_to_remove = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organization_id == current_user.organization_id
    ).first()
    
    if not user_to_remove:
        raise HTTPException(status_code=404, detail="Member not found in your organization")
        
    if user_to_remove.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself from the organization")
        
    user_to_remove.organization_id = None
    user_to_remove.role = "standard_user"
    db.commit()
    return {"message": "Member removed successfully"}


@app.get("/api/organization/invite")
def get_org_invite(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.organization_id is None:
        raise HTTPException(status_code=400, detail="User is not in an organization")
        
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    return {
        "invite_code": org.invite_code,
        "invite_url": f"{FRONTEND_URL}/join/{org.invite_code}"
    }


# Override recent tasks to include org-wide query parameter
@app.get("/api/tasks/recent-org")
def get_recent_tasks_org(
    scope: str = "my",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if scope == "org" and current_user.organization_id is not None:
        org_user_ids = [u.id for u in db.query(models.User.id).filter(models.User.organization_id == current_user.organization_id).all()]
        tasks = db.query(models.Task).filter(models.Task.user_id.in_(org_user_ids)).order_by(models.Task.created_at.desc()).all()
    else:
        tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).order_by(models.Task.created_at.desc()).all()
    return tasks


# Override recent reports to include org-wide query parameter
@app.get("/api/reports/recent-org")
def get_recent_reports_org(
    scope: str = "my",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if scope == "org" and current_user.organization_id is not None:
        org_user_ids = [u.id for u in db.query(models.User.id).filter(models.User.organization_id == current_user.organization_id).all()]
        reports = db.query(models.Report).filter(models.Report.user_id.in_(org_user_ids)).all()
    else:
        reports = db.query(models.Report).filter(models.Report.user_id == current_user.id).all()
    return reports

