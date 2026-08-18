import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import api from "../services/api";
import "../styles/UserDashboard.css";
import Logo from "../components/Logo";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  HelpCircle,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  User,
  X,
  Send,
  CircleAlert,
  Loader2,
  Globe,
  ExternalLink,
  FileText,
} from "lucide-react";

type TaskStatus = "received" | "parsing" | "executing" | "verifying" | "completed" | "failed" | "pending" | "running" | string;

type Task = {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  task_type: string;
  status: TaskStatus;
  confidence_score?: number | null;
  final_result?: string | null;
  reference_count?: number;
  created_at: string;
  updated_at: string;
  plan?: any;
  verification_status?: string | null;
  review_status?: string | null;
};

type VerificationMessage = {
  id: number;
  task_id: number;
  user_id: number;
  sender: "user" | "assistant" | "system" | string;
  message: string;
  message_type: string;
  created_at: string;
};

type TaskDetail = Task & {
  messages: VerificationMessage[];
};

type ContactMessage = {
  id: number;
  subject: string;
  message: string;
  status: string;
  admin_reply?: string | null;
  created_at: string;
};

const formatEvidenceData = (ev: any) => {
  if (!ev.evidence_data) return null;
  let evidence = ev.evidence_data;
  if (typeof evidence === "string") {
    try {
      evidence = JSON.parse(evidence);
    } catch {
      return <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>{evidence}</div>;
    }
  }
  const data = evidence.data;
  if (!data) return null;

  if (ev.source_type === "calculator") {
    return (
      <div style={{ marginTop: "4px", color: "#10b981", fontSize: "9px" }}>
        📊 <strong>Result:</strong> {data.expression} = {data.result}
      </div>
    );
  }
  if (ev.source_type === "web_search") {
    const results = data.results || [];
    return (
      <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>
        🌐 <strong>Found {results.length} search matches:</strong>
        <ul style={{ margin: "2px 0 0", paddingLeft: "12px" }}>
          {results.slice(0, 3).map((r: any, idx: number) => (
            <li key={idx}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--dash-primary)", textDecoration: "underline" }}>
                {r.title || r.source || "Link"}
              </a>: {r.snippet ? r.snippet.substring(0, 80) + "..." : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (ev.source_type === "web_fetch") {
    return (
      <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>
        📄 <strong>Fetched URL text:</strong> {data.text ? data.text.substring(0, 100) + "..." : "No text"}
      </div>
    );
  }
  if (ev.source_type === "database_lookup") {
    return (
      <div style={{ marginTop: "4px", color: "var(--dash-secondary)", fontSize: "9px" }}>
        🗄️ <strong>Lookup type:</strong> {data.operation}. Found {Array.isArray(data.data) ? data.data.length : 1} records.
      </div>
    );
  }
  if (ev.source_type === "verification") {
    return (
      <div style={{ marginTop: "4px", color: "#10b981", fontSize: "9px" }}>
        🔍 <strong>Verification result:</strong> {data.verification_status} ({Number(data.confidence_score).toFixed(1)}% confidence)
      </div>
    );
  }
  return null;
};

const STATUS_LABEL: Record<string, string> = {
  created: "Created",
  queued: "Queued",
  planning: "Planning",
  running: "Running",
  verifying: "Verifying",
  completed: "Completed",
  partially_completed: "Partially Completed",
  needs_review: "Needs Review",
  failed: "Failed",
  cancelled: "Cancelled",
  requires_confirmation: "Awaiting Action",
  waiting_for_user: "Awaiting Action",
  collecting_evidence: "Collecting Evidence",
  analyzing: "Analyzing",
  evaluating: "Evaluating",
  verified: "Verified",
  awaiting_admin_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  inconclusive: "Inconclusive",
};

function statusLabel(status: string) {
  return STATUS_LABEL[status.toLowerCase()] ?? status.replaceAll("_", " ");
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (["completed", "verified", "approved"].includes(s)) return "verified";
  if (["failed", "rejected", "cancelled"].includes(s)) return "failed";
  if (["pending", "created", "queued", "requires_confirmation", "waiting_for_user"].includes(s)) return "pending";
  if (["needs_review", "awaiting_admin_review", "inconclusive", "partially_completed"].includes(s)) return "warning";
  return "running";
}

function initials(name?: string | null) {
  return (name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserDashboard() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [supportMessages, setSupportMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskDetail | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [creatingVerification, setCreatingVerification] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTaskType, setNewTaskType] = useState("verification");
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  const [profileName, setProfileName] = useState(user?.fullname ?? "");
  const [profileImage, setProfileImage] = useState(user?.profile_image ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [supportSubject, setSupportSubject] = useState("");
  const [supportText, setSupportText] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  const [agentTaskText, setAgentTaskText] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [agentPlanResult, setAgentPlanResult] = useState<any>(null);
  const [executingPlan, setExecutingPlan] = useState(false);
  const [taskExecutions, setTaskExecutions] = useState<any[]>([]);
  const [taskEvidence, setTaskEvidence] = useState<any[]>([]);
  const [activeAgentTaskId, setActiveAgentTaskId] = useState<number | null>(null);
  const [agentTaskLogs, setAgentTaskLogs] = useState<any[]>([]);
  const [agentTaskResultDetail, setAgentTaskResultDetail] = useState<any>(null);
  const [agentTaskDetail, setAgentTaskDetail] = useState<any>(null);
  const [agentPendingAction, setAgentPendingAction] = useState<any>(null);

  const fetchTasks = async () => {
    const response = await api.get<Task[]>("/tasks");
    setTasks(response.data);
    
    // Auto-select latest research task to persist UI state on refresh
    const latestResearch = response.data.find(
      (t) => t.task_type !== "verification"
    );
    if (latestResearch && !activeAgentTaskId) {
      setActiveAgentTaskId(latestResearch.id);
    }
  };

  const fetchSupport = async () => {
    try {
      const response = await api.get<ContactMessage[]>("/contact/messages");
      setSupportMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch support messages", error);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchSupport()]);
    } catch (error) {
      console.error("Failed to load dashboard", error);
      toast("Unable to load your dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setProfileName(user?.fullname ?? "");
    setProfileImage(user?.profile_image ?? "");
  }, [user?.fullname, user?.profile_image]);

  useEffect(() => {
    if (!activeTask || !["received", "parsing", "executing", "verifying", "running", "pending"].includes(activeTask.status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await api.get<TaskDetail>(`/tasks/${activeTask.id}`);
        setActiveTask(response.data);
        setTasks((current) =>
          current.map((task) => (task.id === response.data.id ? response.data : task))
        );

        if (["completed", "verified", "failed", "rejected"].includes(response.data.status)) {
          window.clearInterval(timer);
        }
      } catch (error) {
        console.error("Failed to refresh verification", error);
      }
    }, 2000);

  }, [activeTask?.id, activeTask?.status]);

  useEffect(() => {
    if (!activeAgentTaskId) {
      setAgentTaskLogs([]);
      setAgentTaskResultDetail(null);
      setAgentTaskDetail(null);
      return;
    }

    let timer: any;
    
    const pollTask = async () => {
      try {
        const [taskRes, logsRes] = await Promise.all([
          api.get(`/tasks/${activeAgentTaskId}`),
          api.get(`/tasks/${activeAgentTaskId}/executions`)
        ]);
        
        setAgentTaskDetail(taskRes.data);
        setAgentTaskLogs(logsRes.data);

        const status = taskRes.data.status.toLowerCase();

        if (status === "requires_confirmation") {
          try {
            const actionsRes = await api.get("/actions");
            const pendingAction = actionsRes.data.actions?.find(
              (a: any) => a.task_id === activeAgentTaskId && a.status === "PENDING"
            );
            setAgentPendingAction(pendingAction || null);
          } catch (err) {
            console.error("Failed to fetch pending action", err);
          }
        } else {
          setAgentPendingAction(null);
        }

        if (["completed", "failed", "cancelled"].includes(status)) {
          try {
            const resultRes = await api.get(`/tasks/${activeAgentTaskId}/result`);
            setAgentTaskResultDetail(resultRes.data);
          } catch (err) {
            console.error("Failed to fetch task result", err);
          }
          window.clearInterval(timer);
          setExecutingPlan(false);
          setAgentPendingAction(null);
        } else if (["parsing", "received"].includes(status)) {
          // Plan is ready or newly received, allow user to click Execute Plan
          setExecutingPlan(false);
        } else {
          // Keep executing state active if task is still running
          setExecutingPlan(true);
        }
      } catch (error) {
        console.error("Error polling agent task", error);
      }
    };

    pollTask();
    timer = window.setInterval(pollTask, 1500);

    return () => {
      window.clearInterval(timer);
      setAgentPendingAction(null);
    };
  }, [activeAgentTaskId]);

  useEffect(() => {
    if (!activeTask) {
      setTaskExecutions([]);
      setTaskEvidence([]);
      return;
    }

    let isMounted = true;
    const fetchLogsAndEvidence = async () => {
      try {
        const [execRes, evRes] = await Promise.all([
          api.get(`/tasks/${activeTask.id}/executions`),
          api.get(`/tasks/${activeTask.id}/evidence`)
        ]);
        if (isMounted) {
          setTaskExecutions(execRes.data);
          setTaskEvidence(evRes.data);
        }
      } catch (err) {
        console.error("Failed to fetch task secondary details", err);
      }
    };

    fetchLogsAndEvidence();

    return () => {
      isMounted = false;
    };
  }, [activeTask?.id, activeTask?.status]);



  if (!user) return null;

  const total = tasks.length;
  const verified = tasks.filter((task) => ["completed", "verified"].includes(task.status)).length;
  const running = tasks.filter((task) => ["received", "parsing", "executing", "verifying", "running", "pending"].includes(task.status)).length;
  const failed = tasks.filter((task) => ["failed", "rejected"].includes(task.status)).length;

  const filteredTasks = useMemo(() => {
    let result = tasks;
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((task) =>
        `${task.title} ${task.task_type} ${task.status}`.toLowerCase().includes(query)
      );
    }
    if (taskStatusFilter === "active") {
      result = result.filter((task) =>
        ["received", "parsing", "executing", "verifying", "running", "pending"].includes(task.status.toLowerCase())
      );
    } else if (taskStatusFilter === "completed") {
      result = result.filter((task) =>
        ["completed", "verified"].includes(task.status.toLowerCase())
      );
    } else if (taskStatusFilter === "failed") {
      result = result.filter((task) =>
        ["failed", "rejected"].includes(task.status.toLowerCase())
      );
    } else if (taskStatusFilter === "cancelled") {
      result = result.filter((task) =>
        ["cancelled"].includes(task.status.toLowerCase())
      );
    }
    return result;
  }, [tasks, search, taskStatusFilter]);

  const recentTasks = tasks.slice(0, 5);
  const latestRunningTask = tasks.find((task) => ["received", "parsing", "executing", "verifying", "running", "pending"].includes(task.status));

  const openSection = (section: string) => {
    setActiveSection(section);
    setMobileNav(false);
    setShowProfileMenu(false);
    if (section === "agent") {
      setAssistantOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const openTask = async (taskId: number) => {
    try {
      setAssistantLoading(true);
      const response = await api.get<TaskDetail>(`/tasks/${taskId}`);
      if (response.data.task_type !== "verification") {
        setActiveAgentTaskId(response.data.id);
        setAgentPlanResult(null);
        setAssistantOpen(false);
        openSection("agent");
        return;
      }
      setActiveTask(response.data);
      setAssistantOpen(true);
    } catch (error: any) {
      toast(error.response?.data?.detail || "Unable to open verification.", "error");
    } finally {
      setAssistantLoading(false);
    }
  };

  const startNewVerification = async () => {
    const title = newTitle.trim();
    const description = newDescription.trim();

    if (title.length < 3) {
      toast("Give your verification a clear title.", "error");
      return;
    }
    if (description.length < 5) {
      toast("Describe what you want Verinova to verify.", "error");
      return;
    }

    try {
      setCreatingVerification(true);
      const created = await api.post<Task>("/tasks", {
        title,
        description,
        task_type: newTaskType,
      });

      const detail = await api.get<TaskDetail>(`/tasks/${created.data.id}`);
      setTasks((current) => [created.data, ...current]);
      setActiveTask(detail.data);
      setAssistantOpen(true);
      setCreatingVerification(false);
      setNewTitle("");
      setNewDescription("");
      setNewTaskType("verification");
      toast("Verification request created.", "success");

      try {
        await api.post(`/tasks/${created.data.id}/start`);
        const refreshed = await api.get<TaskDetail>(`/tasks/${created.data.id}`);
        setActiveTask(refreshed.data);
        setTasks((current) =>
          current.map((task) => (task.id === created.data.id ? refreshed.data : task))
        );
      } catch (error) {
        console.error("Unable to start verification", error);
      }
    } catch (error: any) {
      setCreatingVerification(false);
      toast(error.response?.data?.detail || "Unable to create verification.", "error");
    }
  };

  const sendVerificationMessage = async () => {
    if (!activeTask || !messageInput.trim()) return;

    const text = messageInput.trim();
    setMessageInput("");

    try {
      const response = await api.post<VerificationMessage>(
        `/tasks/${activeTask.id}/messages`,
        { message: text }
      );
      setActiveTask((current) =>
        current
          ? { ...current, messages: [...current.messages, response.data] }
          : current
      );
    } catch (error: any) {
      setMessageInput(text);
      toast(error.response?.data?.detail || "Unable to send message.", "error");
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast("Supported formats are JPG, JPEG, PNG, and WEBP.", "error");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast("Image size must be less than 5MB.", "error");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/user/profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      updateUser(response.data);
      setProfileImage(response.data.profile_image || "");
      toast("Profile photo updated successfully.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Failed to upload image.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProfile = async () => {
    const fullname = profileName.trim();
    if (fullname.length < 3) {
      toast("Full name must contain at least 3 characters.", "error");
      return;
    }

    try {
      setSavingProfile(true);
      const response = await api.put("/user/profile", {
        fullname,
        profile_image: profileImage ? profileImage.trim() : null,
      });
      updateUser(response.data);
      toast("Profile updated successfully.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Unable to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || newPassword.length < 8) {
      toast("Enter your current password and a new password of at least 8 characters.", "error");
      return;
    }

    try {
      setSavingPassword(true);
      await api.put("/user/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      toast("Password changed successfully.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Unable to change password.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const sendSupportMessage = async () => {
    if (supportSubject.trim().length < 2 || supportText.trim().length < 10) {
      toast("Add a subject and a detailed support message.", "error");
      return;
    }

    try {
      setSendingSupport(true);
      await api.post("/contact", {
        subject: supportSubject.trim(),
        message: supportText.trim(),
      });
      setSupportSubject("");
      setSupportText("");
      await fetchSupport();
      toast("Your message was sent to the Verinova team.", "success");
    } catch (error: any) {
      toast(error.response?.data?.detail || "Unable to send your message.", "error");
    } finally {
      setSendingSupport(false);
    }
  };

  const handleGenerateAgentPlan = async () => {
    const text = agentTaskText.trim();
    if (text.length < 5) {
      toast("Please provide a task description of at least 5 characters.", "error");
      return;
    }

    try {
      setGeneratingPlan(true);
      setAgentPlanResult(null);
      setAgentTaskLogs([]);
      setAgentTaskResultDetail(null);
      setAgentTaskDetail(null);
      
      const res = await api.post("/agent/plan", { task_text: text });
      setAgentPlanResult(res.data);
      setActiveAgentTaskId(res.data.task_id);
      setAgentTaskText("");
      fetchTasks();
      toast("Agent plan generated successfully.", "success");
    } catch (error: any) {
      toast(error.response?.data?.error?.message || error.response?.data?.detail || "Failed to generate agent plan.", "error");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const [confirmingActionId, setConfirmingActionId] = useState<number | null>(null);

  const handleExecuteAgentTask = async () => {
    const taskId = agentPlanResult?.task_id || activeAgentTaskId;
    if (!taskId) return;

    try {
      setExecutingPlan(true);
      setAgentTaskResultDetail(null);
      const res = await api.post("/agent/execute", { task_id: taskId });
      setActiveAgentTaskId(taskId); // Ensure active taskId is set for polling
      fetchTasks();

      if (res.data.status === "requires_confirmation") {
        toast("Action requires your confirmation in chat.", "info");
        openTask(taskId);
      } else {
        toast("Agent task executed successfully.", "success");
      }
    } catch (error: any) {
      toast(error.response?.data?.error?.message || error.response?.data?.detail || "Agent execution failed.", "error");
    } finally {
      setExecutingPlan(false);
    }
  };

  const handleConfirmAction = async (actionId: number) => {
    const taskId = activeTask?.id || activeAgentTaskId;
    if (!taskId) return;
    try {
      setConfirmingActionId(actionId);
      const res = await api.post("/agent/execute", {
        task_id: taskId,
        confirm_action_id: actionId
      });
      fetchTasks();
      if (activeTask) {
        await openTask(activeTask.id);
      }
      if (activeAgentTaskId) {
        const [taskRes, logsRes] = await Promise.all([
          api.get(`/tasks/${activeAgentTaskId}`),
          api.get(`/tasks/${activeAgentTaskId}/executions`)
        ]);
        setAgentTaskDetail(taskRes.data);
        setAgentTaskLogs(logsRes.data);
      }

      if (res.data.status === "requires_confirmation") {
        toast("Another action requires your confirmation.", "info");
      } else {
        toast("Action confirmed and executed successfully.", "success");
      }
    } catch (error: any) {
      toast(error.response?.data?.error?.message || error.response?.data?.detail || "Action execution failed.", "error");
    } finally {
      setConfirmingActionId(null);
    }
  };

  const handleCancelAction = async () => {
    const taskId = activeTask?.id || activeAgentTaskId;
    if (!taskId) return;
    try {
      await api.post(`/tasks/${taskId}/cancel`);
      fetchTasks();
      if (activeTask) {
        await openTask(activeTask.id);
      }
      if (activeAgentTaskId) {
        const [taskRes, logsRes] = await Promise.all([
          api.get(`/tasks/${activeAgentTaskId}`),
          api.get(`/tasks/${activeAgentTaskId}/executions`)
        ]);
        setAgentTaskDetail(taskRes.data);
        setAgentTaskLogs(logsRes.data);
      }
      toast("Task action cancelled successfully.", "info");
    } catch (error: any) {
      toast("Failed to cancel task action.", "error");
    }
  };

  const renderStatusCard = (task: Task) => (
    <span className={`user-status-badge ${statusClass(task.status)}`}>
      {statusLabel(task.status)}
    </span>
  );

  return (
    <div className="user-dashboard">
      <aside className={`dashboard-sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="dashboard-logo">
          <Logo subtitle="Verification Workspace" size="sm" />
        </div>

        <nav className="dashboard-nav">
          <div className="dashboard-nav-section">
            <div className="dashboard-nav-title">Workspace</div>
            <button className={`nav-item ${activeSection === "overview" ? "active" : ""}`} onClick={() => openSection("overview")}>
              <LayoutDashboard size={17} />
              <span>Overview</span>
            </button>
            <button className={`nav-item ${activeSection === "verifications" ? "active" : ""}`} onClick={() => openSection("verifications")}>
              <CheckCircle2 size={17} />
              <span>My Verifications</span>
              {running > 0 && <span className="nav-badge">{running}</span>}
            </button>
            <button className={`nav-item ${activeSection === "activity" ? "active" : ""}`} onClick={() => openSection("activity")}>
              <Activity size={17} />
              <span>Activity</span>
            </button>
            <button className={`nav-item ${activeSection === "agent" ? "active" : ""}`} onClick={() => openSection("agent")}>
              <Activity size={17} className="text-dash-primary" />
              <span>AI Agent</span>
            </button>
          </div>

          <div className="dashboard-nav-section">
            <div className="dashboard-nav-title">Account</div>
            <button className={`nav-item ${activeSection === "profile" ? "active" : ""}`} onClick={() => openSection("profile")}>
              <User size={17} />
              <span>Profile</span>
            </button>
            <button className={`nav-item ${activeSection === "settings" ? "active" : ""}`} onClick={() => openSection("settings")}>
              <Settings size={17} />
              <span>Settings</span>
            </button>
            <button className={`nav-item ${activeSection === "support" ? "active" : ""}`} onClick={() => openSection("support")}>
              <HelpCircle size={17} />
              <span>Support</span>
            </button>
          </div>
        </nav>

        <div className="dashboard-sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user.profile_image ? <img src={user.profile_image} alt="" /> : initials(user.fullname)}
            </div>
            <div className="sidebar-user-info">
              <strong>{user.fullname}</strong>
              <span>{user.email}</span>
            </div>
            <button className="sidebar-logout" onClick={handleLogout} aria-label="Log out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button" onClick={() => setMobileNav((value) => !value)} aria-label="Menu">
              <Menu size={19} />
            </button>
            <div>
              <h1>{activeSection === "overview" ? "Verification workspace" : activeSection.replace("verifications", "My Verifications")}</h1>
              <p>Secure, transparent verification powered by Verinova.</p>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="dashboard-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search verifications..."
              />
            </div>

            <button className="topbar-icon-button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="topbar-dropdown-wrap">
              <button className="topbar-icon-button" onClick={() => setShowNotifications((value) => !value)} aria-label="Notifications">
                <Bell size={16} />
                {running > 0 && <span className="notification-dot" />}
              </button>
              {showNotifications && (
                <div className="dashboard-dropdown notification-dropdown">
                  <strong>Notifications</strong>
                  <p>{running > 0 ? `${running} verification${running === 1 ? " is" : "s are"} currently processing.` : "You're all caught up."}</p>
                </div>
              )}
            </div>

            <div className="topbar-dropdown-wrap">
              <button className="profile-trigger" onClick={() => setShowProfileMenu((value) => !value)}>
                <span className="profile-trigger-avatar">
                  {user.profile_image ? <img src={user.profile_image} alt="" /> : initials(user.fullname)}
                </span>
                <span className="profile-trigger-name">{user.fullname}</span>
                <ChevronDown size={14} />
              </button>
              {showProfileMenu && (
                <div className="dashboard-dropdown profile-dropdown">
                  <button onClick={() => openSection("profile")}><User size={14} /> Profile</button>
                  <button onClick={() => openSection("settings")}><Settings size={14} /> Settings</button>
                  <button onClick={handleLogout}><LogOut size={14} /> Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {activeSection === "overview" && (
            <>
              <section className="dashboard-welcome">
                <div>
                  <div className="eyebrow">VERINOVA VERIFICATION CENTER</div>
                  <h2>Good to see you, <span>{user.fullname.split(" ")[0]}</span>.</h2>
                  <p>Tell Verinova what you need checked. Every request is stored securely and every status is traceable.</p>
                </div>
                <button className="admin-btn admin-btn-primary user-primary-action" onClick={() => openSection("verifications")}>
                  <Plus size={15} /> Start Verification
                </button>
              </section>

              <section className="user-stats-grid">
                <div className="user-stat-card">
                  <div className="user-stat-top"><div className="user-stat-icon"><Layers size={18} /></div><span className="user-stat-caption">All time</span></div>
                  <div className="user-stat-label">Total verifications</div>
                  <div className="user-stat-value">{total}</div>
                </div>
                <div className="user-stat-card">
                  <div className="user-stat-top"><div className="user-stat-icon"><ShieldCheck size={18} /></div><span className="user-stat-caption positive">Completed</span></div>
                  <div className="user-stat-label">Verified</div>
                  <div className="user-stat-value">{verified}</div>
                </div>
                <div className="user-stat-card">
                  <div className="user-stat-top"><div className="user-stat-icon"><Clock3 size={18} /></div><span className="user-stat-caption">Live</span></div>
                  <div className="user-stat-label">In progress</div>
                  <div className="user-stat-value">{running}</div>
                </div>
                <div className="user-stat-card">
                  <div className="user-stat-top"><div className="user-stat-icon danger"><CircleAlert size={18} /></div><span className="user-stat-caption">Attention</span></div>
                  <div className="user-stat-label">Failed</div>
                  <div className="user-stat-value">{failed}</div>
                </div>
              </section>

              <section className="user-grid-two">
                <div className="admin-card user-panel">
                  <div className="admin-card-header">
                    <div><h3 className="admin-card-title">Recent verifications</h3><p className="admin-card-subtitle">Your latest verification requests.</p></div>
                    <button className="user-link-button" onClick={() => openSection("verifications")}>View all</button>
                  </div>
                  <div className="admin-card-body user-list-body">
                    {loading ? <div className="user-empty"><div className="user-spinner" /></div> : recentTasks.length === 0 ? (
                      <div className="user-empty"><ShieldCheck size={26} /><strong>No verifications yet</strong><span>Start your first verification to begin.</span><button className="admin-btn admin-btn-primary" onClick={() => openSection("verifications")}><Plus size={14} /> New verification</button></div>
                    ) : recentTasks.map((task) => (
                      <button className="verification-row" key={task.id} onClick={() => openTask(task.id)}>
                        <div className="verification-row-icon"><ShieldCheck size={16} /></div>
                        <div className="verification-row-main"><strong>{task.title}</strong><span>{task.task_type} · {formatDate(task.created_at)}</span></div>
                        {renderStatusCard(task)}
                        <div className="verification-row-arrow">›</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-card user-panel verification-summary-card">
                  <div className="admin-card-header"><div><h3 className="admin-card-title">Verification health</h3><p className="admin-card-subtitle">A quick view of your workspace.</p></div></div>
                  <div className="admin-card-body">
                    <div className="health-ring"><div><strong>{total ? Math.round((verified / total) * 100) : 0}%</strong><span>verified</span></div></div>
                    <div className="health-list">
                      <div><span className="health-dot verified" /> Verified <strong>{verified}</strong></div>
                      <div><span className="health-dot pending" /> Processing <strong>{running}</strong></div>
                      <div><span className="health-dot failed" /> Failed <strong>{failed}</strong></div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="admin-card user-panel quick-start-panel">
                <div className="admin-card-header"><div><h3 className="admin-card-title">Quick actions</h3><p className="admin-card-subtitle">Continue working with Verinova.</p></div></div>
                <div className="admin-card-body quick-start-grid">
                  <button className="quick-start-card" onClick={() => openSection("verifications")}><span><Plus size={17} /></span><div><strong>New verification</strong><small>Start a new verification request.</small></div></button>
                  <button className="quick-start-card" onClick={() => openSection("activity")}><span><Activity size={17} /></span><div><strong>View activity</strong><small>Review your recent workspace activity.</small></div></button>
                  <button className="quick-start-card" onClick={() => openSection("profile")}><span><User size={17} /></span><div><strong>Update profile</strong><small>Keep your account information current.</small></div></button>
                  <button className="quick-start-card" onClick={() => openSection("support")}><span><MessageSquare size={17} /></span><div><strong>Contact support</strong><small>Send a message to the Verinova team.</small></div></button>
                </div>
              </section>
            </>
          )}

          {activeSection === "verifications" && (
            <section>
              <div className="section-heading-row">
                <div><div className="eyebrow">VERIFICATION WORKSPACE</div><h2>My verifications</h2><p>Create a request and follow its progress from received to final result.</p></div>
                <button className="admin-btn admin-btn-primary" onClick={() => setCreatingVerification(true)}><Plus size={15} /> New verification</button>
              </div>

              {latestRunningTask && (
                <button className="active-verification-banner" onClick={() => openTask(latestRunningTask.id)}>
                  <span className="live-indicator" />
                  <div><strong>Verification in progress</strong><small>{latestRunningTask.title} · {statusLabel(latestRunningTask.status)}</small></div>
                  <span>Continue →</span>
                </button>
              )}

              <div className="admin-card user-panel">
                <div className="admin-card-header"><div><h3 className="admin-card-title">Verification history</h3><p className="admin-card-subtitle">Only requests belonging to your account are shown here.</p></div></div>
                <div className="admin-card-body verification-table-wrap">
                  <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                    {[
                      { key: "all", label: "All Tasks" },
                      { key: "active", label: "Active" },
                      { key: "completed", label: "Completed" },
                      { key: "failed", label: "Failed" },
                      { key: "cancelled", label: "Cancelled" }
                    ].map((item) => (
                      <button
                        key={item.key}
                        className={`admin-btn ${taskStatusFilter === item.key ? "admin-btn-primary" : "admin-btn-secondary"}`}
                        style={{ padding: "4px 10px", fontSize: "10px", height: "auto", minWidth: "70px", borderRadius: "14px" }}
                        onClick={() => setTaskStatusFilter(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {filteredTasks.length === 0 ? <div className="user-empty"><Search size={24} /><strong>No matching verifications</strong><span>Try a different search or create a new request.</span></div> : (
                    <div className="verification-table">
                      <div className="verification-table-head"><span>Verification</span><span>Type</span><span>Status</span><span>Confidence</span><span>Created</span><span /></div>
                      {filteredTasks.map((task) => (
                        <button className="verification-table-row" key={task.id} onClick={() => openTask(task.id)}>
                          <span><strong>{task.title}</strong><small>#{task.id}</small></span>
                          <span>{task.task_type}</span>
                          <span>{renderStatusCard(task)}</span>
                          <span>{task.confidence_score != null ? `${Number(task.confidence_score).toFixed(1)}%` : "—"}</span>
                          <span>{formatDate(task.created_at)}</span>
                          <span>›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === "activity" && (
            <section>
              <div className="section-heading-row"><div><div className="eyebrow">ACCOUNT ACTIVITY</div><h2>Activity</h2><p>A chronological view of your verification workspace.</p></div></div>
              <div className="admin-card user-panel activity-panel">
                <div className="admin-card-body">
                  {tasks.length === 0 ? <div className="user-empty"><Activity size={24} /><strong>No activity yet</strong><span>Your verification activity will appear here.</span></div> : tasks.map((task) => (
                    <button className="activity-row" key={task.id} onClick={() => openTask(task.id)}>
                      <span className={`activity-status-icon ${statusClass(task.status)}`}><ShieldCheck size={15} /></span>
                      <span className="activity-row-main"><strong>{task.title}</strong><small>Verification #{task.id} · {statusLabel(task.status)}</small></span>
                      <span className="activity-row-date">{formatDate(task.updated_at)} {formatTime(task.updated_at)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeSection === "profile" && (
            <section>
              <div className="section-heading-row"><div><div className="eyebrow">ACCOUNT</div><h2>Your profile</h2><p>Manage the identity information associated with your Verinova account.</p></div></div>
              <div style={{ maxWidth: "600px" }}>
                <div className="admin-card user-panel profile-card-main">
                  <div className="admin-card-header"><div><h3 className="admin-card-title">Profile information</h3><p className="admin-card-subtitle">Changes are saved directly to your account.</p></div></div>
                  <div className="admin-card-body">
                    <div
                      className="profile-avatar-large"
                      style={{ cursor: "pointer", position: "relative" }}
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to upload a new profile picture"
                    >
                      {user.profile_image ? (
                        <img src={user.profile_image} alt="" />
                      ) : (
                        initials(user.fullname)
                      )}
                      {uploadingImage && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.5)",
                            display: "grid",
                            placeItems: "center",
                            borderRadius: "18px",
                          }}
                        >
                          <Loader2 className="animate-spin text-white" size={24} />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label className="admin-form-group">
                      <span className="admin-form-label">Full name</span>
                      <input
                        className="admin-form-input"
                        value={profileName}
                        onChange={(event) => setProfileName(event.target.value)}
                      />
                    </label>
                    <label className="admin-form-group">
                      <span className="admin-form-label">Email</span>
                      <input className="admin-form-input" value={user.email} readOnly style={{ opacity: 0.7, cursor: "not-allowed" }} />
                    </label>
                    <button className="admin-btn admin-btn-primary" disabled={savingProfile} onClick={saveProfile}>{savingProfile ? "Saving..." : "Save profile"}</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "settings" && (
            <section>
              <div className="section-heading-row"><div><div className="eyebrow">SECURITY</div><h2>Settings</h2><p>Protect your account and control your workspace preferences.</p></div></div>
              <div className="settings-grid">
                <div className="admin-card user-panel">
                  <div className="admin-card-header"><div><h3 className="admin-card-title">Change password</h3><p className="admin-card-subtitle">Use a strong password you don't reuse elsewhere.</p></div></div>
                  <div className="admin-card-body admin-form">
                    <label className="admin-form-group"><span className="admin-form-label">Current password</span><input className="admin-form-input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
                    <label className="admin-form-group"><span className="admin-form-label">New password</span><input className="admin-form-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
                    <button className="admin-btn admin-btn-primary" disabled={savingPassword} onClick={changePassword}>{savingPassword ? "Updating..." : "Update password"}</button>
                  </div>
                </div>
                <div className="admin-card user-panel">
                  <div className="admin-card-header"><div><h3 className="admin-card-title">Appearance</h3><p className="admin-card-subtitle">Use the same VeriNova theme across the application.</p></div></div>
                  <div className="admin-card-body appearance-setting">
                    <div className="appearance-icon">{theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}</div>
                    <div><strong>{theme === "dark" ? "Dark mode" : "Light mode"}</strong><span>Switch the dashboard appearance without changing the design system.</span></div>
                    <button className="admin-btn admin-btn-secondary" onClick={toggleTheme}>{theme === "dark" ? "Use light" : "Use dark"}</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "support" && (
            <section>
              <div className="section-heading-row"><div><div className="eyebrow">VERINOVA SUPPORT</div><h2>Contact support</h2><p>Only registered users can send support messages. Your conversation is visible to the Verinova admin team.</p></div></div>
              <div className="support-layout">
                <div className="admin-card user-panel">
                  <div className="admin-card-header"><div><h3 className="admin-card-title">Send a message</h3><p className="admin-card-subtitle">We'll associate this message with your account automatically.</p></div></div>
                  <div className="admin-card-body admin-form">
                    <label className="admin-form-group"><span className="admin-form-label">Subject</span><input className="admin-form-input" value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder="How can we help?" /></label>
                    <label className="admin-form-group"><span className="admin-form-label">Message</span><textarea className="admin-form-textarea" value={supportText} onChange={(event) => setSupportText(event.target.value)} placeholder="Describe your question or issue..." /></label>
                    <button className="admin-btn admin-btn-primary" disabled={sendingSupport} onClick={sendSupportMessage}><Send size={14} /> {sendingSupport ? "Sending..." : "Send to Verinova"}</button>
                  </div>
                </div>
                <div className="admin-card user-panel">
                  <div className="admin-card-header"><div><h3 className="admin-card-title">Previous messages</h3><p className="admin-card-subtitle">Responses from the admin team appear here.</p></div></div>
                  <div className="admin-card-body support-history">
                    {supportMessages.length === 0 ? <div className="user-empty"><MessageSquare size={24} /><strong>No support messages</strong><span>Messages you send will appear here.</span></div> : supportMessages.map((message) => (
                      <div className="support-message" key={message.id}>
                        <div className="support-message-head"><strong>{message.subject}</strong><span>{message.status}</span></div>
                        <p>{message.message}</p>
                        {message.admin_reply && <div className="support-reply"><strong>Verinova Admin</strong><p>{message.admin_reply}</p></div>}
                        <small>{formatDate(message.created_at)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === "agent" && (
            <div className="dashboard-grid-one-col text-left">
              <section className="dashboard-panel full-width-panel">
                <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2>AI Research Agent</h2>
                  {activeAgentTaskId && (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <select
                        className="admin-form-select"
                        style={{ padding: "6px 12px", fontSize: "12px", width: "auto", margin: 0 }}
                        value={activeAgentTaskId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setActiveAgentTaskId(Number(val));
                            setAgentPlanResult(null);
                            setAgentTaskResultDetail(null);
                          }
                        }}
                      >
                        <option value="" disabled>Select past research task</option>
                        {tasks.filter(t => t.task_type !== "verification").map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="panel-body" style={{ marginTop: "15px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "25px" }}>
                    
                    {/* Left Column: Input Form & Plan Steps */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div className="admin-card user-panel" style={{ padding: "20px", border: "1px solid var(--dash-border)", borderRadius: "14px" }}>
                        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "10px" }}>New Research Goal</h3>
                        <p className="panel-subtitle" style={{ fontSize: "12px", color: "var(--dash-secondary)", marginBottom: "15px" }}>
                          Enter a natural-language query to start real-time web research, product comparisons, and analysis.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <textarea
                            placeholder="e.g. Compare prices for iPhone 15 128GB under ₹60,000 across Flipkart and Meesho, tell me which is the best value, and show me the sources."
                            value={agentTaskText}
                            onChange={(e) => setAgentTaskText(e.target.value)}
                            className="admin-form-textarea"
                            style={{ minHeight: "100px", padding: "12px", fontSize: "13px" }}
                            disabled={generatingPlan}
                          />
                          <button
                            onClick={handleGenerateAgentPlan}
                            className="admin-btn admin-btn-primary"
                            style={{ alignSelf: "flex-start", padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", height: "auto" }}
                            disabled={generatingPlan}
                          >
                            {generatingPlan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            <span>{generatingPlan ? "Generating Plan..." : "Generate Plan"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Plan details if available */}
                      {(agentPlanResult?.plan || agentTaskDetail?.plan) && (
                        <div className="admin-card user-panel" style={{ padding: "20px", border: "1px solid var(--dash-border)", borderRadius: "14px" }}>
                          <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "15px" }}>Structured Execution Plan</h3>
                          
                          <div style={{ background: "var(--dash-bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--dash-border)", marginBottom: "15px" }}>
                            <p style={{ margin: 0, fontSize: "12px" }}><strong>Objective:</strong> {agentPlanResult?.plan?.objective || agentTaskDetail?.plan?.objective || agentTaskDetail?.title}</p>
                            <p style={{ margin: "6px 0 0", fontSize: "12px" }}><strong>Task Type:</strong> <span className="status-pill pending" style={{ textTransform: "uppercase", fontSize: "9px" }}>{agentPlanResult?.plan?.task_type || agentTaskDetail?.plan?.task_type || "research"}</span></p>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {(agentPlanResult?.plan?.steps || agentTaskDetail?.plan?.steps || []).map((step: any, idx: number) => (
                              <div key={idx} style={{ display: "flex", gap: "10px", background: "var(--brand-card)", padding: "10px", borderRadius: "10px", border: "1px solid var(--dash-border)" }}>
                                <div style={{ background: "var(--dash-primary)", color: "white", width: "20px", height: "20px", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "10px", fontWeight: 800, flexShrink: 0 }}>
                                  {step.step_number || step.step_id || (idx + 1)}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 650 }}>{step.description}</p>
                                  <p style={{ margin: 0, fontSize: "10px", color: "var(--dash-secondary)" }}>
                                    <strong>Tool:</strong> <code>{step.tool}</code>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                            <button
                              onClick={handleExecuteAgentTask}
                              className="admin-btn admin-btn-primary"
                              style={{ padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", height: "auto" }}
                              disabled={executingPlan}
                            >
                              {executingPlan ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                              <span>
                                {executingPlan 
                                  ? (agentTaskDetail?.description?.toLowerCase().includes("compare") 
                                      ? "Comparing products..." 
                                      : "Executing Plan...") 
                                  : "Execute Plan"}
                              </span>
                            </button>
                            {(agentPlanResult?.task_id || activeAgentTaskId) && (
                              <button
                                onClick={() => openTask(agentPlanResult?.task_id || activeAgentTaskId!)}
                                className="admin-btn admin-btn-secondary"
                                style={{ padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                              >
                                <MessageSquare size={14} />
                                <span>Open Workspace Chat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Execution Live State, Timeline & Results */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {activeAgentTaskId ? (
                        <div className="admin-card user-panel" style={{ padding: "20px", border: "1px solid var(--dash-border)", borderRadius: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Research Workspace</h3>
                            {agentTaskDetail && (
                              <span className={`user-status-badge ${statusClass(agentTaskDetail.status)}`} style={{ fontSize: "10px" }}>
                                {agentTaskDetail.execution_status || agentTaskDetail.status.toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            {/* Original Request Info */}
                            {agentTaskDetail?.description && (
                              <div style={{ background: "var(--dash-bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--dash-border)" }}>
                                <span style={{ fontSize: "10px", color: "var(--dash-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Original Request</span>
                                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--dash-text)" }}>{agentTaskDetail.description}</p>
                              </div>
                            )}

                            {/* Action Confirmation Banner */}
                            {agentPendingAction && (
                              <div style={{
                                padding: "15px",
                                background: "rgba(245, 158, 11, 0.1)",
                                border: "1px solid #f59e0b",
                                borderRadius: "12px",
                                color: "#f59e0b",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px"
                              }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <span style={{ fontSize: "16px" }}>⚠️</span>
                                  <div>
                                    <strong style={{ fontSize: "12px", display: "block" }}>Action Confirmation Required</strong>
                                    <span style={{ fontSize: "11px", color: "var(--dash-secondary)" }}>
                                      Tool <code>{agentPendingAction.tool_name}</code> requires your approval before proceeding.
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                                  <button
                                    onClick={() => handleConfirmAction(agentPendingAction.id)}
                                    className="admin-btn"
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "11px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      background: "#f59e0b",
                                      borderColor: "#f59e0b",
                                      color: "#fff",
                                      height: "auto",
                                      minHeight: "auto",
                                      cursor: "pointer"
                                    }}
                                    disabled={confirmingActionId === agentPendingAction.id}
                                  >
                                    {confirmingActionId === agentPendingAction.id ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <Play size={12} />
                                    )}
                                    <span>Approve & Continue</span>
                                  </button>
                                  <button
                                    onClick={handleCancelAction}
                                    className="admin-btn"
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "11px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      background: "rgba(239, 68, 68, 0.1)",
                                      borderColor: "#ef4444",
                                      color: "#ef4444",
                                      height: "auto",
                                      minHeight: "auto",
                                      cursor: "pointer"
                                    }}
                                    disabled={confirmingActionId === agentPendingAction.id}
                                  >
                                    <X size={12} />
                                    <span>Reject & Cancel</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Execution Timeline */}
                            <div>
                              <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>Execution Timeline</h4>
                              {agentTaskLogs.length === 0 ? (
                                <p style={{ fontSize: "12px", color: "var(--dash-secondary)", fontStyle: "italic" }}>Awaiting execution to start...</p>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderLeft: "2px solid var(--dash-border)", paddingLeft: "15px", marginLeft: "8px" }}>
                                  {agentTaskLogs.map((log: any) => {
                                    let statusColor = "var(--dash-primary)";
                                    if (log.status === "failed") statusColor = "#ef4444";
                                    else if (log.status === "running") statusColor = "#3b82f6";
                                    else if (log.status === "completed") statusColor = "#10b981";

                                    return (
                                      <div key={log.id} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <div style={{
                                          position: "absolute",
                                          left: "-22px",
                                          top: "4px",
                                          width: "10px",
                                          height: "10px",
                                          borderRadius: "50%",
                                          background: statusColor,
                                          border: "2px solid var(--brand-card)"
                                        }} />
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <span style={{ fontSize: "12px", fontWeight: 600 }}>{log.message}</span>
                                          <span style={{ fontSize: "10px", color: "var(--dash-secondary)" }}>{formatTime(log.created_at)}</span>
                                        </div>
                                        {log.duration_ms > 0 && (
                                          <span style={{ fontSize: "10px", color: "var(--dash-secondary)" }}>Duration: {log.duration_ms}ms</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Final synthesized answer / outcome */}
                            {(() => {
                              const finalAnswerRaw = agentTaskResultDetail?.answer || agentTaskDetail?.final_result || "";
                              if (!finalAnswerRaw) return null;

                              let finalOffersList: any[] = [];
                              let finalComparisonData: any = null;
                              let finalAnswerClean = finalAnswerRaw;

                              if (finalAnswerRaw.includes("[PRODUCT_OFFERS:")) {
                                const startIdx = finalAnswerRaw.indexOf("[PRODUCT_OFFERS:");
                                const endIdx = finalAnswerRaw.lastIndexOf("]");
                                if (startIdx !== -1 && endIdx > startIdx) {
                                  const jsonStr = finalAnswerRaw.substring(startIdx + 16, endIdx);
                                  try {
                                    finalOffersList = JSON.parse(jsonStr);
                                    finalAnswerClean = finalAnswerRaw.substring(0, startIdx) + finalAnswerRaw.substring(endIdx + 1);
                                  } catch (e) {
                                    console.error("Failed to parse offers JSON", e);
                                  }
                                }
                              }

                              if (finalAnswerRaw.includes("[PRODUCT_COMPARISON:")) {
                                const startIdx = finalAnswerRaw.indexOf("[PRODUCT_COMPARISON:");
                                const endIdx = finalAnswerRaw.lastIndexOf("]");
                                if (startIdx !== -1 && endIdx > startIdx) {
                                  const jsonStr = finalAnswerRaw.substring(startIdx + 20, endIdx);
                                  try {
                                    finalComparisonData = JSON.parse(jsonStr);
                                    finalAnswerClean = finalAnswerRaw.substring(0, startIdx) + finalAnswerRaw.substring(endIdx + 1);
                                  } catch (e) {
                                    console.error("Failed to parse comparison JSON", e);
                                  }
                                }
                              }

                              return (
                                <div style={{ marginTop: "15px", borderTop: "1px solid var(--dash-border)", paddingTop: "15px" }}>
                                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "10px", color: "var(--dash-primary)" }}>
                                    <FileText size={16} />
                                    <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Research Summary Answer</h4>
                                  </div>

                                  <div 
                                    className="research-answer-box"
                                    style={{
                                      background: "var(--brand-card)",
                                      padding: "15px",
                                      borderRadius: "12px",
                                      border: "1px solid var(--dash-border)",
                                      fontSize: "13px",
                                      lineHeight: "1.6",
                                      whiteSpace: "pre-wrap"
                                    }}
                                  >
                                    {finalAnswerClean}

                                    {finalOffersList.length > 0 && (
                                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {finalOffersList.map((offer: any, idx: number) => (
                                          <div key={idx} style={{ background: "var(--brand-card)", padding: "12px", borderRadius: "10px", border: "1px solid var(--dash-border)", display: "flex", gap: "10px", alignItems: "center" }}>
                                            <div style={{ width: "36px", height: "36px", background: "var(--dash-bg)", borderRadius: "4px", display: "grid", placeItems: "center", fontSize: "16px", flexShrink: 0 }}>🛍️</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{offer.title}</h4>
                                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                                                <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--dash-primary)" }}>₹{Number(offer.price).toLocaleString()}</span>
                                                <span className="status-pill pending" style={{ fontSize: "8px", textTransform: "uppercase" }}>{offer.provider}</span>
                                              </div>
                                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", fontSize: "10px", color: "var(--dash-secondary)" }}>
                                                <span>{offer.availability === "in_stock" ? "🟢 In Stock" : "🔴 Out of Stock"}</span>
                                                <a href={offer.url} target="_blank" rel="noopener noreferrer" className="admin-link" style={{ fontWeight: 700 }}>View on {offer.provider}</a>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {finalComparisonData && (
                                       <div style={{ marginTop: "12px", background: "var(--dash-bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--dash-border)", fontSize: "12px" }}>
                                         <h4 style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 800 }}>Verified Product Comparison</h4>
                                         <div style={{ fontSize: "11px", color: "var(--dash-secondary)", marginBottom: "10px" }}>
                                           Product Group: {finalComparisonData.product_group}
                                         </div>

                                         {/* Demo Mode Banner */}
                                         {finalComparisonData.source_type === "DEMO" && (
                                           <div style={{ padding: "8px 12px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", borderRadius: "8px", color: "#f59e0b", display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                                             <span style={{ fontSize: "14px" }}>⚠️</span>
                                             <span style={{ fontSize: "11px", fontWeight: 700 }}>Demo Mode active: Showing simulated fallback products.</span>
                                           </div>
                                         )}

                                         {/* Extracted Criteria Pillbox */}
                                         <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                                           <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                             Category: {finalComparisonData.criteria?.category || "Any"}
                                           </span>
                                           {finalComparisonData.criteria?.brand && (
                                             <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                               Brand: {finalComparisonData.criteria.brand}
                                             </span>
                                           )}
                                           {finalComparisonData.criteria?.ram_gb && (
                                             <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                               RAM: ≥ {finalComparisonData.criteria.ram_gb}GB
                                             </span>
                                           )}
                                           {finalComparisonData.criteria?.storage_gb && (
                                             <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                               Storage: ≥ {finalComparisonData.criteria.storage_gb}GB {finalComparisonData.criteria.storage_type || ""}
                                             </span>
                                           )}
                                           {finalComparisonData.criteria?.processor && (
                                             <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                               CPU: {finalComparisonData.criteria.processor}
                                             </span>
                                           )}
                                           {finalComparisonData.criteria?.gpu && (
                                             <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                               GPU: {finalComparisonData.criteria.gpu}
                                             </span>
                                           )}
                                           {finalComparisonData.criteria?.budget_max && (
                                             <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                               Budget: ≤ ₹{finalComparisonData.criteria.budget_max.toLocaleString()}
                                             </span>
                                           )}
                                         </div>

                                         {(!finalComparisonData.offers || finalComparisonData.offers.length === 0) ? (
                                           <div style={{ padding: "15px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444" }}>
                                             <strong style={{ fontSize: "13px", display: "block", marginBottom: "6px" }}>No verified products found</strong>
                                             <p style={{ margin: 0, fontSize: "11px", color: "var(--dash-secondary)" }}>
                                               We analyzed candidate listings, but none successfully satisfied all of your requested filter specifications.
                                             </p>
                                             <ul style={{ margin: "8px 0 0", paddingLeft: "15px", fontSize: "11px", color: "var(--dash-secondary)" }}>
                                               <li>Try relaxing the max budget constraints.</li>
                                               <li>Try removing explicit RAM/Storage constraints.</li>
                                             </ul>
                                           </div>
                                         ) : (
                                           <>
                                             <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
                                               <thead>
                                                 <tr style={{ borderBottom: "1px solid var(--dash-border)" }}>
                                                   <th style={{ textAlign: "left", padding: "4px 0", color: "var(--dash-secondary)" }}>Store</th>
                                                   <th style={{ textAlign: "right", padding: "4px 0", color: "var(--dash-secondary)" }}>Price</th>
                                                   <th style={{ textAlign: "right", padding: "4px 0", color: "var(--dash-secondary)" }}>Availability</th>
                                                   <th style={{ textAlign: "right", padding: "4px 0", color: "var(--dash-secondary)" }}>Link</th>
                                                 </tr>
                                               </thead>
                                               <tbody>
                                                 {finalComparisonData.offers.map((off: any, idx: number) => (
                                                   <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                                     <td style={{ padding: "6px 0" }}>
                                                       <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{off.provider}</div>
                                                       {off.title && (
                                                         <div style={{ fontSize: "10px", color: "var(--dash-secondary)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={off.title}>
                                                           {off.title}
                                                         </div>
                                                       )}
                                                     </td>
                                                     <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 800, color: "var(--dash-primary)" }}>₹{Number(off.price).toLocaleString()}</td>
                                                     <td style={{ padding: "6px 0", textAlign: "right", color: (off.availability || "available").toLowerCase() === "out_of_stock" ? "#ef4444" : "#10b981" }}>
                                                       {off.availability || "Available"}
                                                     </td>
                                                     <td style={{ padding: "6px 0", textAlign: "right" }}>
                                                       <a href={off.url} target="_blank" rel="noopener noreferrer" className="admin-link">View</a>
                                                     </td>
                                                   </tr>
                                                 ))}
                                               </tbody>
                                             </table>

                                             {finalComparisonData.price_difference > 0 && (
                                               <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: 700 }}>
                                                 <span>Price Difference:</span>
                                                 <span style={{ color: "var(--dash-primary)" }}>₹{Number(finalComparisonData.price_difference).toLocaleString()}</span>
                                               </div>
                                             )}

                                             {finalComparisonData.best_value && (
                                               <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", marginTop: "10px", border: "1px solid var(--dash-border)" }}>
                                                 <strong style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--dash-primary)" }}>⭐ BEST VALUE RECOMMENDATION</strong>
                                                 <span style={{ fontSize: "12px", fontWeight: 700 }}>
                                                   {finalComparisonData.best_value.store} — ₹{Number(finalComparisonData.best_value.price).toLocaleString()}
                                                 </span>
                                                 {finalComparisonData.best_value.reason && (
                                                   <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--dash-secondary)", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                                                     {finalComparisonData.best_value.reason}
                                                   </p>
                                                 )}
                                               </div>
                                             )}
                                           </>
                                         )}

                                         {/* Excluded Candidates Summary */}
                                         {finalComparisonData.excluded_results && finalComparisonData.excluded_results.length > 0 && (
                                           <details style={{ marginTop: "15px", borderTop: "1px solid var(--dash-border)", paddingTop: "10px" }}>
                                             <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--dash-secondary)", fontSize: "11px", outline: "none" }}>
                                               🔍 {finalComparisonData.excluded_results.length} listings excluded during validation (Click to view)
                                             </summary>
                                             <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                               {finalComparisonData.excluded_results.map((ex: any, idx: number) => (
                                                 <div key={idx} style={{ background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "6px", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "start", border: "1px solid rgba(255,255,255,0.03)" }}>
                                                   <div style={{ flex: 1, minWidth: 0 }}>
                                                     <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.title}</div>
                                                     <div style={{ color: "#ef4444", fontSize: "10px", marginTop: "2px" }}>Reject Reason: {ex.reason}</div>
                                                   </div>
                                                   <span style={{ fontSize: "10px", opacity: 0.6, flexShrink: 0, marginLeft: "10px" }}>{ex.store}</span>
                                                 </div>
                                               ))}
                                             </div>
                                           </details>
                                         )}

                                         {finalComparisonData.sources && finalComparisonData.sources.length > 0 && (
                                           <div style={{ marginTop: "12px", fontSize: "11px" }}>
                                             <strong style={{ display: "block", fontSize: "10px", color: "var(--dash-secondary)", marginBottom: "4px" }}>Checked Sources</strong>
                                             <ul style={{ margin: 0, paddingLeft: "15px", color: "var(--dash-secondary)" }}>
                                               {finalComparisonData.sources.map((src: string, idx: number) => (
                                                 <li key={idx}>{src}</li>
                                               ))}
                                             </ul>
                                           </div>
                                         )}
                                       </div>
                                     )}

                                  </div>
                                </div>
                              );
                            })()}

                            {/* Clickable Grounding Sources */}
                            {agentTaskResultDetail?.sources && agentTaskResultDetail.sources.length > 0 && (
                              <div style={{ marginTop: "15px" }}>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "10px" }}>
                                  <Globe size={16} />
                                  <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Sources & Grounding References ({agentTaskResultDetail.sources.length})</h4>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {agentTaskResultDetail.sources.map((src: any, idx: number) => (
                                    <a
                                      key={idx}
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "block",
                                        background: "var(--dash-bg)",
                                        padding: "10px 12px",
                                        borderRadius: "10px",
                                        border: "1px solid var(--dash-border)",
                                        textDecoration: "none",
                                        color: "inherit",
                                        transition: "transform 0.2s, border-color 0.2s"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "var(--dash-primary)";
                                        e.currentTarget.style.transform = "translateY(-1px)";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "var(--dash-border)";
                                        e.currentTarget.style.transform = "translateY(0)";
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                        <strong style={{ fontSize: "12px", color: "var(--dash-primary)" }}>{src.title}</strong>
                                        <ExternalLink size={12} style={{ color: "var(--dash-secondary)" }} />
                                      </div>
                                      <span style={{ fontSize: "10px", color: "var(--dash-secondary)", display: "block", wordBreak: "break-all" }}>{src.domain}</span>
                                      {src.snippet && (
                                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--dash-secondary)" }}>{src.snippet}</p>
                                      )}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Execution metrics details */}
                            {agentTaskResultDetail && (
                              <div 
                                style={{
                                  marginTop: "15px",
                                  borderTop: "1px solid var(--dash-border)",
                                  paddingTop: "12px",
                                  display: "flex",
                                  gap: "20px",
                                  flexWrap: "wrap",
                                  fontSize: "11px",
                                  color: "var(--dash-secondary)"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Clock3 size={12} />
                                  <span>Duration: {agentTaskLogs.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0)} ms</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Globe size={12} />
                                  <span>Sources: {agentTaskResultDetail.sources.length}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <ShieldCheck size={12} />
                                  <span>Status: COMPLETED</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="admin-card user-panel" style={{ padding: "30px", border: "1px solid var(--dash-border)", borderRadius: "14px", display: "grid", placeItems: "center", height: "100%" }}>
                          <div style={{ textAlign: "center", color: "var(--dash-secondary)" }}>
                            <Globe size={32} style={{ margin: "0 auto 10px" }} />
                            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>No Task Selected</h3>
                            <p style={{ fontSize: "12px", margin: "4px 0 0" }}>Generate a plan or select a past task to start research.</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {creatingVerification && (
        <div className="verification-overlay" onMouseDown={(event) => event.target === event.currentTarget && setCreatingVerification(false)}>
          <div className="verification-create-panel">
            <div className="verification-create-header">
              <div><span className="assistant-kicker">VERINOVA ASSISTANT</span><h3>Start a verification</h3><p>Tell us what you want checked. You can continue the conversation after the request is created.</p></div>
              <button className="admin-icon-button" onClick={() => setCreatingVerification(false)}><X size={16} /></button>
            </div>
            <div className="verification-create-body">
              <label className="admin-form-group"><span className="admin-form-label">Verification title</span><input className="admin-form-input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Example: Verify this business claim" /></label>
              <label className="admin-form-group"><span className="admin-form-label">What should Verinova verify?</span><textarea className="admin-form-textarea verification-description" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Explain the claim, information, document or situation you want checked." /></label>
              <label className="admin-form-group"><span className="admin-form-label">Verification type</span><select className="admin-form-select" value={newTaskType} onChange={(event) => setNewTaskType(event.target.value)}><option value="verification">General verification</option><option value="identity">Identity</option><option value="document">Document</option><option value="business">Business</option><option value="claim">Claim / information</option></select></label>
            </div>
            <div className="verification-create-footer"><button className="admin-btn admin-btn-secondary" onClick={() => setCreatingVerification(false)}>Cancel</button><button className="admin-btn admin-btn-primary" disabled={creatingVerification === true && newTitle.trim().length < 3} onClick={startNewVerification}><ShieldCheck size={14} /> Create & start</button></div>
          </div>
        </div>
      )}

      {assistantOpen && (
        <div className="assistant-overlay" onMouseDown={(event) => event.target === event.currentTarget && setAssistantOpen(false)}>
          <aside className="verification-assistant-panel">
            <header className="assistant-header">
              <div className="assistant-brand">
                <div className="assistant-brand-icon"><ShieldCheck size={19} /></div>
                <div><strong>Verinova Assistant</strong><span><i /> Secure verification workspace</span></div>
              </div>
              <button className="admin-icon-button" onClick={() => setAssistantOpen(false)}><X size={16} /></button>
            </header>

            {activeTask && (
              <>
                <div className="assistant-task-summary">
                  <div><span>VERIFICATION #{activeTask.id}</span><h3>{activeTask.title}</h3></div>
                  {renderStatusCard(activeTask)}
                </div>

                <div className="assistant-progress">
                  {[
                    ["received", "Received"],
                    ["planning", "Planning"],
                    ["running", "Running"],
                    ["verifying", "Verifying"],
                    ["completed", "Completed"],
                  ].map(([key, label], index) => {
                    const completedIndex = ["completed", "verified", "approved", "rejected", "inconclusive", "failed", "partially_completed"].includes(activeTask.status)
                      ? 4
                      : activeTask.status === "verifying"
                        ? 3
                        : ["running", "executing"].includes(activeTask.status)
                          ? 2
                          : ["planning", "parsing"].includes(activeTask.status)
                            ? 1
                            : 0;
                    return <div className={index <= completedIndex ? "progress-step complete" : "progress-step"} key={key}><span>{index < completedIndex ? "✓" : index === completedIndex ? "●" : index + 1}</span><small>{label}</small></div>;
                  })}
                </div>

                {activeTask.plan && (
                  <div style={{ padding: "10px 15px", background: "rgba(255,107,0,0.03)", borderBottom: "1px solid var(--dash-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowPlanDetails(!showPlanDetails)}>
                      <strong style={{ fontSize: "11px", color: "var(--dash-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                        📋 AI Agent Plan ({activeTask.plan.steps?.length || 0} steps)
                      </strong>
                      <span style={{ fontSize: "10px", color: "var(--dash-secondary)" }}>{showPlanDetails ? "Hide Plan ▲" : "Show Plan ▼"}</span>
                    </div>
                    {showPlanDetails && (
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "10px", color: "var(--dash-text)" }}><strong>Objective:</strong> {activeTask.plan.objective}</p>
                        {activeTask.plan.steps?.map((step: any) => (
                          <div key={step.step_number} style={{ display: "flex", gap: "8px", background: "var(--brand-card)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--dash-border)", fontSize: "10px" }}>
                            <span style={{
                              display: "grid",
                              placeItems: "center",
                              width: "16px",
                              height: "16px",
                              background: "var(--dash-primary)",
                              color: "white",
                              borderRadius: "50%",
                              fontSize: "9px",
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {step.step_number}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: "block" }}>{step.description}</strong>
                              <span style={{ color: "var(--dash-secondary)", fontSize: "9px" }}>Tool: <code>{step.tool}</code></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: "12px 15px", background: "var(--brand-card)", borderBottom: "1px solid var(--dash-border)", fontSize: "11px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <span style={{ color: "var(--dash-secondary)", display: "block", fontSize: "9px", textTransform: "uppercase" }}>Verification Status</span>
                    <strong style={{ color: activeTask.verification_status === 'VERIFIED' ? '#10b981' : activeTask.verification_status === 'CONFLICTED' ? '#ef4444' : 'var(--dash-text)' }}>
                      {activeTask.verification_status || 'NOT_STARTED'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--dash-secondary)", display: "block", fontSize: "9px", textTransform: "uppercase" }}>Confidence Score</span>
                    <strong>{activeTask.confidence_score != null ? `${Number(activeTask.confidence_score).toFixed(1)}%` : '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--dash-secondary)", display: "block", fontSize: "9px", textTransform: "uppercase" }}>Evidence Sources</span>
                    <strong>{activeTask.reference_count || 0} sources checked</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--dash-secondary)", display: "block", fontSize: "9px", textTransform: "uppercase" }}>Admin Review</span>
                    <strong>{activeTask.review_status === 'NOT_REQUIRED' ? 'Not Required' : activeTask.review_status === 'REQUIRED' ? 'Required' : activeTask.review_status || 'Not Required'}</strong>
                  </div>
                </div>

                {taskExecutions.length > 0 && (
                  <div style={{ padding: "10px 15px", borderBottom: "1px solid var(--dash-border)", background: "var(--brand-card)" }}>
                    <strong style={{ fontSize: "11px", color: "var(--dash-primary)", display: "block", marginBottom: "8px" }}>
                      ⚙️ Tool Execution Activity
                    </strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {taskExecutions.map((log) => (
                        <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--dash-border)", fontSize: "10px" }}>
                          <div style={{ minWidth: 0, paddingRight: "8px" }}>
                            <span style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--dash-text)", display: "block" }}>
                              {log.step.replace(/_/g, " ")} ({log.duration_ms}ms)
                            </span>
                            <span style={{ color: "var(--dash-secondary)", display: "block", fontSize: "9px", marginTop: "2px" }}>
                              {log.message}
                            </span>
                          </div>
                          <span className={`status-pill ${log.status === "completed" ? "verified" : log.status === "failed" ? "failed" : "pending"}`} style={{ fontSize: "8px", textTransform: "uppercase", padding: "2px 4px" }}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {taskEvidence.length > 0 && (
                  <div style={{ padding: "10px 15px", borderBottom: "1px solid var(--dash-border)", background: "var(--brand-card)" }}>
                    <strong style={{ fontSize: "11px", color: "var(--dash-primary)", display: "block", marginBottom: "8px" }}>
                      🔍 Captured Evidence ({taskEvidence.length})
                    </strong>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {taskEvidence.map((ev) => (
                        <div key={ev.id} style={{ background: "rgba(255,255,255,0.02)", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--dash-border)", fontSize: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontWeight: 700, color: "var(--dash-text)" }}>
                              Source: {ev.source_name}
                            </span>
                            <span style={{ fontSize: "8px", color: "var(--dash-secondary)" }}>
                              {new Date(ev.collected_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p style={{ margin: 0, color: "var(--dash-secondary)", fontSize: "9px" }}>
                            {ev.description}
                          </p>
                          {formatEvidenceData(ev)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {["planning", "running", "verifying"].includes(activeTask.status) && (
                  <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", margin: "10px 15px", border: "1px dashed var(--dash-border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--dash-secondary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <div className="user-spinner" style={{ width: "10px", height: "10px" }} />
                      Verinova is processing request...
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <li style={{ color: activeTask.status === "planning" ? "var(--dash-primary)" : "var(--dash-secondary)" }}>
                        {activeTask.status === "planning" ? "●" : "✓"} 1. Understanding & planning request
                      </li>
                      <li style={{ color: activeTask.status === "running" ? "var(--dash-primary)" : "var(--dash-secondary)" }}>
                        {activeTask.status === "running" ? "●" : ["verifying", "completed"].includes(activeTask.status) ? "✓" : "○"} 2. Executing plan steps & gathering evidence
                      </li>
                      <li style={{ color: activeTask.status === "verifying" ? "var(--dash-primary)" : "var(--dash-secondary)" }}>
                        {activeTask.status === "verifying" ? "●" : ["completed"].includes(activeTask.status) ? "✓" : "○"} 3. Verification engine validation & confidence assessment
                      </li>
                    </ul>
                  </div>
                )}

                <div className="assistant-messages">
                  {activeTask.messages?.length ? activeTask.messages.map((message) => {
                    const match = message.message.match(/\[REQUIRES_CONFIRMATION:(\d+)\]/);
                    const actionId = match ? parseInt(match[1]) : null;
                    const cleanMessage = match ? message.message.replace(/\[REQUIRES_CONFIRMATION:\d+\]/, "") : message.message;

                    let offersList: any[] = [];
                    let comparisonData: any = null;
                    let textMessage = cleanMessage;

                    if (cleanMessage.includes("[PRODUCT_OFFERS:")) {
                      const startIdx = cleanMessage.indexOf("[PRODUCT_OFFERS:");
                      const endIdx = cleanMessage.lastIndexOf("]");
                      if (startIdx !== -1 && endIdx > startIdx) {
                        const jsonStr = cleanMessage.substring(startIdx + 16, endIdx);
                        try {
                          offersList = JSON.parse(jsonStr);
                          textMessage = cleanMessage.substring(0, startIdx) + cleanMessage.substring(endIdx + 1);
                        } catch (e) {
                          console.error("Failed to parse offers JSON", e);
                        }
                      }
                    }

                    if (cleanMessage.includes("[PRODUCT_COMPARISON:")) {
                      const startIdx = cleanMessage.indexOf("[PRODUCT_COMPARISON:");
                      const endIdx = cleanMessage.lastIndexOf("]");
                      if (startIdx !== -1 && endIdx > startIdx) {
                        const jsonStr = cleanMessage.substring(startIdx + 20, endIdx);
                        try {
                          comparisonData = JSON.parse(jsonStr);
                          textMessage = cleanMessage.substring(0, startIdx) + cleanMessage.substring(endIdx + 1);
                        } catch (e) {
                          console.error("Failed to parse comparison JSON", e);
                        }
                      }
                    }

                    return (
                      <div className={`assistant-message ${message.sender}`} key={message.id}>
                        <div className="assistant-message-label">{message.sender === "user" ? "You" : message.sender === "system" ? "System" : "Verinova"}</div>
                        <div className="assistant-bubble">
                          <div style={{ whiteSpace: "pre-wrap" }}>{textMessage}</div>

                          {offersList.length > 0 && (
                            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                              {offersList.map((offer: any, idx: number) => (
                                <div key={idx} style={{ background: "var(--brand-card)", padding: "12px", borderRadius: "10px", border: "1px solid var(--dash-border)", display: "flex", gap: "10px", alignItems: "center" }}>
                                  <div style={{ width: "36px", height: "36px", background: "var(--dash-bg)", borderRadius: "4px", display: "grid", placeItems: "center", fontSize: "16px", flexShrink: 0 }}>🛍️</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{offer.title}</h4>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                                      <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--dash-primary)" }}>₹{Number(offer.price).toLocaleString()}</span>
                                      <span className="status-pill pending" style={{ fontSize: "8px", textTransform: "uppercase" }}>{offer.provider}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", fontSize: "10px", color: "var(--dash-secondary)" }}>
                                      <span>{offer.availability === "in_stock" ? "🟢 In Stock" : "🔴 Out of Stock"}</span>
                                      <a href={offer.url} target="_blank" rel="noopener noreferrer" className="admin-link" style={{ fontWeight: 700 }}>View on {offer.provider}</a>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                           {comparisonData && (
                             <div style={{ marginTop: "12px", background: "var(--dash-bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--dash-border)", fontSize: "12px" }}>
                               <h4 style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 800 }}>Verified Product Comparison</h4>
                               <div style={{ fontSize: "11px", color: "var(--dash-secondary)", marginBottom: "10px" }}>
                                 Product Group: {comparisonData.product_group}
                               </div>

                               {/* Demo Mode Banner */}
                               {comparisonData.source_type === "DEMO" && (
                                 <div style={{ padding: "8px 12px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", borderRadius: "8px", color: "#f59e0b", display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                                   <span style={{ fontSize: "14px" }}>⚠️</span>
                                   <span style={{ fontSize: "11px", fontWeight: 700 }}>Demo Mode active: Showing simulated fallback products.</span>
                                 </div>
                               )}

                               {/* Extracted Criteria Pillbox */}
                               <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                                 <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                   Category: {comparisonData.criteria?.category || "Any"}
                                 </span>
                                 {comparisonData.criteria?.brand && (
                                   <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                     Brand: {comparisonData.criteria.brand}
                                   </span>
                                 )}
                                 {comparisonData.criteria?.ram_gb && (
                                   <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                     RAM: ≥ {comparisonData.criteria.ram_gb}GB
                                   </span>
                                 )}
                                 {comparisonData.criteria?.storage_gb && (
                                   <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                     Storage: ≥ {comparisonData.criteria.storage_gb}GB {comparisonData.criteria.storage_type || ""}
                                   </span>
                                 )}
                                 {comparisonData.criteria?.processor && (
                                   <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                     CPU: {comparisonData.criteria.processor}
                                   </span>
                                 )}
                                 {comparisonData.criteria?.gpu && (
                                   <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                     GPU: {comparisonData.criteria.gpu}
                                   </span>
                                 )}
                                 {comparisonData.criteria?.budget_max && (
                                   <span className="status-pill" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dash-primary)", fontSize: "10px", padding: "4px 8px" }}>
                                     Budget: ≤ ₹{comparisonData.criteria.budget_max.toLocaleString()}
                                   </span>
                                 )}
                               </div>

                               {(!comparisonData.offers || comparisonData.offers.length === 0) ? (
                                 <div style={{ padding: "15px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444" }}>
                                   <strong style={{ fontSize: "13px", display: "block", marginBottom: "6px" }}>No verified products found</strong>
                                   <p style={{ margin: 0, fontSize: "11px", color: "var(--dash-secondary)" }}>
                                     We analyzed candidate listings, but none successfully satisfied all of your requested filter specifications.
                                   </p>
                                   <ul style={{ margin: "8px 0 0", paddingLeft: "15px", fontSize: "11px", color: "var(--dash-secondary)" }}>
                                     <li>Try relaxing the max budget constraints.</li>
                                     <li>Try removing explicit RAM/Storage constraints.</li>
                                   </ul>
                                 </div>
                               ) : (
                                 <>
                                   <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
                                     <thead>
                                       <tr style={{ borderBottom: "1px solid var(--dash-border)" }}>
                                         <th style={{ textAlign: "left", padding: "4px 0", color: "var(--dash-secondary)" }}>Store</th>
                                         <th style={{ textAlign: "right", padding: "4px 0", color: "var(--dash-secondary)" }}>Price</th>
                                         <th style={{ textAlign: "right", padding: "4px 0", color: "var(--dash-secondary)" }}>Availability</th>
                                         <th style={{ textAlign: "right", padding: "4px 0", color: "var(--dash-secondary)" }}>Link</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {comparisonData.offers.map((off: any, idx: number) => (
                                         <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                           <td style={{ padding: "6px 0" }}>
                                             <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{off.provider}</div>
                                             {off.title && (
                                               <div style={{ fontSize: "10px", color: "var(--dash-secondary)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={off.title}>
                                                 {off.title}
                                               </div>
                                             )}
                                           </td>
                                           <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 800, color: "var(--dash-primary)" }}>₹{Number(off.price).toLocaleString()}</td>
                                           <td style={{ padding: "6px 0", textAlign: "right", color: (off.availability || "available").toLowerCase() === "out_of_stock" ? "#ef4444" : "#10b981" }}>
                                             {off.availability || "Available"}
                                           </td>
                                           <td style={{ padding: "6px 0", textAlign: "right" }}>
                                             <a href={off.url} target="_blank" rel="noopener noreferrer" className="admin-link">View</a>
                                           </td>
                                         </tr>
                                       ))}
                                     </tbody>
                                   </table>

                                   {comparisonData.price_difference > 0 && (
                                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: 700 }}>
                                       <span>Price Difference:</span>
                                       <span style={{ color: "var(--dash-primary)" }}>₹{Number(comparisonData.price_difference).toLocaleString()}</span>
                                     </div>
                                   )}

                                   {comparisonData.best_value && (
                                     <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", marginTop: "10px", border: "1px solid var(--dash-border)" }}>
                                       <strong style={{ fontSize: "10px", display: "block", marginBottom: "4px", color: "var(--dash-primary)" }}>⭐ BEST VALUE RECOMMENDATION</strong>
                                       <span style={{ fontSize: "12px", fontWeight: 700 }}>
                                         {comparisonData.best_value.store} — ₹{Number(comparisonData.best_value.price).toLocaleString()}
                                       </span>
                                       {comparisonData.best_value.reason && (
                                         <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--dash-secondary)", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                                           {comparisonData.best_value.reason}
                                         </p>
                                       )}
                                     </div>
                                   )}
                                 </>
                               )}

                               {/* Excluded Candidates Summary */}
                               {comparisonData.excluded_results && comparisonData.excluded_results.length > 0 && (
                                 <details style={{ marginTop: "15px", borderTop: "1px solid var(--dash-border)", paddingTop: "10px" }}>
                                   <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--dash-secondary)", fontSize: "11px", outline: "none" }}>
                                     🔍 {comparisonData.excluded_results.length} listings excluded during validation (Click to view)
                                   </summary>
                                   <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                     {comparisonData.excluded_results.map((ex: any, idx: number) => (
                                       <div key={idx} style={{ background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "6px", fontSize: "11px", display: "flex", justifyContent: "space-between", alignItems: "start", border: "1px solid rgba(255,255,255,0.03)" }}>
                                         <div style={{ flex: 1, minWidth: 0 }}>
                                           <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.title}</div>
                                           <div style={{ color: "#ef4444", fontSize: "10px", marginTop: "2px" }}>Reject Reason: {ex.reason}</div>
                                         </div>
                                         <span style={{ fontSize: "10px", opacity: 0.6, flexShrink: 0, marginLeft: "10px" }}>{ex.store}</span>
                                       </div>
                                     ))}
                                   </div>
                                 </details>
                               )}

                               {comparisonData.sources && comparisonData.sources.length > 0 && (
                                 <div style={{ marginTop: "12px", fontSize: "11px" }}>
                                   <strong style={{ display: "block", fontSize: "10px", color: "var(--dash-secondary)", marginBottom: "4px" }}>Checked Sources</strong>
                                   <ul style={{ margin: 0, paddingLeft: "15px", color: "var(--dash-secondary)" }}>
                                     {comparisonData.sources.map((src: string, idx: number) => (
                                       <li key={idx}>{src}</li>
                                     ))}
                                   </ul>
                                 </div>
                               )}
                             </div>
                           )}

                          {actionId && (
                            <div style={{ marginTop: "12px", display: "flex", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "8px" }}>
                              <button
                                type="button"
                                onClick={() => handleConfirmAction(actionId)}
                                className="admin-btn admin-btn-primary"
                                style={{ padding: "6px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", height: "auto", minHeight: "auto" }}
                                disabled={confirmingActionId === actionId}
                              >
                                {confirmingActionId === actionId ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                <span>Confirm</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelAction()}
                                className="admin-btn admin-btn-secondary"
                                style={{ padding: "6px 12px", fontSize: "11px", height: "auto", minHeight: "auto" }}
                                disabled={confirmingActionId === actionId}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        <time>{formatTime(message.created_at)}</time>
                      </div>
                    );
                  }) : (
                    <div className="assistant-welcome"><div className="assistant-welcome-icon"><ShieldCheck size={24} /></div><h3>Let's verify this carefully.</h3><p>Verinova will keep the request, processing state and final assessment connected to your account.</p></div>
                  )}

                  {(activeTask.status === "completed" || activeTask.status === "verified" || activeTask.status === "approved") && (
                    <div className="assistant-result-card"><div className="result-icon"><CheckCircle2 size={19} /></div><div><span>VERIFICATION COMPLETE</span><strong>{activeTask.confidence_score != null ? `${Number(activeTask.confidence_score).toFixed(1)}% confidence` : "Assessment available"}</strong><p>{activeTask.final_result || "The verification process has completed. Review the final assessment recorded for this request."}</p></div></div>
                  )}

                  {(activeTask.status === "needs_review" || activeTask.status === "awaiting_admin_review") && (
                    <div className="assistant-result-card warning" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                      <div className="result-icon" style={{ color: "#f59e0b" }}><CircleAlert size={19} /></div>
                      <div>
                        <span style={{ color: "#f59e0b" }}>REVIEW REQUIRED</span>
                        <strong>Verinova found information that requires human review.</strong>
                        <p>{activeTask.final_result || "We encountered conflicting evidence or low confidence. An administrator has been notified to perform a manual review."}</p>
                      </div>
                    </div>
                  )}

                  {activeTask.status === "inconclusive" && (
                    <div className="assistant-result-card warning" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                      <div className="result-icon" style={{ color: "#f59e0b" }}><CircleAlert size={19} /></div>
                      <div>
                        <span style={{ color: "#f59e0b" }}>VERIFICATION INCONCLUSIVE</span>
                        <strong>Evidence is insufficient or conflicting</strong>
                        <p>{activeTask.final_result || "The verification could not verify this request with high confidence due to conflicting sources or lack of evidence."}</p>
                      </div>
                    </div>
                  )}

                  {activeTask.status === "failed" && (
                    <div className="assistant-result-card failed"><div className="result-icon"><CircleAlert size={19} /></div><div><span>VERIFICATION NEEDS ATTENTION</span><strong>Processing could not be completed</strong><p>{activeTask.final_result || "Verinova could not complete this verification. You can continue the conversation or contact support."}</p></div></div>
                  )}
                </div>

                <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); void sendVerificationMessage(); }}>
                  <input value={messageInput} onChange={(event) => setMessageInput(event.target.value)} placeholder="Ask Verinova about this verification..." />
                  <button type="submit" disabled={!messageInput.trim()} aria-label="Send message"><Send size={16} /></button>
                </form>
                <div className="assistant-disclaimer">Verification status is based on the data and processing recorded by Verinova. Results should be reviewed before making consequential decisions.</div>
              </>
            )}
          </aside>
        </div>
      )}

      {assistantLoading && <div className="assistant-loading"><div className="user-spinner" /></div>}
    </div>
  );
}
