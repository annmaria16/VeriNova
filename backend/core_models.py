from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    # Existing authenticated user
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # general / shopping / booking / payment / refund etc.
    task_type = Column(String(50), nullable=False, index=True)

    # received / parsing / executing / verifying / completed / failed
    status = Column(String(30), nullable=False, default="received", index=True)

    # 0 - 100
    confidence_score = Column(Float, nullable=True)

    # Human-readable final result
    final_result = Column(Text, nullable=True)

    # Optional reference to product/booking later
    reference_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class TaskExecutionLog(Base):
    __tablename__ = "task_execution_logs"

    id = Column(Integer, primary_key=True, index=True)

    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    step = Column(String(50), nullable=False)

    message = Column(Text, nullable=False)

    # started / completed / failed / waiting
    status = Column(String(30), nullable=False, default="completed")

    duration_ms = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)

    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source_type = Column(String(50), nullable=False)

    source_name = Column(String(255), nullable=False)

    description = Column(Text, nullable=True)

    # The actual evidence payload
    evidence_data = Column(JSON, nullable=True)

    # passed / failed / warning
    status = Column(String(30), nullable=False, default="passed")

    collected_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(Integer, primary_key=True, index=True)

    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # VERIFIED / NEEDS_REVIEW / FAILED
    final_status = Column(String(30), nullable=False)

    confidence_score = Column(Float, nullable=False)

    evidence_passed = Column(Integer, default=0, nullable=False)
    evidence_failed = Column(Integer, default=0, nullable=False)
    evidence_total = Column(Integer, default=0, nullable=False)

    explanation = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class VerificationFactor(Base):
    __tablename__ = "verification_factors"

    id = Column(Integer, primary_key=True, index=True)

    verification_result_id = Column(
        Integer,
        ForeignKey(
            "verification_results.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    factor_name = Column(String(255), nullable=False)

    description = Column(Text, nullable=True)

    # Positive or negative contribution
    contribution = Column(Float, nullable=False)

    # passed / failed / warning
    status = Column(String(30), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    verification_result_id = Column(
        Integer,
        ForeignKey(
            "verification_results.id",
            ondelete="CASCADE",
        ),
        nullable=True,
    )

    report_name = Column(String(255), nullable=False)

    file_path = Column(String(500), nullable=True)

    # generated / failed
    status = Column(String(30), nullable=False, default="generated")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)