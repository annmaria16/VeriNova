import { useRef, useEffect } from "react";
import { Search, Bell, Menu, Sun, Moon, User, Settings, LogOut, CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";
import { useClickOutside } from "../../hooks/useClickOutside";

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

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  timestamp: string;
  read: boolean;
}

interface NavbarProps {
  userFullName: string;
  userEmail: string;
  userInitials: string;
  userAvatarUrl?: string | null;
  activeModule: string;
  setActiveModule: (mod: string) => void;
  setSidebarOpen: (open: boolean) => void;
  handleLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearchDropdown: boolean;
  tasks: Task[];
  notifications: SystemNotification[];
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
  clearNotification: (id: string) => void;
  openDropdown: "notifications" | "profile" | "sidebar-user" | "search" | null;
  setOpenDropdown: (dropdown: "notifications" | "profile" | "sidebar-user" | "search" | null) => void;
}

export default function Navbar({
  userFullName,
  userEmail,
  userInitials,
  userAvatarUrl,
  setActiveModule,
  setSidebarOpen,
  handleLogout,
  searchQuery,
  setSearchQuery,
  showSearchDropdown,
  tasks,
  notifications,
  markNotifRead,
  markAllNotifsRead,
  openDropdown,
  setOpenDropdown,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  useClickOutside(searchRef, () => {
    if (openDropdown === "search") setOpenDropdown(null);
  });
  useClickOutside(notifRef, () => {
    if (openDropdown === "notifications") setOpenDropdown(null);
  });
  useClickOutside(profileRef, () => {
    if (openDropdown === "profile") setOpenDropdown(null);
  });

  const prevOpenDropdown = useRef(openDropdown);
  useEffect(() => {
    if (prevOpenDropdown.current === "notifications" && openDropdown === null) {
      notifTriggerRef.current?.focus();
    } else if (prevOpenDropdown.current === "profile" && openDropdown === null) {
      profileTriggerRef.current?.focus();
    }
    prevOpenDropdown.current = openDropdown;
  }, [openDropdown]);

  const notifDropdownOpen = openDropdown === "notifications";
  const profileDropdownOpen = openDropdown === "profile";

  // Search filter
  const filteredSearchTasks = searchQuery.trim()
    ? tasks.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const unreadNotifs = notifications.filter((n) => !n.read);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-dash-bg/85 backdrop-blur-md border-b border-dash-border py-4.5 px-6 lg:px-8 flex items-center justify-between text-left">
      {/* Mobile Burger Open button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-dash-secondary hover:text-dash-primary p-1 rounded hover:bg-dash-primary/5 cursor-pointer animate-fade-in"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Center Search Input */}
      <div ref={searchRef} className="relative w-64 md:w-96 flex-shrink-0">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dash-secondary pointer-events-none">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search tasks, reports, evidence..."
            value={searchQuery}
            onClick={() => setOpenDropdown("search")}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpenDropdown("search");
            }}
            className="w-full bg-dash-card border border-dash-border hover:border-dash-primary/30 focus:border-dash-primary rounded-xl pl-10 pr-16 py-2.5 text-xs text-dash-text focus:outline-none transition-all placeholder:text-dash-secondary font-semibold tracking-wide"
          />
          <span className="absolute inset-y-0 right-3 flex items-center text-[10px] text-dash-secondary font-bold select-none pointer-events-none bg-dash-bg border border-dash-border px-1.5 py-0.5 rounded h-fit my-auto">
            Ctrl + K
          </span>
        </div>

        {/* Search list Dropdown matches */}
        <AnimatePresence>
          {showSearchDropdown && searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute left-0 right-0 mt-2 bg-dash-sidebar border border-dash-border rounded-xl shadow-xl overflow-hidden z-50 p-2 max-h-60 overflow-y-auto scrollbar-thin text-left"
            >
              {filteredSearchTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-dash-secondary font-semibold">
                  No outcomes match your query
                </div>
              ) : (
                filteredSearchTasks.slice(0, 5).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveModule("my-tasks");
                      setSearchQuery("");
                      setOpenDropdown(null);
                    }}
                    className="w-full py-2 px-3 hover:bg-dash-primary/5 rounded-lg flex flex-col cursor-pointer text-left"
                  >
                    <span className="text-xs font-bold text-dash-text block truncate">{t.name}</span>
                    <span className="text-[10px] text-dash-secondary block truncate mt-0.5 font-semibold">{t.description || t.expectedOutcome}</span>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-5.5">
        {/* Notifications Alert Bell */}
        <div ref={notifRef} className="relative">
          <button
            ref={notifTriggerRef}
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === "notifications" ? null : "notifications");
            }}
            className="p-2.5 text-dash-secondary hover:text-dash-primary rounded-xl transition-all cursor-pointer relative hover:bg-dash-primary/5"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 bg-dash-primary text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-dash-bg shadow-[0_2px_8px_rgba(139,92,246,0.3)] px-0.5 animate-pulse-glow">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {/* Unread Notifications dropdown overlay */}
          <AnimatePresence>
            {notifDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 mt-3.5 w-80 bg-dash-sidebar border border-dash-border rounded-2xl shadow-xl z-50 overflow-hidden text-left"
              >
                <div className="p-4 border-b border-dash-border flex items-center justify-between bg-dash-card/10">
                  <h4 className="text-xs font-black text-dash-text">Recent Alerts & Actions</h4>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={markAllNotifsRead}
                      className="text-[10px] text-dash-primary hover:text-dash-hover font-bold cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="divide-y divide-dash-border max-h-64 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-dash-secondary font-semibold">
                      No new notifications
                    </div>
                  ) : (
                    notifications.slice(0, 4).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotifRead(notif.id);
                          setOpenDropdown(null);
                        }}
                        className={`p-3.5 flex items-start gap-3 hover:bg-dash-primary/5 transition-colors cursor-pointer ${
                          !notif.read ? "bg-dash-primary/5" : ""
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">{getNotifIcon(notif.type)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-dash-text truncate">{notif.title}</p>
                          <p className="text-[10px] text-dash-secondary mt-0.5 line-clamp-2 leading-relaxed font-semibold">
                            {notif.message}
                          </p>
                          <span className="text-[8px] text-dash-secondary/50 block mt-1 font-bold uppercase tracking-wider">
                            {notif.timestamp}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-dash-border text-center bg-dash-card/15">
                  <button
                    onClick={() => {
                      setActiveModule("notifications");
                      setOpenDropdown(null);
                    }}
                    className="text-[10px] text-dash-secondary hover:text-dash-primary font-black uppercase tracking-wider cursor-pointer"
                  >
                    View All Notifications Hub →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle icon */}
        <button
          onClick={toggleTheme}
          className="p-2.5 text-dash-secondary hover:text-dash-primary hover:bg-dash-primary/5 rounded-xl cursor-pointer"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* User Account Avatar profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            ref={profileTriggerRef}
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === "profile" ? null : "profile");
            }}
            className="flex items-center gap-3 p-1 rounded-xl cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dash-primary to-[#22D3EE] flex items-center justify-center text-white font-black text-xs uppercase shadow-md flex-shrink-0 overflow-hidden">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={userFullName} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-dash-text leading-tight">
                {userFullName}
              </span>
              <span className="text-[9px] font-bold text-dash-secondary uppercase tracking-wider mt-0.5 leading-none">
                User
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-dash-secondary hidden md:block" />
          </button>

          {/* User Account Dropdown overlay list */}
          <AnimatePresence>
            {profileDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute right-0 mt-3 w-52 bg-dash-sidebar border border-dash-border rounded-xl shadow-xl z-50 overflow-hidden p-1.5 text-left"
              >
                <div className="px-3.5 py-3 border-b border-dash-border text-left">
                  <p className="text-xs font-black text-dash-text truncate">{userFullName}</p>
                  <p className="text-[10px] text-dash-secondary truncate mt-0.5 font-bold leading-none">{userEmail}</p>
                </div>

                <div className="py-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveModule("profile");
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-dash-secondary hover:text-dash-primary hover:bg-dash-primary/5 rounded-lg cursor-pointer transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-dash-secondary" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModule("settings");
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-dash-secondary hover:text-dash-primary hover:bg-dash-primary/5 rounded-lg cursor-pointer transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-dash-secondary" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="border-t border-dash-border pt-1.5 pb-1">
                  <button
                    onClick={() => {
                      setOpenDropdown(null);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
