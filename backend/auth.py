import os

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from database import get_db
import models


# ============================================================
# JWT CONFIGURATION
# ============================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "verinova_super_secret_cyber_security_key_for_jwt_tokens"
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 1440


# ============================================================
# ADMIN CONFIGURATION
# ============================================================

ADMIN_EMAIL = os.getenv(
    "ADMIN_EMAIL",
    ""
).strip().lower()


# ============================================================
# OAUTH2 SCHEME
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
    auto_error=False
)


# ============================================================
# PASSWORD HASHING
# ============================================================

def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )

    except Exception:
        return False


def get_password_hash(
    password: str
) -> str:

    salt = bcrypt.gensalt()

    return bcrypt.hashpw(
        password.encode("utf-8"),
        salt
    ).decode("utf-8")


# ============================================================
# CREATE JWT
# ============================================================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:

    to_encode = data.copy()

    if expires_delta:

        expire = (
            datetime.now(timezone.utc)
            + expires_delta
        )

    else:

        expire = (
            datetime.now(timezone.utc)
            + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )

    to_encode.update({
        "exp": expire
    })

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# ============================================================
# CREATE NORMAL USER TOKEN
# ============================================================

def create_user_access_token(
    user: models.User
) -> str:

    return create_access_token(
        data={
            "sub": user.email,
            "role": user.role
        }
    )


# ============================================================
# CREATE ADMIN TOKEN
# ============================================================

def create_admin_access_token(
    email: str
) -> str:

    return create_access_token(
        data={
            "sub": email,
            "role": "admin"
        }
    )


# ============================================================
# GET CURRENT USER
# ============================================================

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    # --------------------------------------------------------
    # No token
    # --------------------------------------------------------

    if not token:
        raise credentials_exception

    # --------------------------------------------------------
    # Decode JWT
    # --------------------------------------------------------

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email: Optional[str] = payload.get("sub")

        if not email:
            raise credentials_exception

    except jwt.PyJWTError:

        raise credentials_exception

    # --------------------------------------------------------
    # Find user in database
    # --------------------------------------------------------

    user = (
        db.query(models.User)
        .filter(
            models.User.email == email
        )
        .first()
    )

    if user is None:
        raise credentials_exception

    return user


# ============================================================
# GET CURRENT ADMIN
# ============================================================

def get_current_admin(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authentication required.",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    # --------------------------------------------------------
    # No token
    # --------------------------------------------------------

    if not token:
        raise credentials_exception

    # --------------------------------------------------------
    # Decode JWT
    # --------------------------------------------------------

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email: Optional[str] = payload.get("sub")

        token_role: Optional[str] = payload.get("role")

        if not email:
            raise credentials_exception

        if token_role != "admin":
            raise credentials_exception

    except jwt.PyJWTError:

        raise credentials_exception

    # --------------------------------------------------------
    # Find actual user in database
    # --------------------------------------------------------

    admin = (
        db.query(models.User)
        .filter(
            models.User.email == email
        )
        .first()
    )

    if admin is None:
        raise credentials_exception

    # --------------------------------------------------------
    # IMPORTANT SECURITY CHECK
    #
    # Even if someone modifies/creates a JWT containing
    # role=admin, the database must also say admin.
    # --------------------------------------------------------

    if admin.role != "admin":
        raise credentials_exception

    return admin


# ============================================================
# CHECK WHETHER EMAIL IS THE CONFIGURED ADMIN EMAIL
# ============================================================

def is_admin_email(
    email: str
) -> bool:

    if not ADMIN_EMAIL:
        return False

    return email.strip().lower() == ADMIN_EMAIL


# ============================================================
# CHECK WHETHER USER IS ADMIN
# ============================================================

def is_admin(
    user: models.User
) -> bool:

    return user.role == "admin"