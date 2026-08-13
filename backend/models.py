from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    fullname = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password = Column(
        String(255),
        nullable=True
    )

    provider = Column(
        String(20),
        nullable=False,
        default="email"
    )

    # --------------------------------------------------------
    # USER ROLE
    # user  = normal VeriNova user
    # admin = VeriNova administrator
    # --------------------------------------------------------

    role = Column(
        String(20),
        nullable=False,
        default="user",
        server_default="user"
    )

    profile_image = Column(
        String(500),
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    avatar_url = Column(
        String(500),
        nullable=True
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    oauth_accounts = relationship(
        "OAuthAccount",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    sessions = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # --------------------------------------------------------
    # Database constraints
    # --------------------------------------------------------

    __table_args__ = (
        CheckConstraint(
            "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
            name="users_email_check"
        ),

        CheckConstraint(
            "length(TRIM(BOTH FROM fullname)) >= 3",
            name="users_fullname_check"
        ),

        CheckConstraint(
            "provider IN ('email', 'google', 'github')",
            name="users_provider_check"
        ),

        CheckConstraint(
            "role IN ('user', 'admin')",
            name="users_role_check"
        ),
    )


# ============================================================
# OAUTH ACCOUNT
# ============================================================

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    provider = Column(
        String(50),
        nullable=False
    )

    provider_user_id = Column(
        String(255),
        nullable=False,
        index=True
    )

    profile_image = Column(
        String(500),
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    # Relationship
    user = relationship(
        "User",
        back_populates="oauth_accounts"
    )


# ============================================================
# USER SESSION
# ============================================================

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    session_token = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    # Relationship
    user = relationship(
        "User",
        back_populates="sessions"
    )


# ============================================================
# PASSWORD RESET TOKEN
# ============================================================

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    token_hash = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    expires_at = Column(
        DateTime,
        nullable=False
    )

    used = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    # Relationship
    user = relationship(
        "User"
    )