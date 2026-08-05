import { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  CheckSquare,
  PlayCircle,
  FileText,
  TrendingUp,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClickOutside } from "../../hooks/useClickOutside";

interface SidebarProps {
  activeModule: string;
  setActiveModule: (mod: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  unreadNotificationsCount: number;
  userInitials: string;
  userFullName: string;
  userAvatarUrl?: string | null;
  userRole?: string;
  handleLogout: () => void;
  openDropdown: "notifications" | "profile" | "sidebar-user" | "search" | null;
  setOpenDropdown: (dropdown: "notifications" | "profile" | "sidebar-user" | "search" | null) => void;
}

export default function Sidebar({
  activeModule,
  setActiveModule,
  sidebarOpen,
  setSidebarOpen,
  unreadNotificationsCount,
  userInitials,
  userFullName,
  userAvatarUrl,
  userRole,
  handleLogout,
  openDropdown,
  setOpenDropdown,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarUserRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);

  useClickOutside(sidebarUserRef, () => {
    if (openDropdown === "sidebar-user") setOpenDropdown(null);
  });

  const prevOpenDropdown = useRef(openDropdown);
  useEffect(() => {
    if (prevOpenDropdown.current === "sidebar-user" && openDropdown === null) {
      userTriggerRef.current?.focus();
    }
    prevOpenDropdown.current = openDropdown;
  }, [openDropdown]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "my-tasks", label: "Tasks", icon: <CheckSquare className="w-5 h-5" /> },
    { id: "new-verification", label: "AI Verification", icon: <PlayCircle className="w-5 h-5" /> },
    { id: "reports", label: "Reports", icon: <FileText className="w-5 h-5" /> },
    { id: "analytics", label: "Analytics", icon: <TrendingUp className="w-5 h-5" /> },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  if (userRole === "org_admin") {
    menuItems.splice(1, 0, {
      id: "admin-dashboard",
      label: "Admin Panel",
      icon: <ShieldCheck className="w-5 h-5" />,
    });
  }

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-dash-sidebar border-r border-dash-border relative">
      {/* Collapse Button (desktop only) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute top-7 -right-3.5 z-50 bg-[#0B1120] border border-dash-border hover:border-dash-primary text-dash-secondary hover:text-dash-primary w-7 h-7 rounded-full items-center justify-center transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-pointer"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Brand Header */}
      <div className={`p-6 border-b border-dash-border flex items-center justify-between transition-all duration-300 ${isCollapsed ? "justify-center px-4" : ""}`}>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveModule("dashboard")}>
          {/* Exact Logo from Landing Page Navbar */}
          <div className="bg-gradient-to-br from-[#10B981] to-[#14532D] p-2 rounded-xl shadow-lg shadow-[#10B981]/20 flex-shrink-0">
            <ShieldCheck className="text-white" size={24} />
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-left"
            >
              <h1 className="text-xl font-black text-white tracking-wide leading-none">
                VeriNova
              </h1>
              <span className="text-[9px] font-bold text-dash-secondary tracking-wider block mt-1.5 uppercase">
                OUTCOME VERIFICATION
              </span>
            </motion.div>
          )}
        </div>
        <button
          className="lg:hidden text-dash-secondary hover:text-white cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveModule(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group cursor-pointer relative ${isActive
                  ? "bg-dash-primary/10 text-white border border-dash-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "text-dash-secondary hover:text-white hover:bg-dash-card/40 border border-transparent"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
              title={isCollapsed ? item.label : undefined}
            >
              {/* Left active status indicator line */}
              {isActive && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-dash-primary rounded-r-md shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}

              <div className={`transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-dash-primary" : "text-dash-secondary group-hover:text-dash-primary"}`}>
                {item.icon}
              </div>

              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 text-left"
                >
                  {item.label}
                </motion.span>
              )}

              {item.badge !== undefined && (
                <span className={`flex items-center justify-center font-bold rounded-full ${isCollapsed ? "absolute -top-1.5 -right-1 text-[8px] w-4.5 h-4.5 bg-dash-primary text-dash-bg shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "text-[9px] px-2 py-0.5 bg-dash-primary/15 text-dash-primary"
                  }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer User Account */}
      <div className="p-4 border-t border-dash-border bg-dash-sidebar/40 relative" ref={sidebarUserRef}>
        <button
          ref={userTriggerRef}
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(openDropdown === "sidebar-user" ? null : "sidebar-user");
          }}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-dash-border bg-dash-card/30 hover:bg-dash-card/50 transition-all text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-dash-primary/50 ${isCollapsed ? "justify-center" : ""
            }`}
          aria-haspopup="menu"
          aria-expanded={openDropdown === "sidebar-user"}
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-dash-primary to-dash-hover flex items-center justify-center text-dash-bg font-black text-sm uppercase flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.15)] overflow-hidden">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={userFullName} className="w-full h-full object-cover" />
            ) : (
              userInitials
            )}
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-w-0 flex-1 text-left"
            >
              <p className="text-xs font-black text-white truncate">{userFullName}</p>
              <span className="text-[9px] text-dash-secondary block truncate uppercase tracking-wider font-bold">User</span>
            </motion.div>
          )}
          {!isCollapsed && (
            <ChevronUp className="w-4 h-4 text-dash-secondary flex-shrink-0" />
          )}
        </button>

        {/* Sidebar user popover menu */}
        <AnimatePresence>
          {openDropdown === "sidebar-user" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`absolute bottom-20 bg-dash-sidebar border border-dash-border rounded-xl shadow-2xl z-50 overflow-hidden p-1.5 text-left ${isCollapsed ? "left-2 w-48" : "left-4 right-4"
                }`}
            >
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setActiveModule("profile");
                    setOpenDropdown(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-dash-secondary hover:text-white hover:bg-dash-card/45 rounded-lg cursor-pointer transition-colors text-left"
                >
                  <User className="w-4 h-4 text-dash-secondary" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule("settings");
                    setOpenDropdown(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-dash-secondary hover:text-white hover:bg-dash-card/45 rounded-lg cursor-pointer transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-dash-secondary" />
                  <span>Settings</span>
                </button>
                <hr className="border-dash-border/40 my-1" />
                <button
                  onClick={() => {
                    setOpenDropdown(null);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar & Mobile slide drawer sidebar container */}
      <div className="relative flex-shrink-0">
        {/* Mobile drawer container */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          {sidebarContent}
        </aside>

        {/* Desktop fixed container */}
        <aside
          className={`hidden lg:block h-screen transition-all duration-300 ease-in-out relative ${isCollapsed ? "w-20" : "w-64"
            }`}
        >
          <div className="h-full fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ease-in-out" style={{ width: isCollapsed ? "5rem" : "16rem" }}>
            {sidebarContent}
          </div>
        </aside>
      </div>
    </>
  );
}
