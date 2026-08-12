import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

interface RouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/* ============================================================
   PUBLIC ROUTE

   Logged-in users should not stay on login/register pages.
============================================================ */

export function PublicRoute({ children }: RouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoading />;
  }

  if (user) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/* ============================================================
   PROTECTED ROUTE

   requireAdmin=true means only admin accounts can enter.
============================================================ */

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: RouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoading />;
  }

  /* Not logged in */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* Admin-only route */
  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  /* Normal user trying to enter admin */
  if (!requireAdmin && user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

/* ============================================================
   LOADING SCREEN
============================================================ */

function RouteLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--dash-bg)",
        color: "var(--dash-text)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: "4px solid rgba(255, 107, 0, 0.15)",
          borderTopColor: "#FF6B00",
          animation: "verinova-spin 0.8s linear infinite",
        }}
      />

      <style>
        {`
          @keyframes verinova-spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}