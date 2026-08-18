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

    review_status = Column(
        String(30),
        nullable=False,
        default="NOT_REQUIRED",
        server_default="NOT_REQUIRED",
        index=True
    )

    execution_status = Column(
        String(30),
        nullable=False,
        default="CREATED",
        server_default="CREATED",
        index=True
    )

    plan = Column(JSON, nullable=True)

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


class AgentAction(Base):
    __tablename__ = "agent_actions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    tool_name = Column(String(50), nullable=False)
    input_data = Column(JSON, nullable=True)
    result_data = Column(JSON, nullable=True)
    status = Column(String(30), nullable=False, default="pending")
    action_hash = Column(String(64), nullable=True, index=True)
    expires_at = Column(DateTime, nullable=True)
    action_type = Column(String(50), nullable=True)
    risk_level = Column(String(20), nullable=True)
    idempotency_key = Column(String(64), nullable=True, index=True)
    evidence = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)


class ProductSearch(Base):
    __tablename__ = "product_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    query = Column(String(255), nullable=False)
    filters = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ProductOffer(Base):
    __tablename__ = "product_offers"

    id = Column(Integer, primary_key=True, index=True)
    search_id = Column(
        Integer,
        ForeignKey("product_searches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(50), nullable=False)
    provider_product_id = Column(String(255), nullable=True)
    title = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    availability = Column(String(50), nullable=False, default="in_stock")
    url = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=True)
    last_checked = Column(DateTime, default=datetime.utcnow, nullable=False)


class ProductComparison(Base):
    __tablename__ = "product_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    search_id = Column(
        Integer,
        ForeignKey("product_searches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_group = Column(String(255), nullable=False)
    recommendation = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    action = Column(String(50), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserMemory(Base):
    __tablename__ = "user_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True) # preference, short-term, long-term, task
    source = Column(String(100), nullable=True)
    confidence = Column(Float, default=1.0)
    importance = Column(Integer, default=1)
    last_used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(20), default="ACTIVE") # ACTIVE, ARCHIVED, EXPIRED, DELETED
    structured_data = Column(JSON, nullable=True)
    memory_id = Column(String(50), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)


class SecurityAuditLog(Base):
    __tablename__ = "security_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    event_type = Column(String(100), nullable=False, index=True) # prompt_injection, rate_limit_violation, auth_failure, sensitive_access
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AiCostLog(Base):
    __tablename__ = "ai_cost_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    model = Column(String(100), nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class TaskFeedback(Base):
    __tablename__ = "task_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    rating = Column(String(20), nullable=False) # helpful, not_helpful, incorrect
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ToolHealth(Base):
    __tablename__ = "tool_health"

    id = Column(Integer, primary_key=True, index=True)
    tool_name = Column(String(50), nullable=False, unique=True, index=True)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    circuit_state = Column(String(20), default="CLOSED") # CLOSED, OPEN, HALF_OPEN
    last_failed_at = Column(DateTime, nullable=True)
    consecutive_failures = Column(Integer, default=0)


class ProviderHealth(Base):
    __tablename__ = "provider_health"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False, unique=True, index=True)
    availability = Column(Float, default=1.0)
    latency = Column(Float, default=0.0)
    success_rate = Column(Float, default=1.0)
    last_failure = Column(DateTime, nullable=True)
    circuit_state = Column(String(20), default="CLOSED")


class UserConnection(Base):
    __tablename__ = "user_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)
    provider_account_id = Column(String(100), nullable=False)
    scopes = Column(Text, nullable=True)
    status = Column(String(20), default="active")
    encrypted_credentials = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AutomationSetting(Base):
    __tablename__ = "automation_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    allow_search = Column(Boolean, default=True)
    allow_compare = Column(Boolean, default=True)
    allow_email = Column(Boolean, default=False)
    allow_booking = Column(Boolean, default=False)
    allow_purchase = Column(Boolean, default=False)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="IDLE")
    iterations_count = Column(Integer, default=0)
    tool_calls_count = Column(Integer, default=0)
    max_iterations = Column(Integer, default=15)
    max_tool_calls = Column(Integer, default=20)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)


