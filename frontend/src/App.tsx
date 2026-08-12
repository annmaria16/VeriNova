import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";

import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import { PublicRoute, ProtectedRoute } from "./components/AuthRoutes";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================================================
            PUBLIC ROUTES
        ===================================================== */}

        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route
          path="/auth/callback"
          element={
            <PublicRoute>
              <OAuthCallback />
            </PublicRoute>
          }
        />

        {/* =====================================================
            USER DASHBOARD
        ===================================================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* =====================================================
            ADMIN DASHBOARD
        ===================================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* =====================================================
            FALLBACK
        ===================================================== */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;