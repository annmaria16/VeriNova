import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, AlertTriangle, Send } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export default function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, error: authError, clearError } = useAuth();
  const { toast } = useToast();

  const hasTriggeredRef = React.useRef(false);

  React.useEffect(() => {
    if (searchParams.get("expired") === "true" && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      toast("Your session has expired. Please sign in again.", "error");
      const params = new URLSearchParams(window.location.search);
      params.delete("expired");
      const newSearch = params.toString();
      const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, document.title, newPath);
    }
  }, [searchParams, toast]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = formData.email.trim() !== "" && emailRegex.test(formData.email);
  const emailError = formData.email && !emailRegex.test(formData.email)
    ? "Please enter a valid email address."
    : "";

  // Live Password Validation
  const isPasswordValid = formData.password.trim() !== "";

  // Form is valid only if both email and password are fully validated
  const isFormValid = isEmailValid && isPasswordValid;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear errors when user types
    if (submitError) setSubmitError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmitError(null);
    clearError();

    try {
      await login(formData.email, formData.password);
      toast("Successfully signed in!", "success");
      // Success! Navigate to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const errMsg = err.message || "Failed to sign in. Please try again.";
      setSubmitError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full text-left">
      {/* General Error Banner */}
      {(submitError || authError) && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
          <span className="text-red-500 text-sm font-semibold">{submitError || authError}</span>
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
          Email Address
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dash-secondary">
            <Mail size={16} />
          </span>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder=""
            className={`w-full bg-dash-bg border rounded-xl pl-10 pr-4 py-3 text-sm text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold ${
              emailError ? "border-red-500" : "border-dash-border"
            }`}
          />
        </div>
        {emailError && (
          <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
            <AlertTriangle size={12} /> {emailError}
          </span>
        )}
      </div>

      {/* Password border highlight check */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label htmlFor="password" className="text-xs font-black text-dash-secondary uppercase tracking-wider">
            Password
          </label>
        </div>
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
            placeholder=""
            className="w-full bg-dash-bg border border-dash-border rounded-xl pl-10 pr-10 py-3 text-sm text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dash-secondary hover:text-dash-primary transition-colors cursor-pointer"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Forgot Password */}
      <div className="flex items-center justify-end text-xs sm:text-sm mt-1">
        <Link to="/forgot-password" className="text-dash-primary hover:text-dash-hover transition-colors font-bold">
          Forgot Password?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="glow-btn bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#22D3EE] hover:opacity-95 text-white disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-md shadow-violet-500/10 disabled:shadow-none hover:shadow-lg transition-all cursor-pointer mt-2 w-full disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <span>Sign In</span>
            <Send size={16} />
          </>
        )}
      </button>

      {/* Transition link */}
      <p className="text-center text-sm text-dash-secondary mt-2 font-semibold">
        Don't have an account?{" "}
        <Link to="/register" className="text-dash-primary hover:text-dash-hover font-bold transition-colors">
          Register
        </Link>
      </p>
    </form>
  );
}
