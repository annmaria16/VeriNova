import hashlib
import json
import logging
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request

from datetime import datetime, timedelta

from dotenv import load_dotenv

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    status,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from sqlalchemy.orm import Session

from database import Base, engine, get_db

import auth
import core_models
import models
import schemas


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()

load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        ".env"
    )
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO
)

logger = logging.getLogger("verinova")


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    ""
)

GOOGLE_CLIENT_SECRET = os.getenv(
    "GOOGLE_CLIENT_SECRET",
    ""
)

GITHUB_CLIENT_ID = os.getenv(
    "GITHUB_CLIENT_ID",
    ""
)

GITHUB_CLIENT_SECRET = os.getenv(
    "GITHUB_CLIENT_SECRET",
    ""
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://localhost:8000"
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="VeriNova AI API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE STARTUP
# ============================================================

@app.on_event("startup")
def startup_db():

    logger.info(
        "Initializing database tables..."
    )

    Base.metadata.create_all(
        bind=engine
    )

    logger.info(
        "Database initialization completed."
    )


# ============================================================
# HTTP REQUEST HELPER
# ============================================================

def make_http_request(
    url: str,
    method: str = "GET",
    headers: dict = None,
    data: dict = None
):

    headers = headers or {}

    req_data = None

    if data is not None:

        if headers.get(
            "Content-Type"
        ) == "application/json":

            req_data = json.dumps(
                data
            ).encode("utf-8")

        else:

            req_data = urllib.parse.urlencode(
                data
            ).encode("utf-8")

            if "Content-Type" not in headers:

                headers[
                    "Content-Type"
                ] = "application/x-www-form-urlencoded"

    request = urllib.request.Request(
        url,
        data=req_data,
        headers=headers,
        method=method
    )

    try:

        with urllib.request.urlopen(
            request
        ) as response:

            body = response.read().decode(
                "utf-8"
            )

            return json.loads(body)

    except urllib.error.HTTPError as exc:

        error_body = exc.read().decode(
            "utf-8"
        )

        logger.error(
            "HTTP error %s: %s",
            exc.code,
            error_body
        )

        try:

            return json.loads(
                error_body
            )

        except Exception:

            raise Exception(
                f"Request failed: "
                f"{exc.code} - "
                f"{error_body}"
            )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "name": "VeriNova",
        "status": "online",
        "version": "1.0.0"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# ============================================================
# REGISTER
# ============================================================

@app.post(
    "/api/auth/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email == user_in.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered."
        )

    hashed_password = auth.get_password_hash(
        user_in.password
    )

    # --------------------------------------------------------
    # ADMIN EMAIL GETS ADMIN ROLE
    # --------------------------------------------------------

    role = (
        "admin"
        if auth.is_admin_email(
            user_in.email
        )
        else "user"
    )

    db_user = models.User(
        fullname=user_in.fullname,
        email=user_in.email,
        password=hashed_password,
        provider="email",
        role=role
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    logger.info(
        "Registered user %s with role %s",
        db_user.email,
        db_user.role
    )

    return db_user


# ============================================================
# NORMAL LOGIN
# ============================================================

@app.post(
    "/api/auth/login",
    response_model=schemas.Token
)
def login(
    login_in: schemas.UserLogin,
    db: Session = Depends(get_db)
):

    db_user = (
        db.query(models.User)
        .filter(
            models.User.email == login_in.email
        )
        .first()
    )

    if not db_user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    if (
        db_user.password is None
        or not auth.verify_password(
            login_in.password,
            db_user.password
        )
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    # --------------------------------------------------------
    # CREATE SESSION
    # --------------------------------------------------------

    session_token = secrets.token_urlsafe(
        32
    )

    session_expires = (
        datetime.utcnow()
        + timedelta(days=7)
    )

    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )

    db.add(db_session)
    db.commit()

    # --------------------------------------------------------
    # JWT CONTAINS USER ROLE
    # --------------------------------------------------------

    access_token = auth.create_user_access_token(
        db_user
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ============================================================
# FORGOT PASSWORD
# ============================================================

@app.post("/api/auth/forgot-password")
def forgot_password(
    req: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.User)
        .filter(models.User.email == req.email)
        .first()
    )

    safe_message = "If an account exists for this email, a password reset link has been sent."

    if user:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + timedelta(minutes=30)

        db_token = models.PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )
        db.add(db_token)
        db.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
        reset_link = f"{frontend_url}/reset-password?token={raw_token}"

        from utils.email import send_password_reset_email
        send_password_reset_email(user.email, reset_link)

    return {"message": safe_message}


# ============================================================
# RESET PASSWORD
# ============================================================

@app.post("/api/auth/reset-password")
def reset_password(
    req: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    token_hash = hashlib.sha256(req.token.encode("utf-8")).hexdigest()

    db_token = (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.token_hash == token_hash,
            models.PasswordResetToken.used == False
        )
        .first()
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    if db_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == db_token.user_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    hashed_password = auth.get_password_hash(req.new_password)
    user.password = hashed_password
    db_token.used = True

    # Invalidate active sessions
    db.query(models.UserSession).filter(models.UserSession.user_id == user.id).delete()

    db.commit()

    return {"message": "Your password has been reset successfully."}


# ============================================================
# ADMIN LOGIN
# ============================================================

@app.post(
    "/api/auth/admin/login",
    response_model=schemas.AdminToken
)
def admin_login(
    login_in: schemas.AdminLogin,
    db: Session = Depends(get_db)
):

    admin = (
        db.query(models.User)
        .filter(
            models.User.email == login_in.email
        )
        .first()
    )

    if not admin:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials."
        )

    # --------------------------------------------------------
    # DATABASE ROLE CHECK
    # --------------------------------------------------------

    if admin.role != "admin":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not an administrator."
        )

    if not admin.password:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This administrator does not have a password login."
        )

    if not auth.verify_password(
        login_in.password,
        admin.password
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials."
        )

    access_token = auth.create_admin_access_token(
        admin.email
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ============================================================
# ADMIN PROFILE
# ============================================================

@app.get(
    "/api/admin/me"
)
def admin_me(
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    return {
        "id": current_admin.id,
        "fullname": current_admin.fullname,
        "email": current_admin.email,
        "role": current_admin.role,
        "provider": current_admin.provider
    }


# ============================================================
# USER PROFILE
# ============================================================

@app.get(
    "/api/user/profile",
    response_model=schemas.UserResponse
)
def get_profile(
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    return current_user


    # ============================================================
# UPDATE USER PROFILE
# ============================================================

@app.put(
    "/api/user/profile",
    response_model=schemas.UserResponse
)
def update_profile(
    profile_in: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):
    if profile_in.fullname is not None:
        fullname = profile_in.fullname.strip()

        if len(fullname) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name must contain at least 3 characters."
            )

        current_user.fullname = fullname

    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url

    db.commit()
    db.refresh(current_user)

    return current_user


# ============================================================
# CHANGE USER PASSWORD
# ============================================================

@app.put("/api/user/password")
def change_user_password(
    password_in: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if current_user.provider != "email":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password changes are only available for email accounts."
        )

    if not current_user.password or not auth.verify_password(
        password_in.current_password,
        current_user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    current_user.password = auth.get_password_hash(
        password_in.new_password
    )
    db.commit()

    return {"message": "Password changed successfully."}


# ============================================================
# GET CURRENT USER ROLE
# ============================================================

@app.get(
    "/api/auth/me",
    response_model=schemas.UserResponse
)
def get_current_user_profile(
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    return current_user


# ============================================================
# GOOGLE LOGIN
# ============================================================

@app.get(
    "/api/auth/google/login"
)
def google_login():

    if not GOOGLE_CLIENT_ID:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Client ID is not configured."
        )

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri":
            f"{BACKEND_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }

    url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode(params)
    )

    return RedirectResponse(url)


# ============================================================
# GOOGLE CALLBACK
# ============================================================

@app.get(
    "/api/auth/google/callback"
)
def google_callback(
    code: str,
    db: Session = Depends(get_db)
):

    if (
        not GOOGLE_CLIENT_ID
        or not GOOGLE_CLIENT_SECRET
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth credentials not configured."
        )

    token_url = (
        "https://oauth2.googleapis.com/token"
    )

    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri":
            f"{BACKEND_URL}/api/auth/google/callback",
        "grant_type": "authorization_code"
    }

    try:

        token_res = make_http_request(
            token_url,
            method="POST",
            data=data
        )

        google_access_token = token_res.get(
            "access_token"
        )

        if not google_access_token:

            raise Exception(
                token_res.get(
                    "error_description"
                )
                or "No access token returned from Google."
            )

    except Exception as exc:

        logger.error(
            "Google token exchange failed: %s",
            exc
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?error={urllib.parse.quote(str(exc))}"
        )

    # --------------------------------------------------------
    # GOOGLE PROFILE
    # --------------------------------------------------------

    profile_url = (
        "https://www.googleapis.com/oauth2/v3/userinfo"
        f"?access_token={google_access_token}"
    )

    try:

        profile = make_http_request(
            profile_url
        )

        email = profile.get(
            "email"
        )

        if not email:

            raise Exception(
                "No email in Google profile."
            )

        fullname = profile.get(
            "name"
        ) or email.split("@")[0]

        google_id = profile.get(
            "sub"
        )

        picture = profile.get(
            "picture"
        )

    except Exception as exc:

        logger.error(
            "Google profile fetch failed: %s",
            exc
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?error={urllib.parse.quote(str(exc))}"
        )

    # --------------------------------------------------------
    # FIND OR CREATE USER
    # --------------------------------------------------------

    db_user = (
        db.query(models.User)
        .filter(
            models.User.email == email
        )
        .first()
    )

    if not db_user:

        role = (
            "admin"
            if auth.is_admin_email(email)
            else "user"
        )

        db_user = models.User(
            fullname=fullname,
            email=email,
            password=None,
            provider="google",
            role=role
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    else:

        # If configured admin email logs in through Google,
        # make sure the database role is admin.

        if auth.is_admin_email(email):
            db_user.role = "admin"

        if not db_user.avatar_url and picture:
            db_user.avatar_url = picture

        db.commit()

    # --------------------------------------------------------
    # SAVE OAUTH ACCOUNT
    # --------------------------------------------------------

    oauth_acc = (
        db.query(models.OAuthAccount)
        .filter(
            models.OAuthAccount.provider == "google",
            models.OAuthAccount.provider_user_id
            == google_id
        )
        .first()
    )

    if not oauth_acc:

        oauth_acc = models.OAuthAccount(
            user_id=db_user.id,
            provider="google",
            provider_user_id=google_id,
            profile_image=picture
        )

        db.add(oauth_acc)
        db.commit()

    else:

        if oauth_acc.profile_image != picture:

            oauth_acc.profile_image = picture
            db.commit()

    # --------------------------------------------------------
    # SESSION
    # --------------------------------------------------------

    session_token = secrets.token_urlsafe(
        32
    )

    session_expires = (
        datetime.utcnow()
        + timedelta(days=7)
    )

    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )

    db.add(db_session)
    db.commit()

    # --------------------------------------------------------
    # JWT WITH ROLE
    # --------------------------------------------------------

    jwt_token = auth.create_user_access_token(
        db_user
    )

    return RedirectResponse(
        f"{FRONTEND_URL}/auth/callback"
        f"?token={urllib.parse.quote(jwt_token)}"
    )


# ============================================================
# GITHUB LOGIN
# ============================================================

@app.get(
    "/api/auth/github/login"
)
def github_login():

    if not GITHUB_CLIENT_ID:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub Client ID is not configured."
        )

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri":
            f"{BACKEND_URL}/api/auth/github/callback",
        "scope": "user:email"
    }

    url = (
        "https://github.com/login/oauth/authorize?"
        + urllib.parse.urlencode(params)
    )

    return RedirectResponse(url)


