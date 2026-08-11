import logging
import secrets
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from database import engine, get_db, Base
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

app = FastAPI(title="VeriNova AI API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db_migration():
    logger.info("Running startup DB migration to clean up obsolete tables and columns")
    with engine.connect() as connection:
        try:
            # Drop obsolete tables in dependency order
            obsolete_tables = [
                "purchase_records", "booking_records", "booking_slots", "booking_services",
                "products", "customers", "task_logs", "verification_results", "evidence",
                "agent_executions", "user_settings", "reports", "notifications",
                "verification_logs", "tasks", "password_reset_otps", "password_reset_tokens",
                "organizations"
            ]
            for table in obsolete_tables:
                connection.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            
            # Remove obsolete columns from users table
            connection.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS organization_id CASCADE"))
            connection.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS role CASCADE"))
            connection.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS reset_token CASCADE"))
            connection.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires CASCADE"))
            
            # Make sure password column is nullable
            connection.execute(text("ALTER TABLE users ALTER COLUMN password DROP NOT NULL"))
            
            connection.commit()
            logger.info("Database cleanup completed successfully.")
        except Exception as e:
            logger.error(f"Migration error: {e}")
            
    # Re-create only the simplified auth tables
    Base.metadata.create_all(bind=engine)


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


# GET /api/user/profile
@app.get("/api/user/profile", response_model=schemas.UserResponse)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
