import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, AlertTriangle, Check, Eye, EyeOff, Send } from "lucide-react";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import AuthLayout from "../components/AuthLayout";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  // Re-use the existing password rules from RegisterForm.tsx
  const passwordChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.number &&
    passwordChecks.special;

  const passwordIssues = [];
  if (!passwordChecks.length) passwordIssues.push("8+ chars");
  if (!passwordChecks.uppercase) passwordIssues.push("uppercase");
  if (!passwordChecks.lowercase) passwordIssues.push("lowercase");
  if (!passwordChecks.number) passwordIssues.push("number");
  if (!passwordChecks.special) passwordIssues.push("special char");

  const passwordError = formData.password && passwordIssues.length > 0
    ? `Required: ${passwordIssues.join(", ")}`
    : null;

  const isConfirmPasswordValid =
    formData.confirmPassword !== "" &&
    formData.confirmPassword === formData.password;

  const confirmPasswordError =
    formData.confirmPassword && formData.confirmPassword !== formData.password
      ? "Passwords do not match."
      : null;

  const isFormValid = isPasswordValid && isConfirmPasswordValid && token !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: formData.password,
      });
      const msg = "Your password has been reset successfully.";
      setSuccessMessage(msg);
      toast(msg, "success");
    } catch (err: any) {
      const errMsg =
        err.response?.data?.detail || "Failed to reset password. The link may have expired or is invalid.";
      setError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your new password below"
    >
      {successMessage ? (
        <div className="flex flex-col gap-6 text-center">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3 text-left">
            <Check className="text-green-500 shrink-0 mt-0.5" size={18} />
            <span className="text-green-600 dark:text-green-400 text-sm font-semibold">
              {successMessage}
            </span>
          </div>
          <Link
            to="/login"
            className="glow-btn bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] hover:opacity-95 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-md shadow-orange-500/10 hover:shadow-lg transition-all cursor-pointer w-full text-center"
          >
            Go to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full text-left">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <span className="text-red-500 text-sm font-semibold">{error}</span>
            </div>
          )}

          {!token && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" size={16} />
              <span className="text-yellow-600 dark:text-yellow-400 text-sm font-semibold">
                Invalid reset link. Token is missing from the URL.
              </span>
            </div>
          )}

          {/* New Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dash-secondary">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className={`w-full bg-dash-bg border rounded-xl pl-10 pr-10 py-3 text-sm text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold ${
                  formData.password && !isPasswordValid ? "border-red-500" : "border-dash-border"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dash-secondary hover:text-dash-primary transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Real-time Password Validation */}
            {passwordError && (
              <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                <AlertTriangle size={12} /> {passwordError}
              </span>
            )}
            {formData.password && !passwordError && (
              <span className="text-green-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                <Check size={12} /> Password requirements met!
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dash-secondary">
                <Lock size={16} />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className={`w-full bg-dash-bg border rounded-xl pl-10 pr-10 py-3 text-sm text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold ${
                  confirmPasswordError ? "border-red-500" : "border-dash-border"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dash-secondary hover:text-dash-primary transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPasswordError && (
              <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                <AlertTriangle size={12} /> {confirmPasswordError}
              </span>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="glow-btn bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] hover:opacity-95 text-white disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-md shadow-orange-500/10 disabled:shadow-none hover:shadow-lg transition-all cursor-pointer mt-2 w-full disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Reset Password</span>
                <Send size={16} />
              </>
            )}
          </button>

          {/* Transition link */}
          <p className="text-center text-sm text-dash-secondary mt-2 font-semibold">
            Remembered your password?{" "}
            <Link to="/login" className="text-dash-primary hover:text-dash-hover font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
