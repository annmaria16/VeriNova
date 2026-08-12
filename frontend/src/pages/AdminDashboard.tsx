import { useAuth } from "../hooks/useAuth";

export default function AdminDashboard() {
    const { user } = useAuth();

    return (
        <div className="admin-dashboard">
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <span>V</span>
                    <div>
                        <strong>VeriNova</strong>
                        <small>ADMIN</small>
                    </div>
                </div>

                <nav>
                    <button className="active">Dashboard</button>
                    <button>Products</button>
                    <button>Bookings</button>
                    <button>Team</button>
                    <button>Reports</button>
                    <button>Settings</button>
                </nav>

                <div className="admin-sidebar-bottom">
                    <div className="admin-user-mini">
                        <div className="admin-avatar">
                            {(user?.fullname || "A").charAt(0).toUpperCase()}
                        </div>

                        <div>
                            <strong>{user?.fullname || "Admin"}</strong>
                            <span>Organization Admin</span>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <p className="admin-eyebrow">ORGANIZATION ADMIN</p>
                        <h1>
                            Welcome back,{" "}
                            <span>{user?.fullname || "Admin"}</span>
                        </h1>
                        <p className="admin-subtitle">
                            Manage your VeriNova organization from one place.
                        </p>
                    </div>

                    <div className="admin-header-profile">
                        <div className="admin-avatar large">
                            {(user?.fullname || "A").charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                <section className="admin-stats">
                    <div className="admin-stat-card">
                        <span>Total Tasks</span>
                        <strong>0</strong>
                        <small>No tasks yet</small>
                    </div>

                    <div className="admin-stat-card">
                        <span>Team Members</span>
                        <strong>0</strong>
                        <small>No members yet</small>
                    </div>

                    <div className="admin-stat-card">
                        <span>Verified Tasks</span>
                        <strong>0</strong>
                        <small>No verification data</small>
                    </div>

                    <div className="admin-stat-card">
                        <span>Average Confidence</span>
                        <strong>—</strong>
                        <small>Waiting for data</small>
                    </div>
                </section>

                <section className="admin-grid">
                    <div className="admin-panel wide">
                        <div className="panel-heading">
                            <div>
                                <h2>Verification Overview</h2>
                                <p>Your organization's verification activity.</p>
                            </div>

                            <span className="panel-badge">Coming Soon</span>
                        </div>

                        <div className="empty-chart">
                            <div className="chart-glow" />
                            <span>Verification analytics will appear here.</span>
                        </div>
                    </div>

                    <div className="admin-panel">
                        <div className="panel-heading">
                            <div>
                                <h2>Quick Actions</h2>
                                <p>Manage your organization.</p>
                            </div>
                        </div>

                        <div className="quick-actions">
                            <button>
                                <span>＋</span>
                                Add Product
                            </button>

                            <button>
                                <span>⌁</span>
                                Add Booking Service
                            </button>

                            <button>
                                <span>♙</span>
                                Manage Team
                            </button>
                        </div>
                    </div>

                    <div className="admin-panel">
                        <div className="panel-heading">
                            <div>
                                <h2>Recent Activity</h2>
                                <p>Latest organization activity.</p>
                            </div>
                        </div>

                        <div className="empty-state">
                            <div className="empty-icon">✦</div>
                            <strong>No activity yet</strong>
                            <span>
                                Activity will appear here when your organization starts
                                using VeriNova.
                            </span>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}