class AgentPlan(Base):
    __tablename__ = "agent_plans"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    goal = Column(Text, nullable=False)
    risk_level = Column(String(20), default="LOW")
    requires_confirmation = Column(Boolean, default=False)
    success_criteria = Column(Text, nullable=True)


class AgentPlanStep(Base):
    __tablename__ = "agent_plan_steps"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("agent_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    step_id = Column(String(50), nullable=False)
    order_num = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    tool = Column(String(50), nullable=True)
    arguments = Column(JSON, nullable=True)
    status = Column(String(30), nullable=False, default="PENDING")
    dependencies = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    error_msg = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class ConversationSummary(Base):
    __tablename__ = "conversation_summaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    summary_text = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ScheduledTask(Base):
    __tablename__ = "scheduled_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    schedule_id = Column(String(50), nullable=False, unique=True, index=True)
    task_template = Column(JSON, nullable=False)
    schedule = Column(String(50), nullable=False)
    status = Column(String(20), default="active")
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)


class ModelUsage(Base):
    __tablename__ = "model_usages"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    model_name = Column(String(50), nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(String(20), default="1.0.0")
    risk_policy = Column(String(20), default="LOW")
    enabled = Column(Boolean, default=True)
    configuration = Column(JSON, nullable=True)


class AgentCapability(Base):
    __tablename__ = "agent_capabilities"

    id = Column(Integer, primary_key=True, index=True)
    capability_id = Column(String(50), unique=True, index=True, nullable=False)
    agent_id = Column(String(50), ForeignKey("agents.agent_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    input_schema = Column(JSON, nullable=True)
    output_schema = Column(JSON, nullable=True)
    required_tools = Column(JSON, nullable=True)
    risk_level = Column(String(20), default="LOW")


class AgentPermission(Base):
    __tablename__ = "agent_permissions"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String(50), ForeignKey("agents.agent_id", ondelete="CASCADE"), nullable=False, index=True)
    tool_id = Column(String(50), nullable=False)
    permission = Column(String(20), default="READ") # READ, WRITE, EXECUTE
    allowed = Column(Boolean, default=True)
    risk_level = Column(String(20), default="LOW")


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(50), unique=True, index=True, nullable=False)
    run_id = Column(Integer, nullable=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    from_agent = Column(String(50), nullable=False)
    to_agent = Column(String(50), nullable=False)
    message_type = Column(String(30), nullable=False) # TASK_REQUEST, TASK_RESULT, etc.
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    correlation_id = Column(String(50), nullable=True)


class AgentFeedback(Base):
    __tablename__ = "agent_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(50), nullable=True, index=True)
    rating = Column(String(20), nullable=False) # thumbs_up, thumbs_down, incorrect
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AgentHealth(Base):
    __tablename__ = "agent_health"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String(50), ForeignKey("agents.agent_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    success_rate = Column(Float, default=1.0)
    failure_rate = Column(Float, default=0.0)
    average_latency = Column(Float, default=0.0)
    average_cost = Column(Float, default=0.0)
    last_failure = Column(DateTime, nullable=True)
    status = Column(String(20), default="HEALTHY") # HEALTHY, DEGRADED, UNAVAILABLE, DISABLED


class AgentEvent(Base):
    __tablename__ = "agent_events"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, nullable=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False) # AGENT_STARTED, AGENT_COMPLETED, etc.
    agent_id = Column(String(50), nullable=True, index=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    provider = Column(String(50), nullable=False)
    provider_reference = Column(String(100), nullable=True)
    booking_type = Column(String(30), nullable=False) # hotel, flight
    status = Column(String(30), nullable=False, default="PENDING")
    details = Column(JSON, nullable=True)
    amount = Column(Float, default=0.0)
    currency = Column(String(10), default="INR")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ActionConfirmation(Base):
    __tablename__ = "action_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    confirmation_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    action_id = Column(Integer, ForeignKey("agent_actions.id", ondelete="CASCADE"), nullable=False, index=True)
    action_hash = Column(String(64), nullable=False)
    status = Column(String(20), default="WAITING_CONFIRMATION")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False)


class ActionReceipt(Base):
    __tablename__ = "action_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(String(50), unique=True, index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    action_id = Column(Integer, ForeignKey("agent_actions.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    reference_id = Column(String(100), nullable=True)
    amount = Column(Float, default=0.0)
    currency = Column(String(10), default="INR")
    status = Column(String(20), default="CONFIRMED")
    receipt_details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class IntegrationRegistry(Base):
    __tablename__ = "integration_registry"

    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(50), nullable=False)
    provider = Column(String(50), nullable=False)
    version = Column(String(20), default="1.0.0")
    capabilities = Column(JSON, nullable=True)
    authentication_type = Column(String(30), default="API_KEY")
    enabled = Column(Boolean, default=True)
    health_status = Column(String(20), default="HEALTHY")


class SystemAuditLog(Base):
    __tablename__ = "system_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    run_id = Column(Integer, nullable=True, index=True)
    agent_id = Column(String(50), nullable=True, index=True)
    action_id = Column(Integer, ForeignKey("agent_actions.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False) # AUTH_LOGIN, AGENT_STARTED, etc.
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    result = Column(String(50), nullable=True) # SUCCESS, FAILURE, DENIED
    event_metadata = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SecurityIncident(Base):
    __tablename__ = "security_incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False)
    incident_type = Column(String(50), nullable=False) # prompt_injection, failed_logins, etc.
    status = Column(String(20), default="OPEN") # OPEN, INVESTIGATING, MITIGATED, RESOLVED
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ConflictRecord(Base):
    __tablename__ = "conflict_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    claim = Column(Text, nullable=False)
    source_a = Column(String(100), nullable=False)
    source_b = Column(String(100), nullable=False)
    values = Column(JSON, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolution = Column(Text, nullable=True)


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="ACTIVE") # ACTIVE, PAUSED, COMPLETED, CANCELLED
    priority = Column(Integer, default=1)
    progress = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    target_date = Column(DateTime, nullable=True)


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(String(50), unique=True, index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal = Column(Text, nullable=False)
    status = Column(String(30), default="DRAFT") # DRAFT, READY, RUNNING, PAUSED, WAITING, COMPLETED, PARTIALLY_COMPLETED, FAILED, CANCELLED
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    estimated_duration = Column(Integer, default=60) # minutes
    risk_level = Column(String(20), default="LOW")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class PlanStep(Base):
    __tablename__ = "plan_steps"

    id = Column(Integer, primary_key=True, index=True)
    step_id = Column(String(50), unique=True, index=True, nullable=False)
    plan_id = Column(String(50), ForeignKey("plans.plan_id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(50), nullable=True)
    tool_id = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    dependencies = Column(JSON, nullable=True) # list of step_ids
    status = Column(String(20), default="PENDING") # PENDING, READY, RUNNING, WAITING, COMPLETED, FAILED, SKIPPED, CANCELLED
    attempt_count = Column(Integer, default=0)
    risk_level = Column(String(20), default="LOW")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)


class PlanRevision(Base):
    __tablename__ = "plan_revisions"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(String(50), ForeignKey("plans.plan_id", ondelete="CASCADE"), nullable=False, index=True)
    plan_version = Column(Integer, default=1)
    reason = Column(Text, nullable=False)
    changed_steps = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class HumanEscalation(Base):
    __tablename__ = "human_escalations"

    id = Column(Integer, primary_key=True, index=True)
    escalation_id = Column(String(50), unique=True, index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="OPEN") # OPEN, ASSIGNED, IN_REVIEW, RESOLVED, REJECTED
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FailurePattern(Base):
    __tablename__ = "failure_patterns"

    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String(50), unique=True, index=True, nullable=False)
    agent_id = Column(String(50), nullable=True)
    tool_id = Column(String(50), nullable=True)
    provider = Column(String(50), nullable=True)
    failure_type = Column(String(30), nullable=False) # TRANSIENT, PERMANENT, etc.
    frequency = Column(Integer, default=1)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolution = Column(Text, nullable=True)


class UserIntegration(Base):
    __tablename__ = "user_integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    integration_id = Column(String(50), nullable=False, index=True)
    provider_account_id = Column(String(100), nullable=True)
    status = Column(String(20), default="CONNECTED") # CONNECTED, DISCONNECTED, ERROR
    scopes = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FactualClaim(Base):
    __tablename__ = "factual_claims"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(50), unique=True, index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    claim_type = Column(String(30), default="FACTUAL") # FACTUAL, NUMERICAL, TEMPORAL, etc.
    importance = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    verification_required = Column(Boolean, default=True)
    status = Column(String(30), default="UNVERIFIED") # UNVERIFIED, VERIFYING, VERIFIED, PARTIALLY_VERIFIED, CONFLICTING, UNSUPPORTED, STALE, UNKNOWN
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    verified_at = Column(DateTime, nullable=True)


class ClaimEvidence(Base):
    __tablename__ = "claim_evidence"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(50), unique=True, index=True, nullable=False)
    claim_id = Column(String(50), ForeignKey("factual_claims.claim_id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(50), nullable=True)
    content = Column(Text, nullable=False)
    url = Column(String(255), nullable=True)
    title = Column(String(255), nullable=True)
    provider = Column(String(50), nullable=True)
    retrieved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)
    freshness = Column(String(20), default="UNKNOWN") # FRESH, RECENT, AGING, STALE, UNKNOWN
    relevance = Column(Float, default=1.0)
    quality = Column(Float, default=1.0)
    independence_group = Column(String(50), nullable=True)
    hash = Column(String(64), nullable=True)
    relation = Column(String(20), default="SUPPORTS") # SUPPORTS, CONTRADICTS, PARTIALLY_SUPPORTS, CONTEXT_ONLY, IRRELEVANT
    event_metadata = Column(JSON, nullable=True)


class InformationSource(Base):
    __tablename__ = "information_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    domain = Column(String(100), nullable=True)
    provider = Column(String(50), nullable=True)
    source_type = Column(String(30), default="UNKNOWN") # OFFICIAL, GOVERNMENT, PRIMARY, REPUTABLE_NEWS, RESEARCH, COMMERCIAL, USER_PROVIDED, SEARCH_RESULT, UNKNOWN
    trust_level = Column(Float, default=1.0)
    authority = Column(Float, default=1.0)
    last_checked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(20), default="ACTIVE")


class TaskVerificationSummary(Base):
    __tablename__ = "task_verification_summaries"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    total_claims = Column(Integer, default=0)
    verified_claims = Column(Integer, default=0)
    partially_verified_claims = Column(Integer, default=0)
    conflicting_claims = Column(Integer, default=0)
    unsupported_claims = Column(Integer, default=0)
    stale_claims = Column(Integer, default=0)
    unknown_claims = Column(Integer, default=0)
    overall_status = Column(String(30), default="INSUFFICIENT_EVIDENCE") # FULLY_VERIFIED, MOSTLY_VERIFIED, PARTIALLY_VERIFIED, CONFLICTING, INSUFFICIENT_EVIDENCE


class AgentRegistry(Base):
    __tablename__ = "agent_registries"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(String(20), default="1.0.0")
    capabilities = Column(JSON, nullable=True) # list of strings
    required_tools = Column(JSON, nullable=True)
    permissions = Column(JSON, nullable=True)
    risk_level = Column(String(20), default="LOW")
    status = Column(String(20), default="ACTIVE") # ACTIVE, DISABLED, MAINTENANCE, ERROR
    health = Column(String(20), default="HEALTHY")


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    required_capabilities = Column(JSON, nullable=True)
    dependencies = Column(JSON, nullable=True)
    risk_level = Column(String(20), default="LOW")


class ResourceLock(Base):
    __tablename__ = "resource_locks"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(String(100), unique=True, index=True, nullable=False)
    locked_by_agent = Column(String(50), nullable=False)
    acquired_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class ApiClient(Base):
    __tablename__ = "api_clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="ACTIVE") # ACTIVE, SUSPENDED, REVOKED
    environment = Column(String(20), default="DEVELOPMENT") # DEVELOPMENT, STAGING, PRODUCTION
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("api_clients.id", ondelete="CASCADE"), nullable=False, index=True)
    key_hash = Column(String(128), nullable=False)
    prefix = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    scopes = Column(JSON, nullable=True) # list of scopes
    status = Column(String(20), default="ACTIVE") # ACTIVE, REVOKED


class ApiProject(Base):
    __tablename__ = "api_projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("api_clients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    environment = Column(String(20), default="DEVELOPMENT")
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("api_clients.id", ondelete="CASCADE"), nullable=False, index=True)
    callback_url = Column(String(255), nullable=False)
    events = Column(JSON, nullable=True)
    secret = Column(String(128), nullable=False)
    status = Column(String(20), default="ACTIVE") # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(128), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("api_clients.id", ondelete="CASCADE"), nullable=False, index=True)
    response_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="ACTIVE") # ACTIVE, SUSPENDED, DELETED
    plan = Column(String(20), default="FREE") # FREE, PRO, BUSINESS, ENTERPRISE
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String(20), default="MEMBER") # OWNER, ADMIN, MANAGER, MEMBER, VIEWER, DEVELOPER, AUDITOR
    status = Column(String(20), default="ACTIVE") # INVITED, ACTIVE, SUSPENDED, REMOVED
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class OrganizationInvitation(Base):
    __tablename__ = "organization_invitations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(100), nullable=False, index=True)
    role_id = Column(String(20), default="MEMBER")
    token_hash = Column(String(128), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="PENDING")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class OrgPolicy(Base):
    __tablename__ = "org_policies"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(String(50), unique=True, index=True, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    allowed_agents = Column(JSON, nullable=True)
    allowed_tools = Column(JSON, nullable=True)
    max_task_cost = Column(Float, default=10.0)
    risk_limit = Column(String(20), default="HIGH")
    version = Column(Integer, default=1)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(50), unique=True, index=True, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="PENDING") # PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED
    amount = Column(Float, default=0.0)
    action_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False, index=True) # LOGIN_FAILURE, API_KEY_ABUSE, etc.
    severity = Column(String(20), default="INFO") # INFO, LOW, MEDIUM, HIGH, CRITICAL
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(20), default="OPEN") # OPEN, INVESTIGATING, MITIGATED, RESOLVED, CLOSED
    severity = Column(String(20), default="MEDIUM")
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)


class RealAction(Base):
    __tablename__ = "real_actions"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String(50), unique=True, index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(String(50), nullable=True)
    agent_id = Column(String(50), nullable=False)
    action_type = Column(String(50), nullable=False) # SEARCH, COMPARE, BOOK, PURCHASE, etc.
    target = Column(String(100), nullable=True)
    parameters = Column(JSON, nullable=True)
    risk_level = Column(String(20), default="LOW")
    confirmation_required = Column(Boolean, default=False)
    approval_required = Column(Boolean, default=False)
    status = Column(String(30), default="PREPARING") # PREPARING, AWAITING_CONFIRMATION, AWAITING_APPROVAL, AUTHORIZED, EXECUTING, VERIFYING, COMPLETED, FAILED, CANCELLED, EXPIRED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    executed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)