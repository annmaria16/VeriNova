import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../services/api";

interface UserProfile {
  id: number;
  fullname: string;
  email: string;
  provider: string;
  role: "user" | "admin";
  created_at: string;
  avatar_url?: string | null;
  terms_accepted: boolean;
  privacy_accepted: boolean;
  terms_version?: string | null;
  privacy_version?: string | null;
  legal_accepted_at?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    email: string,
    password: string,
    fullName: string,
    acceptedTerms?: boolean
  ) => Promise<void>;

  oauthLogin: (
    provider: string,
    email: string,
    name: string,
    code?: string
  ) => Promise<void>;

  setSessionToken: (
    token: string
  ) => Promise<void>;

  logout: () => void;

  error: string | null;

  clearError: () => void;

  updateUser: (
    updatedUser: UserProfile
  ) => void;
}

const AuthContext =
  createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [token, setToken] =
    useState<string | null>(
      localStorage.getItem("token")
    );

  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(false);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(null);

  const clearError = () => {
    setError(null);
  };

  /*
   * ============================================================
   * INITIAL AUTH CHECK
   * ============================================================
   */

  useEffect(() => {
    const initAuth = async () => {
      const storedToken =
        localStorage.getItem("token");

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res =
          await api.get<UserProfile>(
            "/user/profile"
          );

        setUser(res.data);
        setToken(storedToken);
        setIsAuthenticated(true);

      } catch (err: any) {
        console.error(
          "Token validation failed",
          err
        );

        localStorage.removeItem("token");

        setToken(null);
        setUser(null);
        setIsAuthenticated(false);

        const publicPaths = [
          "/",
          "/login",
          "/register",
          "/signup",
          "/auth/callback",
        ];

        if (
          !publicPaths.includes(
            window.location.pathname
          )
        ) {
          window.location.href =
            "/login?expired=true";
        }

      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  const login = async (
    email: string,
    password: string
  ) => {
    setError(null);

    try {
      const res =
        await api.post<{
          access_token: string;
          token_type: string;
        }>("/auth/login", {
          email,
          password,
        });

      const newToken =
        res.data.access_token;

      localStorage.setItem(
        "token",
        newToken
      );

      setToken(newToken);

      const profileRes =
        await api.get<UserProfile>(
          "/user/profile"
        );

      setUser(profileRes.data);

      setIsAuthenticated(true);

    } catch (err: any) {
      console.error(
        "Login API error",
        err
      );

      const errMsg =
        err.response?.data?.detail ||
        "Invalid email or password. Please try again.";

      setError(errMsg);

      throw new Error(errMsg);
    }
  };

  /*
   * ============================================================
   * REGISTER
   * ============================================================
   */

  const register = async (
    email: string,
    password: string,
    fullName: string,
    acceptedTerms?: boolean
  ) => {
    setError(null);

    try {
      await api.post(
        "/auth/register",
        {
          email,
          password,
          fullname: fullName,
          accepted_terms: acceptedTerms,
        }
      );

    } catch (err: any) {
      console.error(
        "Registration API error",
        err
      );

      const errMsg =
        err.response?.data?.detail ||
        "Registration failed. Please try again.";

      setError(errMsg);

      throw new Error(errMsg);
    }
  };

  /*
   * ============================================================
   * SESSION TOKEN
   * ============================================================
   */

  const setSessionToken = async (
    newToken: string
  ) => {
    localStorage.setItem(
      "token",
      newToken
    );

    setToken(newToken);

    try {
      const res =
        await api.get<UserProfile>(
          "/user/profile"
        );

      setUser(res.data);

      setIsAuthenticated(true);

    } catch (err: any) {
      console.error(
        "Token initialization failed",
        err
      );

      localStorage.removeItem(
        "token"
      );

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      throw err;
    }
  };

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const logout = () => {
    localStorage.removeItem("token");

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  /*
   * ============================================================
   * OAUTH LOGIN
   * ============================================================
   */

  const oauthLogin = async (
    provider: string,
    email: string,
    fullname: string,
    code?: string
  ) => {
    setError(null);

    try {
      const res =
        await api.post<{
          access_token: string;
          token_type: string;
        }>("/auth/oauth", {
          provider,
          email,
          fullname,
          code,
        });

      const newToken =
        res.data.access_token;

      localStorage.setItem(
        "token",
        newToken
      );

      setToken(newToken);

      const profileRes =
        await api.get<UserProfile>(
          "/user/profile"
        );

      setUser(profileRes.data);

      setIsAuthenticated(true);

    } catch (err: any) {
      console.error(
        "OAuth API error",
        err
      );

      const errMsg =
        err.response?.data?.detail ||
        "OAuth login failed. Please try again.";

      setError(errMsg);

      throw new Error(errMsg);
    }
  };

  /*
   * ============================================================
   * UPDATE USER
   * ============================================================
   */

  const updateUser = (
    updatedUser: UserProfile
  ) => {
    setUser(updatedUser);
  };

  /*
   * ============================================================
   * PROVIDER
   * ============================================================
   */

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,

        login,
        register,
        oauthLogin,
        setSessionToken,

        logout,

        error,
        clearError,

        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/*
 * ============================================================
 * useAuth HOOK
 * ============================================================
 */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}