# ============================================================
# GITHUB CALLBACK
# ============================================================

@app.get(
    "/api/auth/github/callback"
)
def github_callback(
    code: str,
    db: Session = Depends(get_db)
):

    if (
        not GITHUB_CLIENT_ID
        or not GITHUB_CLIENT_SECRET
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub OAuth credentials not configured."
        )

    token_url = (
        "https://github.com/login/oauth/access_token"
    )

    data = {
        "code": code,
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "redirect_uri":
            f"{BACKEND_URL}/api/auth/github/callback"
    }

    headers = {
        "Accept": "application/json"
    }

    try:

        token_res = make_http_request(
            token_url,
            method="POST",
            headers=headers,
            data=data
        )

        github_access_token = token_res.get(
            "access_token"
        )

        if not github_access_token:

            raise Exception(
                token_res.get(
                    "error_description"
                )
                or "No access token returned from GitHub."
            )

    except Exception as exc:

        logger.error(
            "GitHub token exchange failed: %s",
            exc
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?error={urllib.parse.quote(str(exc))}"
        )

    # --------------------------------------------------------
    # GITHUB PROFILE
    # --------------------------------------------------------

    profile_url = (
        "https://api.github.com/user"
    )

    profile_headers = {
        "Authorization":
            f"Bearer {github_access_token}",
        "User-Agent":
            "VeriNova-App"
    }

    try:

        profile = make_http_request(
            profile_url,
            headers=profile_headers
        )

        github_id = str(
            profile.get("id")
        )

        fullname = (
            profile.get("name")
            or profile.get("login")
            or f"GitHub User {github_id}"
        )

        picture = profile.get(
            "avatar_url"
        )

        email = profile.get(
            "email"
        )

        # ----------------------------------------------------
        # PRIVATE EMAIL
        # ----------------------------------------------------

        if not email:

            emails_url = (
                "https://api.github.com/user/emails"
            )

            emails = make_http_request(
                emails_url,
                headers=profile_headers
            )

            primary_email = next(
                (
                    item.get("email")
                    for item in emails
                    if item.get("primary")
                ),
                None
            )

            email = (
                primary_email
                or (
                    emails[0].get("email")
                    if emails
                    else None
                )
            )

        if not email:

            raise Exception(
                "No primary email found in GitHub account."
            )

    except Exception as exc:

        logger.error(
            "GitHub profile fetch failed: %s",
            exc
        )

        return RedirectResponse(
            f"{FRONTEND_URL}/auth/callback"
            f"?error={urllib.parse.quote(str(exc))}"
        )

    # --------------------------------------------------------
    # FIND OR CREATE USER
    # --------------------------------------------------------

    db_user = (
        db.query(models.User)
        .filter(
            models.User.email == email
        )
        .first()
    )

    if not db_user:

        role = (
            "admin"
            if auth.is_admin_email(email)
            else "user"
        )

        db_user = models.User(
            fullname=fullname,
            email=email,
            password=None,
            provider="github",
            role=role
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    else:

        if auth.is_admin_email(email):
            db_user.role = "admin"

        if not db_user.avatar_url and picture:
            db_user.avatar_url = picture

        db.commit()

    # --------------------------------------------------------
    # SAVE OAUTH ACCOUNT
    # --------------------------------------------------------

    oauth_acc = (
        db.query(models.OAuthAccount)
        .filter(
            models.OAuthAccount.provider == "github",
            models.OAuthAccount.provider_user_id
            == github_id
        )
        .first()
    )

    if not oauth_acc:

        oauth_acc = models.OAuthAccount(
            user_id=db_user.id,
            provider="github",
            provider_user_id=github_id,
            profile_image=picture
        )

        db.add(oauth_acc)
        db.commit()

    else:

        if oauth_acc.profile_image != picture:

            oauth_acc.profile_image = picture
            db.commit()

    # --------------------------------------------------------
    # SESSION
    # --------------------------------------------------------

    session_token = secrets.token_urlsafe(
        32
    )

    session_expires = (
        datetime.utcnow()
        + timedelta(days=7)
    )

    db_session = models.UserSession(
        user_id=db_user.id,
        session_token=session_token,
        expires_at=session_expires
    )

    db.add(db_session)
    db.commit()

    # --------------------------------------------------------
    # JWT WITH ROLE
    # --------------------------------------------------------

    jwt_token = auth.create_user_access_token(
        db_user
    )

    return RedirectResponse(
        f"{FRONTEND_URL}/auth/callback"
        f"?token={urllib.parse.quote(jwt_token)}"
    )


# ============================================================
# CREATE TASK
# ============================================================

@app.post(
    "/api/tasks",
    response_model=schemas.TaskResponse,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    task = core_models.Task(
        user_id=current_user.id,
        title=task_in.title,
        description=task_in.description,
        task_type=task_in.task_type,
        status="pending",
        confidence_score=None,
        final_result=None
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


# ============================================================
# GET USER TASKS
# ============================================================

@app.get(
    "/api/tasks",
    response_model=list[schemas.TaskResponse]
)
def get_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    tasks = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.user_id
            == current_user.id
        )
        .order_by(
            core_models.Task.created_at.desc()
        )
        .all()
    )

    return tasks


# ============================================================
# GET SINGLE TASK
# ============================================================

@app.get(
    "/api/tasks/{task_id}",
    response_model=schemas.TaskResponse
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        auth.get_current_user
    )
):

    task = (
        db.query(core_models.Task)
        .filter(
            core_models.Task.id == task_id,
            core_models.Task.user_id
            == current_user.id
        )
        .first()
    )

    if not task:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    return task


# ============================================================
# ADMIN - GET ALL USERS
# ============================================================

@app.get(
    "/api/admin/users"
)
def admin_get_users(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    users = (
        db.query(models.User)
        .order_by(
            models.User.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": user.id,
            "fullname": user.fullname,
            "email": user.email,
            "provider": user.provider,
            "role": user.role,
            "created_at": user.created_at,
            "avatar_url": user.avatar_url
        }
        for user in users
    ]


# ============================================================
# ADMIN - GET ALL TASKS
# ============================================================

@app.get(
    "/api/admin/tasks"
)
def admin_get_tasks(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    tasks = (
        db.query(core_models.Task)
        .order_by(
            core_models.Task.created_at.desc()
        )
        .all()
    )

    return tasks


# ============================================================
# ADMIN - UPDATE TASK STATUS
# ============================================================

@app.put(
    "/api/admin/tasks/{task_id}/status",
    response_model=schemas.TaskResponse
)
def admin_update_task_status(
    task_id: int,
    status_in: schemas.TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        auth.get_current_admin
    )
):

    task = (
        db.query(core_models.Task)
        .filter(core_models.Task.id == task_id)
        .first()
    )

    if not task:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    task.status = status_in.status
    db.commit()
    db.refresh(task)

    return task