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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      {/* General Error Banner */}
      {(submitError || authError) && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
          <span className="text-red-400 text-sm font-medium">{submitError || authError}</span>
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Email Address
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
            <Mail size={16} />
          </span>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder=""
            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${emailError ? "border-red-500/80" : "border-[#14532D]/60"
              }`}
          />
        </div>
        {emailError && (
          <span className="text-red-400 text-xs flex items-center gap-1.5 mt-1 font-medium animate-pulse">
            <AlertTriangle size={12} /> {emailError}
          </span>
        )}
      </div>

      {/* Password border highlight check */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label htmlFor="password" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Password
          </label>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
            <Lock size={16} />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder=""
            className="w-full bg-[#08120F]/90 border border-[#14532D]/60 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Forgot Password */}
      <div className="flex items-center justify-end text-xs sm:text-sm mt-1">
        <Link to="/forgot-password" className="text-[#22C55E] hover:text-[#4ADE80] transition-colors font-medium">
          Forgot Password?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] disabled:bg-[#14532D]/40 text-[#08120F] disabled:text-gray-500 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:shadow-none transition-all cursor-pointer mt-2 w-full disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-[#08120F] border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <span>Sign In</span>
            <Send size={16} />
          </>
        )}
      </button>

      {/* Transition link */}
      <p className="text-center text-sm text-gray-400 mt-2">
        Don't have an account?{" "}
        <Link to="/register" className="text-[#22C55E] hover:text-[#4ADE80] font-bold transition-colors">
          Register
        </Link>
      </p>
    </form>
  );
}
