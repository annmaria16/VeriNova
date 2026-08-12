import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import api from "../services/api";
import {
  LayoutDashboard,
  CheckCircle2,
  FileText,
  Activity,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Clock,
  UploadCloud,
  Briefcase,
  Layers,
  Check,
  X
} from "lucide-react";

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [chartPeriod, setChartPeriod] = useState("This Year");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Fetch tasks/verifications from backend API
  const fetchTasks = async () => {
    try {
      const response = await api.get("/tasks");
      setTasks(response.data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    toast("Logged out successfully", "success");
  };

  const handleQuickAction = (actionName: string) => {
    toast(`Launched: ${actionName}`, "success");
  };

  // Create real task/verification
  const handleStartVerification = async () => {
    const title = prompt("Enter verification request title (e.g. Passport ID Verification):");
    if (!title) return;
    const type = prompt("Enter task type (e.g. Identity, Business, Document):") || "Identity";
    const description = prompt("Enter verification details (optional):") || "";

    try {
      await api.post("/tasks", {
        title,
        description,
        task_type: type
      });
      toast("Verification request submitted successfully!", "success");
      fetchTasks();
    } catch (err) {
      toast("Failed to submit verification request", "error");
    }
  };

  // Mock Notifications
  const notifications = [
    { id: 1, text: "Your verification history is loaded.", time: "Just now", unread: true },
  ];

  // Stats computations based on real API data
  const totalVerifications = tasks.length;
  const completedVerifications = tasks.filter((t) => t.status === "completed" || t.status === "approved").length;
  const inProgressVerifications = tasks.filter((t) => ["pending", "received", "executing", "verifying", "in_progress"].includes(t.status)).length;
  const rejectedVerifications = tasks.filter((t) => t.status === "failed" || t.status === "rejected").length;

  // Monthly breakdown for SVG Area Chart from real tasks
  const monthlyCounts = Array(12).fill(0);
  tasks.forEach((t) => {
    const date = new Date(t.created_at);
    if (!isNaN(date.getTime())) {
      monthlyCounts[date.getMonth()] += 1;
    }
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const maxCount = Math.max(...monthlyCounts.slice(0, 8), 1);
  
  const points = months.map((month, idx) => {
    const count = monthlyCounts[idx];
    // Map count to SVG height (range y: 40 to 220, where 220 is count=0, 40 is max count)
    const y = 220 - (count / maxCount) * 160;
    const x = 50 + idx * 85;
    return { x, y, label: month, value: count };
  });

  let path = "";
  let fillPath = "";
  if (points.length > 0) {
    path = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach((pt) => {
      path += ` L ${pt.x} ${pt.y}`;
    });
    fillPath = `${path} L ${points[points.length - 1].x} 220 L ${points[0].x} 220 Z`;
  }

  // Account verification status badge logic
  const hasCompleted = tasks.some(t => t.status === "completed" || t.status === "approved");
  const hasPending = tasks.some(t => ["pending", "received", "executing", "verifying", "in_progress"].includes(t.status));

  let statusBadge = "Unverified";
  let statusText = "Your account is not verified yet.";
  let statusDesc = "Please submit your first verification request to activate verification features.";
  let statusBadgeClass = "unverified-pill";

  if (hasCompleted) {
    statusBadge = "Verified";
    statusText = "Your account is fully verified.";
    statusDesc = "Thank you for being a trusted user on the VeriNova platform.";
    statusBadgeClass = "verified-pill";
  } else if (hasPending) {
    statusBadge = "Pending";
    statusText = "Verification is in progress.";
    statusDesc = "Our agents are currently verifying your submitted documents.";
    statusBadgeClass = "pending-pill";
  }

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.task_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="user-dashboard">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <span className="logo-mark">V</span>
          <div>
            <h2>VeriNova</h2>
            <span>User Portal</span>
          </div>
        </div>

        <nav className="dashboard-nav">
          <button className="nav-item active">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

          <button className="nav-item" onClick={() => handleQuickAction("Verifications List")}>
            <CheckCircle2 size={18} />
            <span>Verifications</span>
          </button>

          <button className="nav-item" onClick={() => handleQuickAction("My Documents")}>
            <FileText size={18} />
            <span>My Documents</span>
          </button>

          <button className="nav-item" onClick={() => handleQuickAction("Activity logs")}>
            <Activity size={18} />
            <span>Activity</span>
          </button>

          <button className="nav-item" onClick={() => handleQuickAction("Profile details")}>
            <User size={18} />
            <span>Profile</span>
          </button>

          <button className="nav-item" onClick={() => handleQuickAction("Settings panel")}>
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button className="nav-item" onClick={() => handleQuickAction("Help Center")}>
            <HelpCircle size={18} />
            <span>Help & Support</span>
          </button>
        </nav>

        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-welcome">
            <h1>Welcome back, {user.fullname.split(" ")[0]}! 👋</h1>
            <p className="dashboard-subtitle">
              Here's what's happening with your verifications today:
            </p>
          </div>

          <div className="header-actions">
            {/* Search Input */}
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search verifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="header-action-btn" aria-label="Toggle Theme">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notification Bell */}
            <div className="notification-wrapper">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="header-action-btn"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {notifications.length > 0 && <span className="notification-badge"></span>}
              </button>

              {showNotifications && (
                <div className="notifications-dropdown glass-panel">
                  <div className="dropdown-header">
                    <h3>Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="close-btn"><X size={14} /></button>
                  </div>
                  <div className="dropdown-body">
                    {notifications.map((n) => (
                      <div key={n.id} className="notification-item unread">
                        <p>{n.text}</p>
                        <span>{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Chip */}
            <div className="profile-chip-wrapper">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="profile-chip">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.fullname} className="profile-avatar" />
                ) : (
                  <div className="profile-avatar profile-placeholder">
                    {user.fullname.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="profile-info">
                  <strong>{user.fullname}</strong>
                  <span>{user.role}</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {showProfileMenu && (
                <div className="profile-menu glass-panel">
                  <div className="menu-item" onClick={() => handleQuickAction("My Profile")}>
                    <User size={14} />
                    <span>My Profile</span>
                  </div>
                  <div className="menu-item" onClick={() => handleQuickAction("Account Settings")}>
                    <Settings size={14} />
                    <span>Settings</span>
                  </div>
                  <hr className="menu-divider" />
                  <div className="menu-item logout" onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =====================================================
            STATS ROW
        ===================================================== */}
        <section className="stats-row">
          <div className="stat-card purple-theme">
            <div className="stat-icon-wrapper">
              <Layers size={20} />
            </div>
            <div className="stat-details">
              <span>Total Verifications</span>
              <strong>{totalVerifications}</strong>
              <small>All time</small>
            </div>
          </div>

          <div className="stat-card green-theme">
            <div className="stat-icon-wrapper">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-details">
              <span>Completed</span>
              <strong>{completedVerifications}</strong>
              <small>This month</small>
            </div>
          </div>

          <div className="stat-card orange-theme">
            <div className="stat-icon-wrapper">
              <Clock size={20} />
            </div>
            <div className="stat-details">
              <span>In Progress</span>
              <strong>{inProgressVerifications}</strong>
              <small>Pending</small>
            </div>
          </div>

          <div className="stat-card red-theme">
            <div className="stat-icon-wrapper">
              <AlertTriangle size={20} />
            </div>
            <div className="stat-details">
              <span>Rejected</span>
              <strong>{rejectedVerifications}</strong>
              <small>This month</small>
            </div>
          </div>
        </section>

        {/* =====================================================
            MIDDLE ROW: CHART & ACTIVITY
        ===================================================== */}
        <div className="dashboard-grid-two-cols">
          {/* Chart Card */}
          <section className="dashboard-panel chart-panel">
            <div className="panel-header">
              <h2>Verification Progress</h2>
              <div className="select-wrapper">
                <select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}>
                  <option value="This Year">This Year</option>
                </select>
                <ChevronDown size={14} />
              </div>
            </div>

            <div className="chart-container">
              <svg viewBox="0 0 700 240" className="verification-svg-chart">
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255, 107, 0, 0.24)" />
                    <stop offset="100%" stopColor="rgba(255, 107, 0, 0.0)" />
                  </linearGradient>
                </defs>

                {/* Y-axis gridlines */}
                <line x1="50" y1="40" x2="650" y2="40" stroke="var(--dash-border)" strokeDasharray="4 4" />
                <line x1="50" y1="85" x2="650" y2="85" stroke="var(--dash-border)" strokeDasharray="4 4" />
                <line x1="50" y1="130" x2="650" y2="130" stroke="var(--dash-border)" strokeDasharray="4 4" />
                <line x1="50" y1="175" x2="650" y2="175" stroke="var(--dash-border)" strokeDasharray="4 4" />
                <line x1="50" y1="220" x2="650" y2="220" stroke="var(--dash-border)" />

                {/* Y-axis Labels */}
                <text x="35" y="45" fill="var(--dash-secondary)" fontSize="10">{maxCount}</text>
                <text x="35" y="90" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.75)}</text>
                <text x="35" y="135" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.5)}</text>
                <text x="35" y="180" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.25)}</text>
                <text x="35" y="224" fill="var(--dash-secondary)" fontSize="10">0</text>

                {/* Area Gradient Fill */}
                {fillPath && <path d={fillPath} fill="url(#chartGlow)" />}

                {/* Line Path */}
                {path && <path d={path} fill="none" stroke="#ff6b00" strokeWidth="3" strokeLinecap="round" />}

                {/* Markers & Interaction Points */}
                {points.map((pt, idx) => (
                  <g key={idx} className="chart-marker-group">
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#ff6b00" strokeWidth="2.5" />
                    <text x={pt.x} y="238" fill="var(--dash-secondary)" fontSize="10" textAnchor="middle">{pt.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </section>

          {/* Recent Activity Card */}
          <section className="dashboard-panel activity-panel">
            <div className="panel-header">
              <h2>Recent Activity</h2>
            </div>

            {loading ? (
              <div className="loading-state">Loading activities...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>No activity yet</h3>
                <p>Start your first verification to see activity here.</p>
                <button onClick={handleStartVerification} className="view-all-link">
                  Start Verification
                </button>
              </div>
            ) : (
              <div className="activity-list">
                {filteredTasks.slice(0, 4).map((t) => {
                  const typeLabel = t.task_type.toUpperCase();
                  const isCompleted = t.status === "completed" || t.status === "approved";
                  const isRejected = t.status === "failed" || t.status === "rejected";
                  
                  let iconClass = "purple-bg";
                  let statusClass = "pending";
                  if (isCompleted) {
                    iconClass = "green-bg";
                    statusClass = "completed";
                  } else if (isRejected) {
                    iconClass = "red-bg";
                    statusClass = "rejected";
                  }

                  return (
                    <div key={t.id} className="activity-item" onClick={() => handleQuickAction(`Details of: ${t.title}`)}>
                      <div className={`activity-icon ${iconClass}`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : isRejected ? <AlertTriangle size={16} /> : <Clock size={16} />}
                      </div>
                      <div className="activity-details">
                        <h4>{t.title}</h4>
                        <span className="req-type-span">{typeLabel}</span>
                        <span className={`status-pill ${statusClass}`}>{t.status}</span>
                      </div>
                      <span className="activity-time">
                        {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredTasks.length > 4 && (
              <button onClick={() => handleQuickAction("All activity history")} className="view-all-link">
                View All
              </button>
            )}
          </section>
        </div>

        {/* =====================================================
            BOTTOM ROW: QUICK ACTIONS & STATUS
        ===================================================== */}
        <div className="dashboard-grid-two-cols bottom-row">
          {/* Quick Actions Grid */}
          <section className="dashboard-panel quick-actions-panel">
            <div className="panel-header">
              <h2>Quick Actions</h2>
            </div>

            <div className="actions-grid-2x2">
              <button className="action-button-card" onClick={handleStartVerification}>
                <div className="action-icon purple-bg">
                  <CheckCircle2 size={18} />
                </div>
                <div className="action-text">
                  <h3>Start Verification</h3>
                  <p>Verify a new document</p>
                </div>
              </button>

              <button className="action-button-card" onClick={() => handleQuickAction("Document Upload Area")}>
                <div className="action-icon blue-bg">
                  <UploadCloud size={18} />
                </div>
                <div className="action-text">
                  <h3>Upload Document</h3>
                  <p>Upload supporting docs</p>
                </div>
              </button>

              <button className="action-button-card" onClick={() => handleQuickAction("Business Registration verification")}>
                <div className="action-icon orange-bg">
                  <Briefcase size={18} />
                </div>
                <div className="action-text">
                  <h3>Verify Business</h3>
                  <p>Verify your business</p>
                </div>
              </button>

              <button className="action-button-card" onClick={() => handleQuickAction("Verifications database view")}>
                <div className="action-icon green-bg">
                  <Layers size={18} />
                </div>
                <div className="action-text">
                  <h3>View All</h3>
                  <p>See all verifications</p>
                </div>
              </button>
            </div>
          </section>

          {/* Verification Status Card */}
          <section className="dashboard-panel verification-status-card">
            <div className="status-card-inner">
              <div className="status-badge-wrapper">
                <span className="card-label">Your Verification Status</span>
                <span className={`verification-badge-pill ${statusBadgeClass}`}>{statusBadge}</span>
              </div>
              
              <h2>{statusText}</h2>
              <p>{statusDesc}</p>
              
              <div className="status-badge-shield">
                <ShieldCheck size={72} />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================
          STYLES (Match Reference UI & Landing Page Colors)
      ===================================================== */}
      <style>{`
        .user-dashboard {
          min-height: 100vh;
          display: flex;
          background: var(--dash-bg);
          color: var(--dash-text);
          font-family: 'Inter', system-ui, sans-serif;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Sidebar Styling */
        .dashboard-sidebar {
          width: 260px;
          min-height: 100vh;
          background: var(--dash-sidebar);
          color: var(--dash-text);
          display: flex;
          flex-direction: column;
          padding: 30px 20px;
          box-sizing: border-box;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          border-right: 1px solid var(--dash-border);
          transition: background-color 0.3s ease, border-color 0.3s ease;
          z-index: 20;
        }

        .dashboard-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 10px 35px;
        }

        .logo-mark {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #ff6b00;
          color: white;
          font-size: 22px;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.2);
        }

        .dashboard-logo h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: var(--dash-text);
          letter-spacing: -0.5px;
        }

        .dashboard-logo span {
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .dashboard-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nav-item {
          border: none;
          background: transparent;
          color: var(--dash-secondary);
          text-align: left;
          padding: 12px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          background: rgba(255, 107, 0, 0.04);
          color: var(--dash-primary);
        }

        .nav-item.active {
          background: rgba(255, 107, 0, 0.08);
          color: var(--dash-primary);
        }

        .logout-button {
          margin-top: auto;
          border: none;
          background: transparent;
          color: var(--dash-secondary);
          padding: 12px 14px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          gap: 14px;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .logout-button:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }

        /* Main Content Container */
        .dashboard-main {
          margin-left: 260px;
          width: calc(100% - 260px);
          padding: 35px 40px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        /* Header block */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
        }

        .header-welcome h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: var(--dash-text);
        }

        .dashboard-subtitle {
          margin: 6px 0 0;
          color: var(--dash-secondary);
          font-size: 14px;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Search input container */
        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--dash-secondary);
          pointer-events: none;
        }

        .search-container input {
          width: 220px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 12px;
          padding: 10px 14px 10px 40px;
          font-size: 13.5px;
          color: var(--dash-text);
          font-weight: 500;
          transition: all 0.2s ease;
          outline: none;
        }

        .search-container input:focus {
          border-color: var(--dash-primary);
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);
        }

        /* Action Buttons */
        .header-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          color: var(--dash-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-action-btn:hover {
          border-color: var(--dash-primary);
          color: var(--dash-primary);
          background: rgba(255, 107, 0, 0.04);
        }

        /* Notifications Panel */
        .notification-wrapper {
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 7px;
          height: 7px;
          background: #ff6b00;
          border-radius: 50%;
        }

        .notifications-dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          width: 280px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          box-shadow: var(--shadow-md);
          z-index: 30;
          overflow: hidden;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--dash-border);
        }

        .dropdown-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
        }

        .close-btn {
          border: none;
          background: transparent;
          color: var(--dash-secondary);
          cursor: pointer;
        }

        .dropdown-body {
          max-height: 240px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 12px 18px;
          border-bottom: 1px solid var(--dash-border);
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .notification-item:hover {
          background: rgba(255, 107, 0, 0.02);
        }

        .notification-item.unread {
          background: rgba(255, 107, 0, 0.04);
        }

        .notification-item p {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
        }

        .notification-item span {
          display: block;
          font-size: 10px;
          color: var(--dash-muted);
          margin-top: 4px;
        }

        /* Profile Menu Chip */
        .profile-chip-wrapper {
          position: relative;
        }

        .profile-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          padding: 6px 14px 6px 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }

        .profile-chip:hover {
          border-color: var(--dash-primary);
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          object-fit: cover;
        }

        .profile-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ff6b00;
          color: white;
          font-weight: 800;
          font-size: 14px;
        }

        .profile-info {
          text-align: left;
          display: flex;
          flex-direction: column;
        }

        .profile-info strong {
          font-size: 12.5px;
          color: var(--dash-text);
          font-weight: 700;
          line-height: 1.2;
        }

        .profile-info span {
          font-size: 10px;
          color: var(--dash-secondary);
          font-weight: 600;
          text-transform: capitalize;
          margin-top: 1px;
        }

        .profile-menu {
          position: absolute;
          top: 54px;
          right: 0;
          width: 170px;
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          box-shadow: var(--shadow-md);
          padding: 6px;
          z-index: 30;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--dash-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .menu-item:hover {
          background: rgba(255, 107, 0, 0.05);
          color: var(--dash-primary);
        }

        .menu-item.logout:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }

        .menu-divider {
          border: 0;
          border-top: 1px solid var(--dash-border);
          margin: 6px 0;
        }

        /* Stats Cards Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .stat-card {
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .stat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-details {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .stat-details span {
          font-size: 12px;
          font-weight: 700;
          color: var(--dash-secondary);
        }

        .stat-details strong {
          font-size: 24px;
          font-weight: 800;
          color: var(--dash-text);
          margin-top: 2px;
          line-height: 1;
        }

        .stat-details small {
          font-size: 11px;
          color: var(--dash-muted);
          font-weight: 600;
          margin-top: 4px;
        }

        /* Distinct Colors for Cards matching the reference image */
        .purple-theme .stat-icon-wrapper {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .green-theme .stat-icon-wrapper {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .orange-theme .stat-icon-wrapper {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }
        .red-theme .stat-icon-wrapper {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        /* Responsive Grids */
        .dashboard-grid-two-cols {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .dashboard-panel {
          background: var(--dash-card);
          border: 1px solid var(--dash-border);
          border-radius: 18px;
          padding: 24px;
          box-sizing: border-box;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.2px;
          color: var(--dash-text);
        }

        /* Select Wrapper Style */
        .select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-wrapper select {
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          color: var(--dash-secondary);
          padding: 6px 30px 6px 12px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          appearance: none;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .select-wrapper select:focus {
          border-color: var(--dash-primary);
        }

        .select-wrapper svg {
          position: absolute;
          right: 10px;
          pointer-events: none;
          color: var(--dash-secondary);
        }

        /* Chart container styling */
        .chart-container {
          margin-top: 10px;
          width: 100%;
        }

        .verification-svg-chart {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        /* Activity List Panel */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 8px;
          border-radius: 10px;
          transition: background 0.2s ease;
        }

        .activity-item:hover {
          background: rgba(255, 107, 0, 0.03);
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .green-bg { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .orange-bg { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .red-bg { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .purple-bg { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .blue-bg { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

        .activity-details {
          flex-grow: 1;
          text-align: left;
          display: flex;
          flex-direction: column;
        }

        .activity-details h4 {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: var(--dash-text);
        }

        .req-type-span {
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 600;
          margin-top: 2px;
        }

        .status-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          margin-top: 3px;
          text-transform: capitalize;
        }

        .status-pill.completed { color: #10b981; }
        .status-pill.pending { color: #f59e0b; }
        .status-pill.rejected { color: #ef4444; }

        .activity-time {
          font-size: 11px;
          color: var(--dash-muted);
          font-weight: 600;
        }

        .view-all-link {
          border: none;
          background: transparent;
          color: var(--dash-primary);
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          padding: 0;
          margin-top: 18px;
          display: inline-block;
          width: fit-content;
        }

        .view-all-link:hover {
          color: var(--dash-hover);
          text-decoration: underline;
        }

        /* Bottom Row Column Panels */
        .actions-grid-2x2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .action-button-card {
          text-align: left;
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          color: var(--dash-text);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.15s ease;
          outline: none;
        }

        .action-button-card:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
          border-color: var(--dash-primary);
        }

        .action-text h3 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--dash-text);
        }

        .action-text p {
          margin: 2px 0 0;
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 500;
        }

        /* Verification Status Card styling */
        .verification-status-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(255, 107, 0, 0.06) 0%, rgba(255, 138, 31, 0.01) 100%);
          border-color: rgba(255, 107, 0, 0.15);
        }

        html:not(.light) .verification-status-card {
          background: linear-gradient(135deg, rgba(255, 107, 0, 0.12) 0%, rgba(255, 138, 31, 0.02) 100%);
          border-color: rgba(255, 107, 0, 0.25);
        }

        .status-card-inner {
          display: flex;
          flex-direction: column;
          text-align: left;
          position: relative;
          z-index: 2;
          height: 100%;
        }

        .status-badge-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .card-label {
          color: var(--dash-primary);
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .verification-badge-pill {
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .verification-badge-pill.verified-pill {
          background: #10b981;
        }
        .verification-badge-pill.pending-pill {
          background: #f59e0b;
        }
        .verification-badge-pill.unverified-pill {
          background: #ef4444;
        }

        .status-card-inner h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: var(--dash-text);
        }

        .status-card-inner p {
          margin: 6px 0 0;
          font-size: 12px;
          color: var(--dash-secondary);
          line-height: 1.5;
          font-weight: 500;
          max-width: 80%;
        }

        .status-badge-shield {
          position: absolute;
          bottom: -15px;
          right: -10px;
          color: #ff6b00;
          opacity: 0.2;
          transform: rotate(15deg);
        }

        .loading-state {
          padding: 40px;
          text-align: center;
          color: var(--dash-secondary);
          font-weight: 600;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-grid-two-cols {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-sidebar {
            display: none;
          }

          .dashboard-main {
            margin-left: 0;
            width: 100%;
            padding: 20px;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .search-container {
            flex-grow: 1;
          }

          .search-container input {
            width: 100%;
          }

          .stats-row {
            grid-template-columns: 1fr;
          }

          .actions-grid-2x2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}