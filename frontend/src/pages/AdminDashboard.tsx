import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import api from "../services/api";
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ShieldCheck,
  Clock,
  Check,
  X,
  Layers
} from "lucide-react";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [chartPeriod, setChartPeriod] = useState("This Year");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Load real-time admin statistics
  const loadData = async () => {
    try {
      const [usersRes, tasksRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/tasks")
      ]);
      setUsers(usersRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error("Failed to load admin dashboard statistics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    toast("Logged out successfully", "success");
  };

  const handleAction = (actionName: string) => {
    toast(`Launched Admin Tool: ${actionName}`, "success");
  };

  // Real Database task approval/rejection
  const handleApprove = async (id: number, name: string) => {
    try {
      await api.put(`/admin/tasks/${id}/status`, { status: "approved" });
      toast(`Approved verification for ${name}`, "success");
      loadData();
    } catch (err) {
      toast("Failed to approve task status", "error");
    }
  };

  const handleReject = async (id: number, name: string) => {
    try {
      await api.put(`/admin/tasks/${id}/status`, { status: "rejected" });
      toast(`Rejected verification for ${name}`, "error");
      loadData();
    } catch (err) {
      toast("Failed to reject task status", "error");
    }
  };

  // Mock Notifications for Admin
  const notifications = [
    { id: 1, text: "Platform connection established.", time: "Just now", unread: true },
  ];

  // User Map to map tasks to actual registered users' names
  const userMap = new Map(users.map((u: any) => [u.id, u.fullname]));

  // Stats computations from database records
  const totalUsers = users.filter((u: any) => u.role === "user").length;
  const totalVerifications = tasks.length;
  const activeProducts = 0; // Backend does not support product tables
  const pendingOrders = 0; // Backend does not support order tables

  // Filter tasks that are pending review
  const pendingTasks = tasks.filter((t) => 
    ["pending", "received", "executing", "verifying", "in_progress"].includes(t.status)
  );

  // Group task volume by month for SVG Chart
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

  // Filter requests based on search
  const filteredPending = pendingTasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.task_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (userMap.get(t.user_id) || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-dashboard">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="admin-logo-mark">
            <ShieldCheck size={22} className="admin-logo-icon" />
          </div>
          <div>
            <h2>VeriNova AI</h2>
            <span>Admin Center</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button className="admin-nav-item active">
            <Layers size={18} />
            <span>Overview</span>
          </button>

          <button className="admin-nav-item" onClick={() => handleAction("User Management")}>
            <Users size={18} />
            <span>Users</span>
          </button>

          <button className="admin-nav-item" onClick={() => handleAction("Verification Requests Queue")}>
            <CheckCircle2 size={18} />
            <span>Verifications</span>
          </button>

          <button className="admin-nav-item" onClick={() => handleAction("Product Inventory")}>
            <Package size={18} />
            <span>Products</span>
          </button>

          <button className="admin-nav-item" onClick={() => handleAction("Orders database")}>
            <ShoppingCart size={18} />
            <span>Orders</span>
          </button>

          <button className="admin-nav-item" onClick={() => handleAction("Settings panel")}>
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <button className="admin-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="header-welcome">
            <h1>Admin Control Panel 👑</h1>
            <p className="admin-subtitle">
              Monitor and manage the VeriNova platform statistics:
            </p>
          </div>

          <div className="header-actions">
            {/* Search Input */}
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
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
                    <h3>System Alerts</h3>
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

            {/* Admin Profile Chip */}
            <div className="profile-chip-wrapper">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="profile-chip">
                <div className="admin-avatar-placeholder">A</div>
                <div className="profile-info">
                  <strong>{user.fullname}</strong>
                  <span className="admin-role-span">Administrator</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {showProfileMenu && (
                <div className="profile-menu glass-panel">
                  <div className="menu-item" onClick={() => handleAction("Admin Profile")}>
                    <ShieldCheck size={14} />
                    <span>My Profile</span>
                  </div>
                  <div className="menu-item" onClick={() => handleAction("System Configuration")}>
                    <Settings size={14} />
                    <span>System Settings</span>
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
              <Users size={20} />
            </div>
            <div className="stat-details">
              <span>Total Users</span>
              <strong>{totalUsers}</strong>
              <small>All time</small>
            </div>
          </div>

          <div className="stat-card green-theme">
            <div className="stat-icon-wrapper">
              <CheckCircle2 size={20} />
            </div>
            <div className="stat-details">
              <span>Verifications</span>
              <strong>{totalVerifications}</strong>
              <small>This month</small>
            </div>
          </div>

          <div className="stat-card orange-theme">
            <div className="stat-icon-wrapper">
              <Package size={20} />
            </div>
            <div className="stat-details">
              <span>Products Listed</span>
              <strong>{activeProducts}</strong>
              <small>Active</small>
            </div>
          </div>

          <div className="stat-card red-theme">
            <div className="stat-icon-wrapper">
              <ShoppingCart size={20} />
            </div>
            <div className="stat-details">
              <span>Platform Orders</span>
              <strong>{pendingOrders}</strong>
              <small>Pending</small>
            </div>
          </div>
        </section>

        {/* =====================================================
            MIDDLE ROW: CHART & PENDING REQUESTS
        ===================================================== */}
        <div className="dashboard-grid-two-cols">
          {/* Chart Card */}
          <section className="dashboard-panel chart-panel">
            <div className="panel-header">
              <h2>User Signup & Volume</h2>
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
                <text x="30" y="45" fill="var(--dash-secondary)" fontSize="10">{maxCount}</text>
                <text x="30" y="90" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.75)}</text>
                <text x="30" y="135" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.5)}</text>
                <text x="30" y="180" fill="var(--dash-secondary)" fontSize="10">{Math.round(maxCount * 0.25)}</text>
                <text x="30" y="224" fill="var(--dash-secondary)" fontSize="10">0</text>

                {/* Area Gradient Fill */}
                {fillPath && <path d={fillPath} fill="url(#chartGlow)" />}

                {/* Line Path */}
                {path && <path d={path} fill="none" stroke="#ff6b00" strokeWidth="3" strokeLinecap="round" />}

                {/* Markers */}
                {points.map((pt, idx) => (
                  <g key={idx} className="chart-marker-group">
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#ff6b00" strokeWidth="2.5" />
                    <text x={pt.x} y="238" fill="var(--dash-secondary)" fontSize="10" textAnchor="middle">{pt.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </section>

          {/* Pending Verifications Queue */}
          <section className="dashboard-panel activity-panel">
            <div className="panel-header">
              <h2>Pending Approvals</h2>
            </div>

            {loading ? (
              <div className="loading-state">Loading approvals queue...</div>
            ) : filteredPending.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>All Clear!</h3>
                <p>No pending verification requests require approval.</p>
              </div>
            ) : (
              <div className="activity-list">
                {filteredPending.slice(0, 4).map((req) => {
                  const applicantName = userMap.get(req.user_id) || "Anonymous User";
                  return (
                    <div key={req.id} className="activity-item admin-queue-item">
                      <div className="activity-icon orange-bg">
                        <Clock size={16} />
                      </div>
                      <div className="activity-details">
                        <h4>{applicantName}</h4>
                        <span className="req-type-span">{req.title} ({req.task_type.toUpperCase()})</span>
                        <span className="status-pill pending">{req.status}</span>
                      </div>

                      <div className="action-buttons-cell">
                        <button
                          onClick={() => handleApprove(req.id, applicantName)}
                          className="circle-action-btn approve"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleReject(req.id, applicantName)}
                          className="circle-action-btn reject"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredPending.length > 4 && (
              <button onClick={() => handleAction("Verifications List Dashboard")} className="view-all-link">
                View All Pending Requests
              </button>
            )}
          </section>
        </div>

        {/* =====================================================
            BOTTOM ROW: SYSTEM CONTROLS & SECURITY NOTICE
        ===================================================== */}
        <div className="dashboard-grid-two-cols bottom-row">
          {/* Quick Management Links */}
          <section className="dashboard-panel quick-actions-panel">
            <div className="panel-header">
              <h2>Management Modules</h2>
            </div>

            <div className="actions-grid-2x2">
              <button className="action-button-card" onClick={() => handleAction("User database profiles")}>
                <div className="action-icon purple-bg">
                  <Users size={18} />
                </div>
                <div className="action-text">
                  <h3>User Management</h3>
                  <p>Create, update or block accounts</p>
                </div>
              </button>

              <button className="action-button-card" onClick={() => handleAction("Verification guidelines")}>
                <div className="action-icon blue-bg">
                  <CheckCircle2 size={18} />
                </div>
                <div className="action-text">
                  <h3>Trust System</h3>
                  <p>Configure verifiers and rules</p>
                </div>
              </button>

              <button className="action-button-card" onClick={() => handleAction("Products catalogs")}>
                <div className="action-icon orange-bg">
                  <Package size={18} />
                </div>
                <div className="action-text">
                  <h3>Marketplace Control</h3>
                  <p>Manage product listing claims</p>
                </div>
              </button>

              <button className="action-button-card" onClick={() => handleAction("System log auditor")}>
                <div className="action-icon red-bg">
                  <ShieldAlert size={18} />
                </div>
                <div className="action-text">
                  <h3>Security Auditor</h3>
                  <p>View administrative actions log</p>
                </div>
              </button>
            </div>
          </section>

          {/* Security Banner Card */}
          <section className="dashboard-panel verification-status-card admin-security-banner">
            <div className="status-card-inner">
              <div className="status-badge-wrapper">
                <span className="card-label">System Notice</span>
                <span className="verification-badge-pill green">Active</span>
              </div>
              
              <h2>VeriNova Platform Operational</h2>
              <p>Platform services are currently online. Database and caching services are working normally.</p>
              
              <div className="status-badge-shield">
                <ShieldAlert size={72} />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* =====================================================
          STYLES (Match UserDashboard UI precisely)
      ===================================================== */}
      <style>{`
        .admin-dashboard {
          min-height: 100vh;
          display: flex;
          background: var(--dash-bg);
          color: var(--dash-text);
          font-family: 'Inter', system-ui, sans-serif;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Sidebar Styling */
        .admin-sidebar {
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

        .admin-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 10px 35px;
        }

        .admin-logo-mark {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #FF6B00 0%, #FF8A1F 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.2);
        }

        .admin-logo-icon {
          color: white;
        }

        .admin-logo h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: var(--dash-text);
          letter-spacing: -0.5px;
        }

        .admin-logo span {
          font-size: 11px;
          color: var(--dash-secondary);
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .admin-nav-item {
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

        .admin-nav-item:hover {
          background: rgba(255, 107, 0, 0.04);
          color: var(--dash-primary);
        }

        .admin-nav-item.active {
          background: rgba(255, 107, 0, 0.08);
          color: var(--dash-primary);
        }

        .admin-logout {
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

        .admin-logout:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #ef4444;
        }

        /* Main Content Container */
        .admin-main {
          margin-left: 260px;
          width: calc(100% - 260px);
          padding: 35px 40px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        /* Header block */
        .admin-header {
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

        .admin-subtitle {
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
        .theme-toggle-btn,
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

        .theme-toggle-btn:hover,
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

        .admin-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #ff6b00;
          color: white;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
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

        .admin-role-span {
          font-size: 10px;
          color: var(--dash-primary);
          font-weight: 700;
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

        /* Distinct Colors for Cards */
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

        /* Queue / Activity List Panel */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid var(--dash-border);
          background: var(--dash-card);
          transition: all 0.2s ease;
        }

        .activity-item:hover {
          border-color: var(--dash-primary);
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orange-bg { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .red-bg { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .purple-bg { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        .blue-bg { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .green-bg { background: rgba(16, 185, 129, 0.1); color: #10b981; }

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
          font-size: 9px;
          font-weight: 700;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: 10px;
          width: fit-content;
        }

        .status-pill.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-pill.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-pill.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        /* Approval queue action buttons */
        .action-buttons-cell {
          display: flex;
          gap: 6px;
        }

        .circle-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .circle-action-btn.approve {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .circle-action-btn.approve:hover {
          background: #10b981;
          color: white;
        }

        .circle-action-btn.reject {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .circle-action-btn.reject:hover {
          background: #ef4444;
          color: white;
        }

        .action-completed-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--dash-secondary);
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
          background: #10b981;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .verification-badge-pill.green {
          background: #10b981;
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

        .empty-state {
          text-align: center;
          padding: 30px 10px;
          color: var(--dash-secondary);
        }

        .empty-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 12px;
          border-radius: 50%;
          background: rgba(255, 107, 0, 0.08);
          color: var(--dash-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
        }

        .empty-state p {
          margin: 4px 0 0;
          font-size: 12px;
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
          .admin-sidebar {
            display: none;
          }

          .admin-main {
            margin-left: 0;
            width: 100%;
            padding: 20px;
          }

          .admin-header {
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