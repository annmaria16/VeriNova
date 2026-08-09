import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  PlayCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  FileCode,
  Clock,
  Video,
  Loader2,
  ArrowUpRight,
  Download,
  Eye,
  CheckSquare,
  X,
  FileSpreadsheet,
  Check,
  Copy,
  CheckCircle2,
  Info,
  Calendar,
  Activity,
  Award,
  Sparkles,
  ChevronRight,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { useTheme } from "../hooks/useTheme";

import Sidebar from "../components/dashboard/Sidebar";
import Navbar from "../components/dashboard/Navbar";
import DashboardCard from "../components/dashboard/DashboardCard";
import TaskTable from "../components/dashboard/TaskTable";
import ChartCard from "../components/dashboard/ChartCard";
import { VerificationActivityChart, TaskStatusDonut } from "../components/dashboard/DashboardCharts";

interface Task {
  id: string;
  name: string;
  description: string;
  expectedOutcome: string;
  evidenceType: string;
  method: string;
  status: "Verified" | "Running" | "Failed" | "Pending" | "Needs Clarification";
  confidence: number | null;
  date: string;
}

interface Evidence {
  id: string;
  name: string;
  type: "image" | "video" | "logs" | "api_response" | "sensor_data";
  timestamp: string;
  status: "Verified" | "Failed" | "Unverified";
  size: string;
  url?: string;
  details?: string;
}

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  timestamp: string;
  read: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();

  // Unified global dropdown state
  const [openDropdown, setOpenDropdown] = useState<"notifications" | "profile" | "sidebar-user" | "search" | null>(null);

  // Active module: dashboard, new-verification, my-tasks, verification-history, ai-evidence, reports, analytics, notifications, profile, settings
  const [activeModule, setActiveModule] = useState<string>("dashboard");

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");
  const showSearchDropdown = openDropdown === "search";

  // Evidence Viewer Modal State
  const [activeEvidenceModal, setActiveEvidenceModal] = useState<Evidence | null>(null);

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Clock Time State
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // AI Insight Banner visible state
  const [insightVisible, setInsightVisible] = useState<boolean>(true);

  // Verification Run state
  const [verifyingTask, setVerifyingTask] = useState<Partial<Task> | null>(null);
  const [verificationStep, setVerificationStep] = useState<number>(0);
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);
  const [activeRunningTaskId, setActiveRunningTaskId] = useState<string | null>(null);
  const [verificationResultDetails, setVerificationResultDetails] = useState<any | null>(null);
  const [clarificationFieldName, setClarificationFieldName] = useState<string | null>(null);
  const [clarificationValue, setClarificationValue] = useState<string>("");
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<any>(null);

  // System Status checkers
  const [apiStatus, setApiStatus] = useState<"Online" | "Offline" | "Checking">("Checking");
  const [dbStatus, setDbStatus] = useState<"Connected" | "Disconnected" | "Checking">("Checking");
  const [aiStatus, setAiStatus] = useState<"Ready" | "Offline" | "Checking">("Checking");

  // Database-driven states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    totalTasks: { value: 0, change: "No previous data", trend: "neutral" as "up" | "down" | "neutral" },
    verifiedTasks: { value: 0, change: "No previous data", trend: "neutral" as "up" | "down" | "neutral" },
    pendingTasks: { value: 0, change: "No previous data", trend: "neutral" as "up" | "down" | "neutral" },
    failedTasks: { value: 0, change: "No previous data", trend: "neutral" as "up" | "down" | "neutral" },
    avgConfidence: { value: 0.0, change: "No previous data", trend: "neutral" as "up" | "down" | "neutral" },
  });

  const [taskStatus, setTaskStatus] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    running: 0,
    failed: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Settings State
  const [settings, setSettings] = useState({
    theme: "emerald-dark",
    language: "English",
    apiKey: "vn_live_9fa87db39cd58a8109bfef42",
    emailNotif: true,
    slackNotif: false,
    inAppNotif: true,
    webhookNotif: true,
  });

  // Protect route
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Live Clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all data dynamically from backend endpoints
  const fetchDashboardData = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [statsRes, tasksRes, reportsRes, notificationsRes, statusRes] = await Promise.all([
        api.get("/dashboard/statistics"),
        api.get("/tasks/recent"),
        api.get("/reports/recent"),
        api.get("/notifications"),
        api.get("/dashboard/task-status"),
      ]);

      const mappedStats = {
        totalTasks: { ...statsRes.data.totalTasks, trend: statsRes.data.totalTasks.trend || "neutral" },
        verifiedTasks: { ...statsRes.data.verifiedTasks, trend: statsRes.data.verifiedTasks.trend || "neutral" },
        pendingTasks: { ...statsRes.data.pendingTasks, trend: statsRes.data.pendingTasks.trend || "neutral" },
        failedTasks: { ...statsRes.data.failedTasks, trend: statsRes.data.failedTasks.trend || "neutral" },
        avgConfidence: { ...statsRes.data.avgConfidence, trend: statsRes.data.avgConfidence.trend || "neutral" },
      };
      setStatistics(mappedStats);
      setTaskStatus(statusRes.data);

      const mappedTasks = tasksRes.data.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
        expectedOutcome: t.expected_outcome || "",
        evidenceType: t.evidence_type || "logs",
        method: t.method || "LLM Assertions",
        status: t.status,
        confidence: t.confidence,
        date: t.date,
      }));
      setTasks(mappedTasks);

      setReports(reportsRes.data);

      const mappedNotifs = notificationsRes.data.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        timestamp: n.timestamp,
        read: n.read,
      }));
      setNotifications(mappedNotifs);

      // Dynamically generate evidence records based on verified tasks
      const generatedEv = mappedTasks
        .filter((t: any) => t.status === "Verified")
        .map((t: any) => ({
          id: `ev-${t.id}`,
          name: t.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_log.txt",
          type: (t.evidenceType === "api_response" || t.evidenceType === "sensor_data" || t.evidenceType === "image" || t.evidenceType === "video" || t.evidenceType === "logs") ? t.evidenceType : "logs",
          timestamp: t.date + " 10:00 AM",
          status: "Verified",
          size: "12 KB",
          details: `Autonomous database outcome check for task: ${t.name}\n\nOutcome Verification: PASSED\nExpected Outcome: ${t.expectedOutcome}\nMethod: ${t.method}\nConfidence Score: ${t.confidence}%\nDate Checked: ${t.date}`,
        }));
      setEvidenceList(generatedEv);

      // Connect status checks to dynamic output
      setApiStatus("Online");
      setDbStatus("Connected");
      setAiStatus("Ready");
      window.dispatchEvent(new Event("dashboard-refresh"));
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setApiStatus("Offline");
      setDbStatus("Disconnected");
      setAiStatus("Offline");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  // Automatically close all dropdowns on route changes
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname, location.search]);

  // Show a temporary success toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Polling helper function
  const startPollingTask = (taskId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await api.get(`/tasks/${taskId}/status`);
        const { status, progress, logs, missing_params } = statusRes.data;
        
        setVerificationStep(progress);
        setVerificationLogs(logs.map((l: any) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.details}`));
        
        if (status === "Needs Clarification" || (missing_params && missing_params.length > 0)) {
          clearInterval(pollingIntervalRef.current);
          setClarificationFieldName(missing_params[0]);
          setClarificationError(null);
          setVerifyingTask((prev) => prev ? { ...prev, status: "Needs Clarification" } : null);
          triggerToast("Task requires clarification to proceed.");
        } else if (["Verified", "Failed", "Needs Review", "Completed"].includes(status)) {
          clearInterval(pollingIntervalRef.current);
          setActiveRunningTaskId(null);
          fetchVerificationResult(taskId);
          triggerToast(`Task verification completed: ${status}`);
          
          // Clear stepper view after a brief delay
          setTimeout(() => {
            setVerifyingTask(null);
          }, 3000);
        }
      } catch (err) {
        console.error("Polling error", err);
        clearInterval(pollingIntervalRef.current);
      }
    }, 1500);
  };

  const fetchVerificationResult = async (taskId: string) => {
    try {
      const res = await api.get(`/tasks/${taskId}/result`);
      setVerificationResultDetails(res.data);
      fetchDashboardData(); // Refresh list & stats
    } catch (err) {
      console.error("Failed to fetch verification result details", err);
    }
  };

  const handleStartVerification = async (newTask: {
    name: string;
    description: string;
    expectedOutcome?: string;
    evidenceType?: string;
    method?: string;
  }) => {
    // If the user entered a natural language query, run it
    setVerifyingTask({
      name: newTask.name,
      description: newTask.description,
      status: "Running"
    });
    setVerificationStep(5);
    setVerificationLogs([
      `[${new Date().toLocaleTimeString()}] Submitting autonomous task request to orchestrator...`,
      `[${new Date().toLocaleTimeString()}] Input Prompt: "${newTask.description}"`
    ]);
    setActiveModule("dashboard");

    try {
      const runRes = await api.post("/tasks/run", {
        prompt: newTask.description,
        priority: "medium"
      });
      const taskId = runRes.data.task_id;
      setActiveRunningTaskId(taskId);
      
      // Map initial logs
      if (runRes.data.logs) {
        setVerificationLogs(runRes.data.logs);
      }
      
      startPollingTask(taskId);
    } catch (err: any) {
      console.error("Task run submission failed", err);
      setVerifyingTask(null);
      triggerToast(err.response?.data?.detail || "Failed to start verification workflow.");
    }
  };

  const handleClarificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRunningTaskId || !clarificationFieldName || !clarificationValue.trim()) return;

    const fieldName = clarificationFieldName;
    const value = clarificationValue.trim();
    
    // Basic frontend-side validation
    let isValid = true;
    let errorMsg = "";
    
    if (fieldName === "destination" || fieldName === "origin" || fieldName === "theater" || fieldName === "movie_name") {
      if (/^\d+$/.test(value)) {
        isValid = false;
        errorMsg = `Please enter a valid ${fieldName.replace("_", " ")}. It cannot be purely numeric.`;
      } else if (value.length < 2) {
        isValid = false;
        errorMsg = `Please enter a valid ${fieldName.replace("_", " ")}. It must be at least 2 characters long.`;
      }
    } else if (fieldName === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        isValid = false;
        errorMsg = "Please enter a valid date in YYYY-MM-DD format (e.g. 2026-08-10).";
      }
    } else if (fieldName === "amount") {
      const num = parseFloat(value);
      if (isNaN(num)) {
        isValid = false;
        errorMsg = "Please enter a valid amount.";
      } else if (num <= 0) {
        isValid = false;
        errorMsg = "Please enter a positive amount greater than 0.";
      }
    } else if (fieldName === "email" || fieldName === "to_email") {
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)) {
        isValid = false;
        errorMsg = "Please enter a valid email address.";
      }
    } else if (fieldName === "showtime") {
      if (!/[ap]m|:/i.test(value) && !/^\d+$/.test(value)) {
        isValid = false;
        errorMsg = "Please enter a valid showtime (e.g., '7 PM' or '19:00').";
      }
    } else if (fieldName === "status") {
      if (!["premium", "active", "basic", "disabled", "inactive"].includes(value.toLowerCase())) {
        isValid = false;
        errorMsg = "Please select or enter a valid status (premium, active, basic, disabled, inactive).";
      }
    } else if (fieldName === "product_name") {
      if (/^\d+$/.test(value)) {
        isValid = false;
        errorMsg = "Please enter a valid product name. It cannot be purely numeric.";
      } else if (value.length < 2) {
        isValid = false;
        errorMsg = "Please enter a valid product name. It must be at least 2 characters long.";
      }
    }

    if (!isValid) {
      setClarificationError(errorMsg);
      return;
    }

    setClarificationError(null);
    setVerificationStep(55);
    setVerificationLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Resubmitting clarification: ${fieldName} = "${value}"...`
    ]);

    try {
      await api.post(`/tasks/${activeRunningTaskId}/clarify`, {
        param_name: fieldName,
        param_value: value
      });
      
      setClarificationFieldName(null);
      setClarificationValue("");
      
      // Resume polling
      startPollingTask(activeRunningTaskId);
    } catch (err: any) {
      console.error("Clarification submission failed", err);
      const backendErr = err.response?.data?.detail || "Failed to submit clarification.";
      if (backendErr.includes("limit exceeded") || backendErr.includes("exceeded")) {
        setClarificationFieldName(null);
        setClarificationValue("");
        setClarificationError(null);
        setActiveRunningTaskId(null);
        setVerifyingTask(null);
        triggerToast("Clarification limit exceeded. Task marked as FAILED.");
        fetchDashboardData();
      } else {
        setClarificationError(backendErr);
      }
    }
  };

  const handleDownloadReport = async (taskId: string) => {
    triggerToast("Generating and downloading PDF Report...");
    try {
      const response = await api.get(`/reports/${taskId}/download`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `verinova_report_${taskId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerToast("Report downloaded successfully.");
      
      // Refresh list to show generated report
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to download PDF report", err);
      triggerToast("Failed to generate PDF report.");
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Mark a notification as read
  const markNotifRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to read notification", err);
    }
  };

  // Mark all notifications as read
  const markAllNotifsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      triggerToast("All notifications marked as read");
    } catch (err) {
      console.error("Failed to read all notifications", err);
    }
  };

  // Clear notification
  const clearNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  // Generate mock report files
  const triggerReportDownload = (format: string) => {
    triggerToast(`Generating ${format} report...`);
    setTimeout(() => {
      // Simulate file download
      const element = document.createElement("a");
      const file = new Blob([`VeriNova Outcome Verification Report - ${new Date().toLocaleDateString()}\n\nTotal Tasks: ${statistics.totalTasks.value}\nVerified Tasks: ${statistics.verifiedTasks.value}\nFailed Tasks: ${statistics.failedTasks.value}\nPending Tasks: ${statistics.pendingTasks.value}\nAverage Confidence: ${statistics.avgConfidence.value}%\n`], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = `verinova_verification_report_${Date.now()}.${format === "Excel" ? "xlsx" : format.toLowerCase()}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      triggerToast(`Downloaded report in ${format} format.`);
    }, 1500);
  };

  // Generate API Key
  const generateApiKey = () => {
    const hex = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const newKey = `vn_live_${hex}`;
    setSettings((prev) => ({ ...prev, apiKey: newKey }));
    triggerToast("New API Key generated successfully");
  };

  // Custom DB task delete handler passed to MyTasksView
  const handleDeleteTask = async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));

      // Refresh stats
      fetchDashboardData();
      triggerToast("Task deleted successfully");
    } catch (err) {
      console.error("Failed to delete task", err);
      triggerToast("Failed to delete task");
    }
  };

  // Handle Logout
  const handleLogout = () => {
    navigate("/", { replace: true });
    setTimeout(() => {
      logout();
    }, 0);
  };

  // Prevent flash of unauthenticated layout
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dash-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-dash-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will navigate to /login via useEffect
  }

  // Get user initials for profile avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const userInitials = user ? getInitials(user.fullname) : "U";

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text font-sans flex flex-row select-none overflow-hidden relative">
      {/* Decorative glow overlays */}
      <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] bg-dash-primary/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-15%] w-[600px] h-[600px] bg-dash-hover/5 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Sidebar Component */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        userInitials={userInitials}
        userFullName={user ? user.fullname : "Specialist"}
        userAvatarUrl={user?.avatar_url}
        userRole={user?.role}
        handleLogout={handleLogout}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
      />

      {/* Main Page Layout Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto scrollbar-thin">
        {/* Navbar Component */}
        <Navbar
          userFullName={user ? user.fullname : "Verification Specialist"}
          userEmail={user ? user.email : "specialist@verinova.ai"}
          userInitials={userInitials}
          userAvatarUrl={user?.avatar_url}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearchDropdown={showSearchDropdown}
          tasks={tasks}
          notifications={notifications}
          markNotifRead={markNotifRead}
          markAllNotifsRead={markAllNotifsRead}
          clearNotification={clearNotification}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />

        {/* Success / Error floating toast banner */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-dash-sidebar border border-dash-primary/30 text-dash-text px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur-md"
            >
              <ShieldCheck className="text-dash-primary w-5 h-5 animate-pulse" />
              <span className="text-xs font-black">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Core Content View Area */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-8">
          {/* Stepper progress and execution log view */}
          {verifyingTask && activeModule === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-dash-card border border-dash-border rounded-2xl p-6 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-dash-primary to-[#FF8C42] transition-all duration-300" style={{ width: `${verificationStep}%` }}></div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 text-left">
                  {verifyingTask.status === "Needs Clarification" ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
                      <h3 className="font-black text-dash-text text-sm">Execution Suspended - Clarification Required</h3>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-dash-primary animate-spin" />
                      <h3 className="font-black text-dash-text text-sm">AI Verification Engine Running</h3>
                    </div>
                  )}
                </div>
                <span className="text-xs font-black text-dash-primary">{verificationStep}%</span>
              </div>

              {/* Progress Stepper Visualizer */}
              <div className="grid grid-cols-5 gap-2 mb-4 select-none">
                {[
                  { label: "Received", stepVal: 15 },
                  { label: "Parsing", stepVal: 35 },
                  { label: "Executing", stepVal: 55 },
                  { label: "Evidences", stepVal: 75 },
                  { label: "Verifying", stepVal: 100 }
                ].map((st, i) => {
                  const isActive = verificationStep >= st.stepVal;
                  const isCurrent = (verificationStep < st.stepVal) && (i === 0 || verificationStep >= [15, 35, 55, 75, 100][i-1]);
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${isActive ? "bg-dash-primary text-white shadow-[0_0_8px_rgba(255,107,0,0.3)]" : isCurrent ? "bg-[#FF8C42] text-white animate-pulse" : "bg-dash-bg border border-dash-border"}`}>
                        {isActive && "✓"}
                      </div>
                      <span className={`text-[9px] mt-1.5 font-bold uppercase tracking-wider ${isActive ? "text-dash-primary" : isCurrent ? "text-[#FF8C42]" : "text-dash-secondary"}`}>{st.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Terminal logs timeline panel */}
              <div className="bg-dash-bg border border-dash-border/60 rounded-xl p-4 font-mono text-[11px] text-[#FF8A1F] h-32 overflow-y-auto space-y-1.5 scrollbar-thin text-left">
                {verificationLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed font-semibold">{log}</div>
                ))}
                {verifyingTask.status !== "Needs Clarification" && (
                  <div className="w-1.5 h-3.5 bg-dash-primary animate-ping inline-block mt-1"></div>
                )}
              </div>

              {/* Clarification Prompt Box */}
              {verifyingTask.status === "Needs Clarification" && clarificationFieldName && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 p-5 bg-dash-card border border-amber-500/20 rounded-xl text-left"
                >
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider mb-2">
                    Action Required: Provide {clarificationFieldName.replace("_", " ").toUpperCase()}
                  </h4>
                  <p className="text-[11px] text-dash-secondary mb-4 leading-normal font-bold">
                    The AI Assistant requires this parameter to execute the service endpoint. Please input or choose an option:
                  </p>

                  <form onSubmit={handleClarificationSubmit} className="space-y-4">
                    {/* Quick Select Buttons */}
                    {clarificationFieldName === "showtime" && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["3:00 PM", "6:00 PM", "7:00 PM", "9:00 PM"].map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setClarificationValue(t)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${clarificationValue === t ? "bg-dash-primary text-white border-dash-primary" : "border-dash-border bg-dash-bg hover:border-dash-primary/50 text-dash-secondary"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}

                    {clarificationFieldName === "service_name" && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["Cricket Turf", "Football Turf", "Badminton Court", "Swimming Pool", "Cinema Hall"].map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setClarificationValue(s)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${clarificationValue === s ? "bg-dash-primary text-white border-dash-primary" : "border-dash-border bg-dash-bg hover:border-dash-primary/50 text-dash-secondary"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {clarificationFieldName === "product_name" && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["iPhone 16", "Samsung Galaxy S24", "MacBook Pro M3", "HP Pavilion 15"].map((p) => (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setClarificationValue(p)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${clarificationValue === p ? "bg-dash-primary text-white border-dash-primary" : "border-dash-border bg-dash-bg hover:border-dash-primary/50 text-dash-secondary"}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {clarificationFieldName === "time" && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["10 AM", "4 PM", "6 PM"].map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setClarificationValue(t)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${clarificationValue === t ? "bg-dash-primary text-white border-dash-primary" : "border-dash-border bg-dash-bg hover:border-dash-primary/50 text-dash-secondary"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {clarificationFieldName === "date" && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          new Date(Date.now() + 86400000).toISOString().split('T')[0],
                          new Date(Date.now() + 172800000).toISOString().split('T')[0]
                        ].map((d) => (
                          <button
                            type="button"
                            key={d}
                            onClick={() => setClarificationValue(d)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${clarificationValue === d ? "bg-dash-primary text-white border-dash-primary" : "border-dash-border bg-dash-bg hover:border-dash-primary/50 text-dash-secondary"}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {clarificationFieldName === "theater" && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["IMAX", "Dolby Cinema", "PVR", "AMC"].map((th) => (
                          <button
                            type="button"
                            key={th}
                            onClick={() => setClarificationValue(th)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${clarificationValue === th ? "bg-dash-primary text-white border-dash-primary" : "border-dash-border bg-dash-bg hover:border-dash-primary/50 text-dash-secondary"}`}
                          >
                            {th}
                          </button>
                        ))}
                      </div>
                    )}

                    {clarificationFieldName === "status" && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["premium", "active", "disabled"].map((st) => (
                          <button
                            type="button"
                            key={st}
                            onClick={() => setClarificationValue(st)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${clarificationValue === st ? "bg-dash-primary text-white border-dash-primary" : "border-dash-border bg-dash-bg hover:border-dash-primary/50 text-dash-secondary"}`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={clarificationValue}
                        onChange={(e) => {
                          setClarificationValue(e.target.value);
                          setClarificationError(null);
                        }}
                        placeholder={`Enter ${clarificationFieldName.replace("_", " ")}`}
                        className="flex-grow bg-dash-bg border border-dash-border rounded-xl px-4 py-2.5 text-xs text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary/60 font-semibold"
                        required
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-[#FF7F32] hover:from-[#FF7F32] hover:to-[#FF8C42] text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-colors"
                      >
                        Resume Run
                      </button>
                    </div>
                    {clarificationError && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-xs font-semibold mt-2 flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {clarificationError}
                      </motion.p>
                    )}
                  </form>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Render selected subview */}
          {activeModule === "dashboard" && (
            <DashboardHomeView
              userFullName={user ? user.fullname : "Auditor"}
              tasks={tasks}
              statistics={statistics}
              taskStatus={taskStatus}
              setActiveModule={setActiveModule}
              notifications={notifications}
              isLoading={isLoading}
              apiStatus={apiStatus}
              dbStatus={dbStatus}
              aiStatus={aiStatus}
              currentTime={currentTime}
              currentDate={currentDate}
              insightVisible={insightVisible}
              setInsightVisible={setInsightVisible}
              triggerToast={triggerToast}
              onViewReport={fetchVerificationResult}
            />
          )}

          {activeModule === "new-verification" && (
            <NewVerificationView onStart={handleStartVerification} />
          )}

          {activeModule === "my-tasks" && (
            <MyTasksView tasks={tasks} setTasks={setTasks} onDeleteTask={handleDeleteTask} onViewReport={fetchVerificationResult} triggerToast={triggerToast} />
          )}

          {activeModule === "verification-history" && (
            <VerificationHistoryView tasks={tasks} triggerReportDownload={triggerReportDownload} onViewReport={fetchVerificationResult} />
          )}

          {activeModule === "analytics" && (
            <AnalyticsView
              tasks={tasks}
              total={statistics.totalTasks.value}
              verified={statistics.verifiedTasks.value}
              pending={statistics.pendingTasks.value}
              failed={statistics.failedTasks.value}
            />
          )}

          {activeModule === "ai-evidence" && (
            <AiEvidenceView
              evidenceList={evidenceList}
              setEvidenceList={setEvidenceList}
              setActiveEvidenceModal={setActiveEvidenceModal}
              triggerToast={triggerToast}
            />
          )}

          {activeModule === "reports" && (
            <ReportsView
              totalTasksCount={statistics.totalTasks.value}
              verifiedTasksCount={statistics.verifiedTasks.value}
              failedTasksCount={statistics.failedTasks.value}
              triggerReportDownload={triggerReportDownload}
              reports={reports}
              isLoading={isLoading}
            />
          )}

          {activeModule === "notifications" && (
            <NotificationsView
              notifications={notifications}
              markNotifRead={markNotifRead}
              clearNotification={clearNotification}
              markAllNotifsRead={markAllNotifsRead}
            />
          )}

          {activeModule === "profile" && (
            <ProfileView
              triggerToast={triggerToast}
            />
          )}

          {activeModule === "settings" && (
            <SettingsView
              settings={settings}
              setSettings={setSettings}
              generateApiKey={generateApiKey}
              triggerToast={triggerToast}
            />
          )}

          {activeModule === "admin-dashboard" && (
            <AdminDashboardView
              triggerToast={triggerToast}
            />
          )}
        </main>
      </div>

      {/* Reusable Evidence View Modal Popup */}
      <AnimatePresence>
        {activeEvidenceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveEvidenceModal(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-dash-sidebar border border-dash-border/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-4 border-b border-dash-border/40 flex items-center justify-between bg-dash-card/10">
                <div className="flex items-center gap-2.5">
                  {activeEvidenceModal.type === "logs" && <FileCode className="w-5 h-5 text-dash-primary" />}
                  {activeEvidenceModal.type === "image" && <ImageIcon className="w-5 h-5 text-blue-400" />}
                  {activeEvidenceModal.type === "video" && <Video className="w-5 h-5 text-pink-400" />}
                  <span className="font-black text-dash-text text-sm truncate max-w-[200px]">{activeEvidenceModal.name}</span>
                </div>
                <button
                  onClick={() => setActiveEvidenceModal(null)}
                  className="text-dash-secondary hover:text-dash-primary p-1 rounded hover:bg-dash-card/40 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[350px]">
                <pre className="bg-black/90 border border-dash-border/50 rounded-xl p-4 font-mono text-[11px] text-dash-text leading-relaxed whitespace-pre-wrap select-text text-left">
                  {activeEvidenceModal.details || "No evidence telemetry footprint generated for this run."}
                </pre>
              </div>
              <div className="p-4 border-t border-dash-border/40 bg-dash-card/10 text-right">
                <button
                  onClick={() => setActiveEvidenceModal(null)}
                  className="px-4 py-2 bg-dash-primary hover:bg-dash-hover text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Close Footprint
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Result Scorecard Modal */}
      <AnimatePresence>
        {verificationResultDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerificationResultDetails(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25 }}
              className="bg-dash-sidebar border border-dash-border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative z-10 flex flex-col p-6 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-dash-border mb-5">
                <div>
                  <h3 className="font-black text-dash-text text-base">Verification Report Scorecard</h3>
                  <span className="text-[10px] text-dash-secondary mt-0.5 block font-bold uppercase tracking-wider">
                    Task ID: {verificationResultDetails.task_id}
                  </span>
                </div>
                <button
                  onClick={() => setVerificationResultDetails(null)}
                  className="text-dash-secondary hover:text-dash-primary p-1 rounded hover:bg-dash-card/45 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto max-h-[450px] pr-1">
                {/* Left side: Circular gauge */}
                <div className="md:col-span-5 flex flex-col items-center justify-center bg-dash-bg/40 rounded-2xl p-4 border border-dash-border">
                  <div className="relative w-28 h-28 flex items-center justify-center select-none">
                    <svg className="w-full h-full transform -rotate-90">
                      <defs>
                        <linearGradient id="scorecardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF6B00" />
                          <stop offset="50%" stopColor="#FF7A00" />
                          <stop offset="100%" stopColor="#FF8A1F" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <motion.circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="url(#scorecardGradient)"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                        animate={{
                          strokeDashoffset:
                            2 * Math.PI * 48 * (1 - verificationResultDetails.confidence_score / 100)
                        }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-dash-text tracking-tight">{verificationResultDetails.confidence_score}%</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${
                        verificationResultDetails.confidence_score >= 80 ? "text-[#FF6B00]" : "text-[#EF4444]"
                      }`}>
                        {verificationResultDetails.confidence_score >= 80 ? "VERIFIED" : "FAILED"}
                      </span>
                    </div>
                  </div>

                  <span className={`mt-4 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    verificationResultDetails.status === "Verified"
                      ? "bg-green-500/10 border-green-500/20 text-[#22C55E]"
                      : verificationResultDetails.status === "Needs Review"
                      ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    {verificationResultDetails.status}
                  </span>
                </div>

                {/* Right side: Evidence Checklist */}
                <div className="md:col-span-7 space-y-4">
                  <h4 className="text-[10px] font-black text-dash-secondary uppercase tracking-wider">Evidence Telemetry</h4>
                  
                  <div className="space-y-2.5">
                    {verificationResultDetails.evidence && verificationResultDetails.evidence.map((ev: any) => {
                      const isPassed = ev.type === "logs" || (ev.type === "api_response" && ["refunded", "sent", "confirmed", "updated"].includes(ev.data?.status)) || (ev.type === "database_check" && (ev.data?.success || ev.data?.match));
                      return (
                        <div key={ev.id} className="flex items-start gap-3 bg-dash-bg/40 p-2.5 rounded-xl border border-dash-border text-xs">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-dash-text block capitalize">{ev.type.replace("_", " ")}</span>
                            <p className="text-[10px] text-dash-secondary font-semibold truncate leading-relaxed mt-0.5">
                              {ev.type === "api_response" ? `Service: ${ev.data?.service}. Status: ${ev.data?.status}` : ev.data?.details || "Logs verification successful."}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Summary Description Box */}
              <div className="mt-5 p-3.5 bg-dash-card/30 border border-dash-border rounded-2xl text-[11px] leading-relaxed text-dash-secondary font-bold">
                <span className="font-black text-dash-text block mb-1">Verification Summary</span>
                {verificationResultDetails.summary}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-between gap-3 pt-4 border-t border-dash-border bg-dash-card/10">
                <button
                  onClick={() => handleDownloadReport(verificationResultDetails.task_id)}
                  className="px-4 py-2.5 bg-dash-bg border border-dash-border hover:border-dash-primary text-dash-text hover:text-dash-primary rounded-xl text-xs uppercase font-black tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report (PDF)</span>
                </button>
                
                <button
                  onClick={() => setVerificationResultDetails(null)}
                  className="px-5 py-2.5 bg-dash-primary hover:bg-dash-hover text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================= */
/* --- 1. DASHBOARD HOME VIEW (SPACIOUS ACCURATE GRID SECTION) --- */
/* ========================================================================= */
interface DashboardHomeViewProps {
  userFullName: string;
  tasks: Task[];
  statistics: {
    totalTasks: { value: number; change: string; trend: "up" | "down" | "neutral" };
    verifiedTasks: { value: number; change: string; trend: "up" | "down" | "neutral" };
    pendingTasks: { value: number; change: string; trend: "up" | "down" | "neutral" };
    failedTasks: { value: number; change: string; trend: "up" | "down" | "neutral" };
    avgConfidence: { value: number; change: string; trend: "up" | "down" | "neutral" };
  };
  taskStatus: {
    total: number;
    verified: number;
    pending: number;
    running: number;
    failed: number;
  };
  setActiveModule: (mod: string) => void;
  notifications: SystemNotification[];
  isLoading?: boolean;
  apiStatus: string;
  dbStatus: string;
  aiStatus: string;
  currentTime: string;
  currentDate: string;
  insightVisible: boolean;
  setInsightVisible: (vis: boolean) => void;
  triggerToast: (msg: string) => void;
  onViewReport: (id: string) => void;
}

function DashboardHomeView({
  userFullName,
  tasks,
  statistics,
  taskStatus,
  setActiveModule,
  notifications,
  isLoading,
  apiStatus,
  dbStatus,
  aiStatus,
  currentTime,
  currentDate,
  insightVisible,
  setInsightVisible,
  triggerToast,
  onViewReport,
}: DashboardHomeViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-8 text-left">
        {/* Welcome Skeleton */}
        <div className="space-y-2 w-1/3 animate-pulse">
          <div className="h-7 bg-dash-card rounded w-full"></div>
          <div className="h-4 bg-dash-card rounded w-2/3"></div>
        </div>

        {/* 5 Stats Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-dash-card border border-dash-border/60 rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="h-4 bg-dash-bg/60 rounded w-1/2"></div>
              <div className="h-8 bg-dash-bg/70 rounded w-2/3"></div>
            </div>
          ))}
        </div>

        {/* Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-dash-card/50 border border-dash-border/60 rounded-2xl p-6 h-56 animate-pulse" />
          <div className="lg:col-span-4 bg-dash-card/50 border border-dash-border/60 rounded-2xl p-6 h-56 animate-pulse" />
        </div>
      </div>
    );
  }

  // Left Sidebar menu quick actions
  const quickActionsList = [
    { title: "New Verification", desc: "Start a new verification task", icon: <PlayCircle className="w-4 h-4 text-[#10B981]" />, module: "new-verification" },
    { title: "Upload Evidence", desc: "Upload files for analysis", icon: <ImageIcon className="w-4 h-4 text-blue-400" />, module: "ai-evidence" },
    { title: "Generate Report", desc: "Generate verification report", icon: <FileText className="w-4 h-4 text-yellow-400" />, module: "reports" },
    { title: "AI Audit", desc: "Run AI system audit", icon: <Activity className="w-4 h-4 text-pink-400" />, action: () => triggerToast("AI system audit initiated...") },
    { title: "Export Results", desc: "Export verification results", icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />, action: () => triggerToast("Results compiled for export.") },
  ];

  return (
    <div className="space-y-7">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h2 className="text-2xl font-black text-dash-text leading-tight">
            Welcome back, {userFullName} 👋
          </h2>
          <p className="text-dash-secondary text-xs sm:text-sm mt-1.5 font-semibold">
            Verify AI outcomes with evidence.
          </p>
        </div>

        {/* Date and Time badge widget */}
        <div className="flex items-center gap-3.5 bg-dash-card/40 border border-dash-border/60 p-3 rounded-2xl">
          <Calendar className="w-5 h-5 text-dash-primary flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider">{currentDate}</span>
            <span className="text-xs font-black text-dash-primary mt-0.5">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* 5 Statistics Cards (Dynamic DB values) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="Total Tasks"
          value={statistics.totalTasks.value}
          change={statistics.totalTasks.change}
          trend={statistics.totalTasks.trend}
          icon={<CheckSquare className="w-4 h-4 text-dash-primary" />}
          accentColor="green"
        />
        <DashboardCard
          title="Verified"
          value={statistics.verifiedTasks.value}
          change={statistics.verifiedTasks.change}
          trend={statistics.verifiedTasks.trend}
          icon={<ShieldCheck className="w-4 h-4 text-[#10B981]" />}
          accentColor="emerald"
        />
        <DashboardCard
          title="Pending"
          value={statistics.pendingTasks.value}
          change={statistics.pendingTasks.change}
          trend={statistics.pendingTasks.trend}
          icon={<Clock className="w-4 h-4 text-yellow-400" />}
          accentColor="yellow"
        />
        <DashboardCard
          title="Failed"
          value={statistics.failedTasks.value}
          change={statistics.failedTasks.change}
          trend={statistics.failedTasks.trend}
          icon={<XCircle className="w-4 h-4 text-red-400" />}
          accentColor="red"
        />
        <DashboardCard
          title="Avg. Confidence"
          value={statistics.avgConfidence.value > 0 ? `${statistics.avgConfidence.value}%` : "0%"}
          change={statistics.avgConfidence.change}
          trend={statistics.avgConfidence.trend}
          icon={<Activity className="w-4 h-4 text-blue-400" />}
          accentColor="blue"
        />
      </div>

      {/* Inline Charts Row (Line curve & Status Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VerificationActivityChart />
        </div>
        <div>
          <TaskStatusDonut
            total={taskStatus.total}
            verified={taskStatus.verified}
            pending={taskStatus.pending}
            running={taskStatus.running}
            failed={taskStatus.failed}
          />
        </div>
      </div>

      {/* Center Table (3/4 wide) & Right side controls (1/4 wide) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        {/* Recent Tasks registry */}
        <div className="lg:col-span-9 bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl flex flex-col backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-dash-text text-sm tracking-tight">Recent Tasks</h3>
            </div>
            <button
              onClick={() => setActiveModule("my-tasks")}
              className="text-xs text-dash-primary hover:text-dash-hover font-bold flex items-center gap-1 cursor-pointer uppercase tracking-wider"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <TaskTable tasks={tasks} showActions={true} limit={5} simple={true} onViewReport={onViewReport} />
        </div>

        {/* Right widgets sidebar panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Actions (5 buttons list matching screenshot) */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-dash-secondary uppercase tracking-[0.12em]">Quick Actions</h4>
            <div className="bg-dash-sidebar/25 border border-dash-border/60 rounded-2xl p-4.5 space-y-3">
              {quickActionsList.map((qa) => (
                <button
                  key={qa.title}
                  onClick={() => (qa.module ? setActiveModule(qa.module) : qa.action && qa.action())}
                  className="w-full flex items-center justify-between p-2 hover:bg-dash-card/50 rounded-xl transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-dash-bg border border-dash-border/60 rounded-lg group-hover:border-dash-primary/30 transition-colors">
                      {qa.icon}
                    </div>
                    <div className="text-left leading-none">
                      <span className="text-xs font-bold text-white group-hover:text-dash-primary transition-colors block">{qa.title}</span>
                      <span className="text-[9px] text-dash-secondary mt-1 block font-semibold">{qa.desc}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-dash-secondary group-hover:text-dash-primary" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity Timeline checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-dash-secondary uppercase tracking-[0.12em]">Recent Activity</h4>
              <button onClick={() => setActiveModule("verification-history")} className="text-[10px] font-bold text-dash-primary hover:text-dash-hover uppercase">View All</button>
            </div>
            <div className="bg-dash-sidebar/25 border border-dash-border/60 rounded-2xl p-4.5 space-y-3 text-xs">
              <div className="flex items-center justify-between text-dash-text font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>Task #1248 completed</span>
                </div>
                <span className="text-[9px] text-dash-secondary">2 min ago</span>
              </div>
              <div className="flex items-center justify-between text-dash-text font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>Evidence uploaded</span>
                </div>
                <span className="text-[9px] text-dash-secondary">5 min ago</span>
              </div>
              <div className="flex items-center justify-between text-dash-text font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>AI model updated</span>
                </div>
                <span className="text-[9px] text-dash-secondary">1 hr ago</span>
              </div>
              <div className="flex items-center justify-between text-dash-text font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>New report generated</span>
                </div>
                <span className="text-[9px] text-dash-secondary">2 hr ago</span>
              </div>
              <div className="flex items-center justify-between text-dash-text font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>System backup completed</span>
                </div>
                <span className="text-[9px] text-dash-secondary">3 hr ago</span>
              </div>
            </div>
          </div>

          {/* AI Assistant widget card */}
          <div className="bg-gradient-to-br from-dash-sidebar/40 to-dash-card/5 border border-dash-border/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-dash-primary/10 border border-dash-primary/20 text-dash-primary rounded-xl">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-dash-text">AI Assistant</h4>
              </div>
            </div>
            <p className="text-[10px] text-dash-secondary font-bold leading-normal text-left">
              Your AI system is performing exceptionally well today.
            </p>
            <button
              onClick={() => triggerToast("AI dialogue interface coming soon...")}
              className="w-full py-2 bg-dash-primary/5 hover:bg-dash-primary/10 border border-dash-primary/20 hover:border-dash-primary text-dash-primary hover:text-dash-primary rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>+ Ask AI Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Row 3: Notifications (8 cols) & System Status (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Notifications (3 lines bulleted list) */}
        <div className="lg:col-span-8 bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl flex flex-col backdrop-blur-md text-left animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-dash-text text-sm tracking-tight">Recent Notifications</h3>
              <p className="text-[11px] text-dash-secondary mt-0.5 font-semibold">Latest system updates and relays</p>
            </div>
            <button
              onClick={() => setActiveModule("notifications")}
              className="text-xs text-dash-primary hover:text-dash-hover font-bold cursor-pointer uppercase tracking-wider"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3.5 py-1 text-xs select-none">
            {notifications.length === 0 ? (
              <div className="text-dash-secondary py-3">No new notifications</div>
            ) : (
              notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="flex items-start gap-2.5 text-white">
                  <span className="text-dash-primary font-black mt-0.5">•</span>
                  <div className="flex-1">
                    <span className="font-bold text-dash-text block sm:inline">{n.title}:</span>{" "}
                    <span className="text-dash-secondary font-semibold">{n.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Status (Dynamic connections) */}
        <div className="lg:col-span-4 bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl flex flex-col backdrop-blur-md text-left animate-fade-in">
          <h3 className="font-black text-dash-text text-sm tracking-tight mb-4.5">System Status</h3>
          <div className="space-y-3.5 text-xs font-black select-none">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${apiStatus === "Online" ? "bg-[#10B981] shadow-[0_0_8px_#10B981]" : apiStatus === "Checking" ? "bg-yellow-400" : "bg-red-500"}`} />
              <span className="text-white">API {apiStatus}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${dbStatus === "Connected" ? "bg-[#10B981] shadow-[0_0_8px_#10B981]" : dbStatus === "Checking" ? "bg-yellow-400" : "bg-red-500"}`} />
              <span className="text-white">Database {dbStatus}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${aiStatus === "Ready" ? "bg-[#10B981] shadow-[0_0_8px_#10B981]" : aiStatus === "Checking" ? "bg-yellow-400" : "bg-red-500"}`} />
              <span className="text-white">AI Verification {aiStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight bottom banner */}
      <AnimatePresence>
        {insightVisible && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full bg-dash-card border border-dash-primary/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs shadow-lg shadow-dash-primary/5 text-left relative overflow-hidden"
          >
            {/* Wave shape overlay decoration */}
            <div className="absolute inset-y-0 right-10 w-44 pointer-events-none opacity-20 bg-gradient-to-r from-transparent to-dash-primary/10 select-none hidden md:block" />

            <div className="flex items-center gap-3">
              <div className="p-2 bg-dash-primary/10 border border-dash-primary/25 rounded-xl text-dash-primary flex-shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-dash-text block">AI Insight</span>
                <span className="text-dash-secondary font-semibold mt-0.5 block leading-normal">
                  Your verification accuracy improved by 3.2% this week. Keep up the excellent work! 🚀
                </span>
              </div>
            </div>

            <button
              onClick={() => setInsightVisible(false)}
              className="text-dash-secondary hover:text-dash-primary p-1 hover:bg-dash-card/50 rounded-lg cursor-pointer flex-shrink-0"
              title="Close Insight"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================= */
/* --- 1B. DEDICATED ANALYTICS VIEW --- */
/* ========================================================================= */
function AnalyticsView({
  tasks,
  total,
  verified,
  pending,
  failed,
}: {
  tasks: Task[];
  total: number;
  verified: number;
  pending: number;
  failed: number;
}) {
  return (
    <div className="space-y-6 text-left">
      <div>
        <h3 className="text-lg font-black text-dash-text leading-tight">Verification Analytics</h3>
        <p className="text-xs text-dash-secondary mt-1">Detailed mathematical trends on node audits and outcome integrity scans.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Monthly Verification Trend"
          subtitle="Verification node task throughput"
          type="monthly-line"
          tasks={tasks}
        />
        <ChartCard
          title="Verification Success Rate"
          subtitle="Aggregated node reliability"
          type="success-rate"
        />
        <ChartCard
          title="Weekly Verification Activity"
          subtitle="Node outcome scans (Mon - Sun)"
          type="weekly-bar"
        />
        <ChartCard
          title="Status Distribution"
          subtitle="Outcome proportions database metrics"
          type="status-donut"
          total={total}
          verified={verified}
          pending={pending}
          failed={failed}
        />
      </div>
    </div>
  );
}

/* ========================================================================= */
/* --- 2. NEW VERIFICATION VIEW --- */
/* ========================================================================= */
function NewVerificationView({
  onStart,
}: {
  onStart: (task: {
    name: string;
    description: string;
  }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  const presets = [
    {
      title: "Booking Assistant",
      text: "Book a cricket turf tomorrow at 6 PM.",
      desc: "Sports turf reservation and booking slot lookup",
      icon: "🏏"
    },
    {
      title: "Shopping Assistant",
      text: "Find me a laptop under ₹60000.",
      desc: "Electronics database product inventory search",
      icon: "💻"
    },
    {
      title: "Booking Assistant",
      text: "Book a badminton court tomorrow evening.",
      desc: "Court booking slot validation and reserve",
      icon: "🏸"
    },
    {
      title: "Shopping Assistant",
      text: "Buy the iPhone 16 if stock is available.",
      desc: "Deduct stock and confirm order consistency",
      icon: "📱"
    },
    {
      title: "Refund Request",
      text: "Refund ₹500 for order #pay-4567",
      desc: "Razorpay Test sandbox payment refund simulation",
      icon: "💳"
    },
    {
      title: "Send Notification",
      text: "Send email to client@verinova.ai with message: 'Your booking has been verified.'",
      desc: "Gmail SMTP outbound dispatch system test",
      icon: "✉️"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please enter a natural language task description or select a preset.");
      return;
    }
    setError("");
    onStart({
      name: prompt.trim().substring(0, 40) + (prompt.trim().length > 40 ? "..." : ""),
      description: prompt.trim()
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left animate-fade-in">
      {/* Title */}
      <div>
        <h3 className="text-lg font-black text-dash-text leading-tight">Submit New AI Task</h3>
        <p className="text-xs text-dash-secondary mt-1">Specify a system action in plain language. The AI agent will execute the service and auto-verify evidence.</p>
      </div>

      {/* Preset Cards Grid */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-dash-secondary uppercase tracking-[0.12em] block">Quick-Select Task Templates</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 select-none">
          {presets.map((p) => (
            <div
              key={p.title}
              onClick={() => {
                setPrompt(p.text);
                setError("");
              }}
              className="bg-dash-sidebar/40 border border-dash-border hover:border-dash-primary/40 hover:bg-dash-card/35 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 flex items-start gap-3"
            >
              <span className="text-xl">{p.icon}</span>
              <div>
                <span className="text-xs font-bold text-dash-text block">{p.title}</span>
                <p className="text-[10px] text-dash-secondary font-semibold mt-1.5 leading-normal">{p.text}</p>
                <span className="text-[8px] text-dash-primary uppercase tracking-wider block mt-2 font-bold">{p.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-dash-secondary uppercase tracking-wider">
            Natural Language Instruction
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (e.target.value.trim()) setError("");
            }}
            placeholder="Type your instruction, e.g. 'Refund ₹500 for order #pay-4567' or choose a quick-select card above."
            className={`w-full bg-dash-bg border rounded-xl px-4 py-3.5 text-xs text-dash-text placeholder-dash-secondary focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold leading-relaxed ${
              error ? "border-red-500" : "border-dash-border/60"
            }`}
          />
          {error && <span className="text-red-400 text-[10px] font-semibold mt-0.5">{error}</span>}
        </div>

        <button
          type="submit"
          className="w-full bg-dash-primary hover:bg-dash-hover text-dash-bg font-black py-3.5 px-6 rounded-xl shadow-lg shadow-dash-primary/20 hover:shadow-dash-primary/30 transition-all cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <PlayCircle className="w-5 h-5" />
          <span>Start AI Verification Run</span>
        </button>
      </form>
    </div>
  );
}

/* ========================================================================= */
/* --- 3. MY TASKS VIEW --- */
/* ========================================================================= */
function MyTasksView({
  tasks,
  setTasks,
  onDeleteTask,
  onViewReport,
  triggerToast,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onDeleteTask?: (id: string) => void;
  onViewReport: (id: string) => void;
  triggerToast: (msg: string) => void;
}) {
  const handleDeleteTask = (id: string) => {
    if (onDeleteTask) {
      onDeleteTask(id);
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      triggerToast("Task deleted successfully");
    }
  };

  return (
    <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md text-left animate-fade-in">
      <div>
        <h3 className="text-lg font-black text-dash-text leading-tight">Tasks Registry Directory</h3>
        <p className="text-xs text-dash-secondary mt-1">Full database registry of outcome verifications.</p>
      </div>

      <TaskTable
        tasks={tasks}
        onDeleteTask={handleDeleteTask}
        onViewReport={onViewReport}
        showActions={true}
      />
    </div>
  );
}

/* ========================================================================= */
/* --- 4. VERIFICATION HISTORY VIEW --- */
/* ========================================================================= */
function VerificationHistoryView({
  tasks,
  triggerReportDownload,
  onViewReport,
}: {
  tasks: Task[];
  triggerReportDownload: (format: string) => void;
  onViewReport: (id: string) => void;
}) {
  return (
    <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md text-left animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-dash-text leading-tight">Audit Trail History</h3>
          <p className="text-xs text-dash-secondary mt-1">Full sequential history of AI outcome certifications.</p>
        </div>
        <button
          onClick={() => triggerReportDownload("Excel")}
          className="bg-dash-primary hover:bg-dash-hover text-dash-bg font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel Report</span>
        </button>
      </div>

      <TaskTable tasks={tasks} showActions={true} onViewReport={onViewReport} />
    </div>
  );
}

/* ========================================================================= */
/* --- 5. AI EVIDENCE VIEW --- */
/* ========================================================================= */
function AiEvidenceView({
  evidenceList,
  setActiveEvidenceModal,
}: {
  evidenceList: Evidence[];
  setEvidenceList: React.Dispatch<React.SetStateAction<Evidence[]>>;
  setActiveEvidenceModal: (ev: Evidence) => void;
  triggerToast: (msg: string) => void;
}) {
  return (
    <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md text-left animate-fade-in">
      <div>
        <h3 className="text-lg font-black text-dash-text leading-tight">Evidence Archive</h3>
        <p className="text-xs text-dash-secondary mt-1">Footprint log archives of successful validation outcomes.</p>
      </div>

      {evidenceList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-dash-border/60 rounded-2xl bg-dash-card/5">
          <ImageIcon className="w-10 h-10 text-dash-secondary opacity-40 mb-3" />
          <h4 className="text-sm font-bold text-dash-text">No evidence files stored.</h4>
          <p className="text-xs text-dash-secondary mt-1">Evidence logs will populate here once outcome validation checks pass.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidenceList.map((ev) => (
            <div
              key={ev.id}
              onClick={() => setActiveEvidenceModal(ev)}
              className="bg-dash-card/20 hover:bg-dash-sidebar/40 border border-dash-border/50 hover:border-dash-primary/30 p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="bg-dash-bg border border-dash-border/40 p-2.5 rounded-lg text-dash-secondary">
                  {ev.name.endsWith(".pdf") && <FileText className="w-5 h-5 text-red-400" />}
                  {ev.name.endsWith(".png") && <ImageIcon className="w-5 h-5 text-blue-400" />}
                  {ev.name.endsWith(".txt") && <FileCode className="w-5 h-5 text-dash-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-dash-text truncate max-w-[150px]">{ev.name}</h4>
                  <span className="text-[10px] text-dash-secondary block mt-0.5">
                    {ev.size} • {ev.status}
                  </span>
                </div>
              </div>
              <Eye className="w-4 h-4 text-dash-secondary hover:text-dash-primary" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* --- 6. REPORTS VIEW --- */
/* ========================================================================= */
function ReportsView({
  totalTasksCount,
  verifiedTasksCount,
  failedTasksCount,
  triggerReportDownload,
  reports,
  isLoading,
}: {
  totalTasksCount: number;
  verifiedTasksCount: number;
  failedTasksCount: number;
  triggerReportDownload: (format: string) => void;
  reports: any[];
  isLoading?: boolean;
}) {
  const [selectedFormat, setSelectedFormat] = useState<string>("PDF");

  return (
    <div className="max-w-2xl mx-auto space-y-8 text-left animate-fade-in">
      <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-black text-dash-text leading-tight">Generate Verification Reports</h3>
          <p className="text-xs text-dash-secondary mt-1">Export analytical files compiled from database outcome checks.</p>
        </div>

        <div className="bg-dash-bg p-4 rounded-xl border border-dash-border/50 flex justify-between text-center gap-4 divide-x divide-dash-border/30">
          <div className="flex-1">
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider block">Tasks Logged</span>
            <span className="text-lg font-black text-dash-text block mt-1">{totalTasksCount}</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider block">Verified Outcomes</span>
            <span className="text-lg font-black text-dash-primary block mt-1">{verifiedTasksCount}</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider block">Failed Audits</span>
            <span className="text-lg font-black text-red-400 block mt-1">{failedTasksCount}</span>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <label className="text-xs font-black text-dash-secondary uppercase tracking-wider block">Select Download Format</label>
          <div className="grid grid-cols-3 gap-3">
            {["PDF", "CSV", "Excel"].map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`py-3.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${selectedFormat === format
                  ? "bg-dash-primary/10 border-dash-primary/45 text-dash-primary"
                  : "bg-dash-bg/70 border-dash-border/60 text-dash-secondary hover:text-dash-primary"
                  }`}
              >
                {format === "PDF" && <FileText className="w-4 h-4 inline-block mr-1.5 align-middle" />}
                {format === "CSV" && <FileSpreadsheet className="w-4 h-4 inline-block mr-1.5 align-middle" />}
                {format === "Excel" && <FileSpreadsheet className="w-4 h-4 inline-block mr-1.5 align-middle text-emerald-500" />}
                <span className="align-middle">{format}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => triggerReportDownload(selectedFormat)}
          className="w-full bg-dash-primary hover:bg-dash-hover text-dash-bg font-black py-3.5 px-6 rounded-xl shadow-lg shadow-dash-primary/20 transition-all cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          <span>Generate & Export Report</span>
        </button>
      </div>

      {/* Generated Reports List */}
      <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 backdrop-blur-md">
        <h3 className="text-md font-black text-dash-text">Recent Generated Reports</h3>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 bg-dash-primary/10 rounded-xl w-full"></div>
            <div className="h-10 bg-dash-primary/5 rounded-xl w-full"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-dash-card/5 border border-dashed border-dash-border/60 rounded-xl">
            <FileText className="w-10 h-10 text-dash-secondary opacity-40 mb-2" />
            <h4 className="text-sm font-bold text-dash-text">No reports generated yet.</h4>
            <p className="text-xs text-dash-secondary mt-1">Request a download format above to populate this catalog.</p>
          </div>
        ) : (
          <div className="divide-y divide-dash-border/30 text-sm">
            {reports.map((report: any) => (
              <div key={report.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-dash-primary" />
                  <div>
                    <p className="font-bold text-white">{report.name}</p>
                    <p className="text-[11px] text-dash-secondary">{report.timestamp} • {report.size}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-dash-primary/15 text-dash-primary font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-dash-primary/10">
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* --- 7. NOTIFICATIONS VIEW --- */
/* ========================================================================= */
function NotificationsView({
  notifications,
  markNotifRead,
  clearNotification,
  markAllNotifsRead,
}: {
  notifications: SystemNotification[];
  markNotifRead: (id: string) => void;
  clearNotification: (id: string) => void;
  markAllNotifsRead: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md text-left space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dash-border/40">
        <div>
          <h3 className="text-lg font-black text-dash-text leading-tight">Notification Hub</h3>
          <p className="text-xs text-dash-secondary mt-1">Real-time alerts, verification results, and server status warning relays.</p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllNotifsRead}
            className="text-xs text-dash-primary hover:text-dash-hover font-black uppercase tracking-wider cursor-pointer border border-dash-primary/20 bg-dash-primary/5 px-4 py-2 rounded-xl transition-all"
          >
            Mark All as Read
          </button>
        )}
      </div>

      <div className="divide-y divide-dash-border/20">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-dash-secondary text-sm">
            No new notifications
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markNotifRead(notif.id)}
              className={`py-4 flex items-start justify-between gap-4 transition-colors ${!notif.read ? "bg-dash-primary/5 rounded-xl px-4 my-2 border-l-2 border-dash-primary" : "px-4"
                }`}
            >
              <div className="flex items-start gap-3">
                {notif.type === "success" && <CheckCircle2 className="w-5 h-5 text-dash-primary mt-0.5 flex-shrink-0" />}
                {notif.type === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />}
                {notif.type === "error" && <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                {notif.type === "info" && <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />}

                <div>
                  <h4 className="text-sm font-bold text-dash-text flex items-center gap-2">
                    <span>{notif.title}</span>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 bg-dash-primary rounded-full" />
                    )}
                  </h4>
                  <p className="text-xs text-dash-secondary mt-1 leading-relaxed">{notif.message}</p>
                  <span className="text-[9px] text-dash-secondary/50 block mt-2 font-bold uppercase tracking-wider">
                    {notif.timestamp}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearNotification(notif.id);
                }}
                className="text-dash-secondary hover:text-red-400 p-1.5 hover:bg-dash-card/50 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* --- 8. PROFILE VIEW --- */
/* ========================================================================= */
function ProfileView({
  triggerToast,
}: {
  triggerToast: (msg: string) => void;
}) {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullname, setFullname] = useState(user?.fullname || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.avatar_url || null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if user context changes
  useEffect(() => {
    if (user) {
      setFullname(user.fullname);
      setPhotoPreview(user.avatar_url || null);
    }
  }, [user]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const userInitials = getInitials(fullname || user?.fullname || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      triggerToast("Unsupported image format. Please select JPG, JPEG, PNG, or WEBP.");
      return;
    }

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      triggerToast("File size exceeds 5 MB limit.");
      return;
    }

    setSelectedFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate inputs
    const trimmedName = fullname.trim();
    if (trimmedName.length < 3) {
      triggerToast("Full Name must be at least 3 characters long.");
      return;
    }

    setIsSaving(true);
    let updatedUser = { ...user };
    let success = true;

    try {
      // 1. Upload photo if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
          const photoRes = await api.post("/user/profile/photo", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          updatedUser = photoRes.data;
        } catch (photoErr) {
          success = false;
        }
      }

      // 2. Update name if changed and we haven't failed yet
      if (success && trimmedName !== user.fullname) {
        try {
          const profileRes = await api.put("/user/profile", {
            fullname: trimmedName,
          });
          updatedUser = profileRes.data;
        } catch (nameErr) {
          success = false;
        }
      }

      if (success) {
        // Sync with global auth state
        updateUser(updatedUser);
        setSelectedFile(null);
        triggerToast("Profile updated successfully.");
      } else {
        triggerToast("Unable to update profile. Please try again.");
      }
    } catch (err) {
      console.error("Failed to update profile", err);
      triggerToast("Unable to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = fullname.trim() !== (user?.fullname || "") || selectedFile !== null;

  // Format joined date: e.g. Jul 27, 2026
  const formatJoinedDate = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md text-left animate-fade-in">
      <h2 className="text-xl font-black text-dash-text mb-6 uppercase tracking-wider">Profile</h2>

      <div className="flex flex-col items-center text-center pb-6 border-b border-dash-border/40">
        {/* Photo Avatar block */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-dash-primary to-dash-hover flex items-center justify-center text-dash-bg text-3xl font-black shadow-lg shadow-dash-primary/20 overflow-hidden">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={fullname}
                className="w-full h-full object-cover"
              />
            ) : (
              userInitials
            )}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSaving}
          className="mt-4 px-4 py-2 rounded-xl border border-dash-border/80 hover:border-dash-primary text-dash-secondary hover:text-dash-primary text-xs uppercase font-black tracking-wider transition-all duration-200 cursor-pointer bg-dash-sidebar/40 disabled:opacity-50"
        >
          Change Photo
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5 pt-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-dash-secondary uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            disabled={isSaving}
            className="w-full bg-dash-bg border border-dash-border/60 rounded-xl px-4 py-3 text-sm text-dash-text focus:outline-none focus:border-dash-primary/50 transition-all font-semibold disabled:opacity-60"
            placeholder="Your Full Name"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <label className="text-xs font-black text-dash-secondary uppercase tracking-wider flex items-center gap-1.5">
            Email Address
          </label>
          <div className="relative flex items-center">
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full bg-dash-bg/60 border border-dash-border/30 rounded-xl pl-4 pr-24 py-3 text-sm text-dash-secondary/70 font-semibold cursor-not-allowed"
            />
            <div className="absolute right-3 flex items-center gap-1 text-dash-primary font-bold text-[10px] uppercase tracking-wider bg-dash-primary/10 border border-dash-primary/20 px-2 py-0.5 rounded-lg">
              <Lock className="w-3 h-3" />
              <span>Verified</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-dash-secondary uppercase tracking-wider">Joined</label>
          <div className="bg-dash-bg/60 border border-dash-border/30 rounded-xl px-4 py-3 text-sm text-dash-secondary/70 font-semibold cursor-not-allowed">
            {formatJoinedDate(user?.created_at)}
          </div>
        </div>

        <hr className="border-dash-border/40 my-6" />

        {/* Action buttons */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!hasChanges || isSaving}
            className="px-5 py-2.5 rounded-xl bg-dash-primary hover:bg-dash-hover disabled:bg-dash-primary/20 disabled:text-dash-secondary/50 disabled:border-transparent disabled:cursor-not-allowed text-dash-bg text-xs uppercase font-black tracking-wider shadow-md cursor-pointer transition-all duration-200 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}

/* ========================================================================= */
/* --- 9. SETTINGS VIEW --- */
/* ========================================================================= */
function SettingsView({
  settings,
  setSettings,
  generateApiKey,
  triggerToast,
}: {
  settings: any;
  setSettings: any;
  generateApiKey: () => void;
  triggerToast: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { theme, setTheme } = useTheme();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(settings.apiKey);
    setCopied(true);
    triggerToast("API Key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6 text-left animate-fade-in">
      {/* Appearance */}
      <div className="space-y-3 pb-6 border-b border-dash-border/40">
        <h4 className="text-xs font-black text-dash-text uppercase tracking-wider">Appearance</h4>
        <div className="space-y-2">
          <label className="text-xs font-bold text-dash-secondary">Theme</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => {
                setTheme("dark");
                triggerToast("Dark Mode activated");
              }}
              className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${theme === "dark"
                  ? "border-dash-primary bg-dash-primary/5"
                  : "border-dash-border/60 bg-dash-bg/70 hover:bg-dash-bg"
                }`}
            >
              <div>
                <span className="text-xs font-black text-dash-text block">🌙 Dark Mode</span>
                <span className="text-[10px] text-dash-secondary mt-1 block">Classic dark workspace styling</span>
              </div>
              {theme === "dark" && (
                <div className="w-3.5 h-3.5 bg-dash-primary rounded-full ring-4 ring-dash-primary/20"></div>
              )}
            </div>
            <div
              onClick={() => {
                setTheme("light");
                triggerToast("Light Mode activated");
              }}
              className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${theme === "light"
                  ? "border-dash-primary bg-dash-primary/5"
                  : "border-dash-border/60 bg-dash-bg/70 hover:bg-dash-bg"
                }`}
            >
              <div>
                <span className="text-xs font-black text-dash-text block">☀️ Light Mode</span>
                <span className="text-[10px] text-dash-secondary mt-1 block">Clean light workspace styling</span>
              </div>
              {theme === "light" && (
                <div className="w-3.5 h-3.5 bg-dash-primary rounded-full ring-4 ring-dash-primary/20"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3 pb-6 border-b border-dash-border/40 flex flex-col gap-1.5">
        <label className="text-xs font-black text-dash-text uppercase tracking-wider block">Language Settings</label>
        <select
          value={settings.language}
          onChange={(e) => {
            setSettings({ ...settings, language: e.target.value });
            triggerToast(`Language switched to ${e.target.value}`);
          }}
          className="w-full bg-dash-bg border border-dash-border/60 rounded-xl px-4 py-3 text-sm text-dash-text focus:outline-none focus:border-dash-primary cursor-pointer font-bold"
        >
          <option>English</option>
          <option>Spanish</option>
          <option>German</option>
          <option>French</option>
          <option>Japanese</option>
        </select>
      </div>

      {/* API Key management */}
      <div className="space-y-3 pb-6 border-b border-dash-border/40">
        <h4 className="text-xs font-black text-dash-text uppercase tracking-wider">API Authentication Credentials</h4>
        <p className="text-xs text-dash-secondary font-semibold">Provide this credential block to CLI or SDK deployment environments.</p>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 bg-black/90 font-mono text-xs p-3.5 rounded-xl border border-dash-border/60 text-dash-primary select-all truncate">
            {settings.apiKey}
          </div>
          <button
            onClick={copyToClipboard}
            className="p-3.5 bg-dash-card border border-dash-border/60 hover:border-dash-primary text-dash-secondary hover:text-dash-primary rounded-xl transition-all cursor-pointer"
            title="Copy API Key"
          >
            {copied ? <Check className="w-4 h-4 text-dash-primary" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={generateApiKey}
          className="text-[10px] text-dash-primary font-black uppercase tracking-wider border border-dash-primary/30 bg-dash-primary/5 hover:bg-dash-primary/10 px-4 py-2 rounded-xl transition-all cursor-pointer mt-2"
        >
          Regenerate Key
        </button>
      </div>

      {/* Alert settings */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-dash-text uppercase tracking-wider">Alert Preferences</h4>

        <div className="space-y-3">
          <CheckboxAlertItem
            checked={settings.emailNotif}
            onChange={(checked) => setSettings({ ...settings, emailNotif: checked })}
            title="Email Messages"
            desc="Send audit summary reports and warning alerts to registered email address."
          />
          <CheckboxAlertItem
            checked={settings.slackNotif}
            onChange={(checked) => {
              setSettings({ ...settings, slackNotif: checked });
              if (checked) triggerToast("Integrated Slack Workspace webhook trigger simulated.");
            }}
            title="Slack Webhooks Integration"
            desc="Broadcast task state notifications to company channels."
          />
          <CheckboxAlertItem
            checked={settings.inAppNotif}
            onChange={(checked) => setSettings({ ...settings, inAppNotif: checked })}
            title="In-App Banner Notifications"
            desc="Receive floating alerts while inside workspace dashboard pages."
          />
          <CheckboxAlertItem
            checked={settings.webhookNotif}
            onChange={(checked) => setSettings({ ...settings, webhookNotif: checked })}
            title="HTTP Webhook Alerts"
            desc="Ping remote developer endpoints on verification failure states."
          />
        </div>
      </div>
    </div>
  );
}

// Checkbox helper component
function CheckboxAlertItem({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  desc: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4.5 h-4.5 rounded border-dash-border/60 text-dash-primary focus:ring-0 focus:ring-offset-0 bg-dash-bg cursor-pointer accent-dash-primary mt-0.5"
      />
      <div>
        <span className="text-xs sm:text-sm font-bold text-dash-text block">{title}</span>
        <span className="text-[11px] text-dash-secondary mt-0.5 block leading-normal">{desc}</span>
      </div>
    </label>
  );
}

/* ========================================================================= */
/* --- 10. ORGANIZATION ADMIN DASHBOARD VIEW --- */
/* ========================================================================= */
interface OrgMetrics {
  success_rate: number;
  status_donut: {
    verified: number;
    pending: number;
    failed: number;
  };
  activity_timeline: {
    labels: string[];
    values: number[];
  };
  most_active_member: {
    name: string;
    tasks: number;
  };
}

interface OrgMember {
  id: number;
  fullname: string;
  email: string;
  role: string;
  created_at: string | null;
  task_count: number;
  average_confidence: number;
}

function AdminDashboardView({
  triggerToast,
}: {
  triggerToast: (msg: string) => void;
}) {
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, membersRes, inviteRes] = await Promise.all([
        api.get("/organization/analytics"),
        api.get("/organization/members"),
        api.get("/organization/invite"),
      ]);
      setMetrics(analyticsRes.data);
      setMembers(membersRes.data);
      setInviteCode(inviteRes.data.invite_code);
      setInviteUrl(inviteRes.data.invite_url);
    } catch (err) {
      console.error("Failed to load organization admin details", err);
      triggerToast("Failed to load organization details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRemoveMember = async (memberId: number) => {
    if (confirm("Are you sure you want to remove this member from the organization?")) {
      try {
        await api.post(`/organization/members/${memberId}/remove`);
        triggerToast("Member removed successfully.");
        fetchAdminData(); // reload
      } catch (err) {
        console.error("Failed to remove member", err);
        triggerToast("Failed to remove member.");
      }
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    triggerToast("Invite URL copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 text-left animate-pulse">
        <div className="h-6 bg-dash-card rounded w-1/4"></div>
        <div className="h-4 bg-dash-card rounded w-2/5"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-dash-card rounded-2xl"></div>
          <div className="h-28 bg-dash-card rounded-2xl"></div>
          <div className="h-28 bg-dash-card rounded-2xl"></div>
        </div>
        <div className="h-64 bg-dash-card rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div>
        <h3 className="text-lg font-black text-dash-text leading-tight">Organization Control Panel</h3>
        <p className="text-xs text-dash-secondary mt-1">Manage organization members, track metrics, and generate invite codes.</p>
      </div>

      {/* Top statistics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Members */}
        <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3.5 bg-dash-primary/10 border border-dash-primary/20 text-dash-primary rounded-xl">
            <span className="text-xl">👥</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider block">Total Members</span>
            <span className="text-lg font-black text-dash-text block mt-0.5">{members.length}</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3.5 bg-dash-primary/10 border border-dash-primary/20 text-dash-primary rounded-xl">
            <span className="text-xl">📈</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider block">Scan Success Rate</span>
            <span className="text-lg font-black text-[#10B981] block mt-0.5">{metrics?.success_rate}%</span>
          </div>
        </div>

        {/* Most Active Member */}
        <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-5 shadow-md flex items-center gap-4">
          <div className="p-3.5 bg-dash-primary/10 border border-dash-primary/20 text-dash-primary rounded-xl">
            <span className="text-xl">🏆</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider block">Most Active Member</span>
            <span className="text-xs font-black text-dash-text block mt-0.5 truncate max-w-[150px]">
              {metrics?.most_active_member.name !== "N/A"
                ? `${metrics?.most_active_member.name} (${metrics?.most_active_member.tasks} runs)`
                : "No task runs yet"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Invite links (top/left) and Member list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Members Management Table (8 cols) */}
        <div className="lg:col-span-8 bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-dash-text uppercase tracking-wider">Members Directory</h4>
          <div className="overflow-x-auto rounded-xl border border-dash-border/40">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-dash-border/60 text-[10px] font-bold text-dash-secondary uppercase bg-dash-card/15">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-right">Verification Runs</th>
                  <th className="py-3 px-3 text-right">Avg. Confidence</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-border/30 text-xs text-dash-secondary">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-dash-card/10 text-dash-text font-medium">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-dash-text block">{m.fullname}</span>
                        <span className="text-[10px] text-dash-secondary block font-semibold">{m.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        m.role === "org_admin" ? "bg-dash-primary/10 border border-dash-primary/20 text-dash-primary" : "bg-dash-card border border-dash-border text-dash-secondary"
                      }`}>
                        {m.role === "org_admin" ? "Admin" : "Member"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-white font-bold">{m.task_count}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-dash-primary font-black">
                      {m.average_confidence > 0 ? `${m.average_confidence}%` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {m.role !== "org_admin" ? (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-[10px] text-dash-secondary/50 font-bold italic">Owner</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite link panel (4 cols) */}
        <div className="lg:col-span-4 bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-6 shadow-xl space-y-4 font-sans">
          <h4 className="text-xs font-black text-dash-text uppercase tracking-wider">Invite Members</h4>
          <p className="text-[10px] text-dash-secondary leading-normal font-semibold">
            Share this secure invite URL with coworkers to let them join your organization.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-dash-secondary uppercase tracking-wider">Secure Invite URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 bg-black/40 border border-dash-border/60 rounded-xl px-3 py-2 text-xs text-[#FF8A1F] font-mono select-all focus:outline-none"
                />
                <button
                  onClick={copyInviteLink}
                  className="p-2.5 bg-dash-card border border-dash-border/60 hover:border-dash-primary text-dash-secondary hover:text-dash-primary rounded-xl transition-all cursor-pointer flex-shrink-0"
                  title="Copy Invite URL"
                >
                  {copied ? <Check className="w-4 h-4 text-dash-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-dash-secondary uppercase tracking-wider">Invite Code</label>
              <div className="bg-black/20 border border-dash-border/30 rounded-xl px-4 py-2.5 text-xs text-dash-text font-mono text-center font-black">
                {inviteCode}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
