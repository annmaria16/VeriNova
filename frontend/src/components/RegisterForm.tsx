import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register, error: authError, clearError } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live validation calculations on every keystroke
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  const isFullNameValid = formData.fullName.trim().length >= 3;
  const fullNameError = formData.fullName && formData.fullName.trim().length < 3
    ? "Full name must be at least 3 characters."
    : "";

  const isEmailValid = emailRegex.test(formData.email);
  const emailError = formData.email && !emailRegex.test(formData.email)
    ? "Please enter a valid email address."
    : "";

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
    : "";

  const isConfirmPasswordValid = formData.confirmPassword !== "" && formData.confirmPassword === formData.password;
  const confirmPasswordError = formData.confirmPassword && formData.confirmPassword !== formData.password
    ? "Passwords do not match."
    : "";

  const isAgreeTermsValid = formData.agreeTerms;

  const isFormValid = isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isAgreeTermsValid;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
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
      await register(formData.email, formData.password, formData.fullName);
      toast("Account registered successfully! Please sign in.", "success");
      // Automatically redirect to Login page after successful registration
      navigate("/login");
    } catch (err: any) {
      const errMsg = err.message || "Registration failed. Please try again.";
      setSubmitError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {/* General Error Banner */}
      {(submitError || authError) && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
          <span className="text-red-400 text-sm font-medium">{submitError || authError}</span>
        </div>
      )}

      {/* Full Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="fullName" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Full Name
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
            <User size={16} />
          </span>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder=""
            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
              fullNameError ? "border-red-500" : "border-[#14532D]/60"
            }`}
          />
        </div>
        {fullNameError && (
          <span className="text-red-400 text-xs flex items-center gap-1 mt-0.5 font-medium animate-pulse">
            <AlertTriangle size={12} /> {fullNameError}
          </span>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
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
            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
              emailError ? "border-red-500" : "border-[#14532D]/60"
            }`}
          />
        </div>
        {emailError && (
          <span className="text-red-400 text-xs flex items-center gap-1 mt-0.5 font-medium animate-pulse">
            <AlertTriangle size={12} /> {emailError}
          </span>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Password
        </label>
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
            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
              formData.password && !isPasswordValid ? "border-red-500" : "border-[#14532D]/60"
            }`}
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

      {/* Real-time Password Validation in One Line */}
      {passwordError && (
        <span className="text-amber-400 text-xs flex items-center gap-1.5 mt-1 font-medium animate-pulse">
          <AlertTriangle size={12} /> {passwordError}
        </span>
      )}
      {formData.password && !passwordError && (
        <span className="text-green-400 text-xs flex items-center gap-1.5 mt-1 font-medium animate-none">
          <Check size={12} /> Password requirements met!
        </span>
      )}

      {/* Confirm Password */}
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Confirm Password
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
            <Lock size={16} />
          </span>
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder=""
            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
              confirmPasswordError ? "border-red-500" : "border-[#14532D]/60"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmPasswordError && (
          <span className="text-red-400 text-xs flex items-center gap-1 mt-0.5 font-medium animate-pulse">
            <AlertTriangle size={12} /> {confirmPasswordError}
          </span>
        )}
      </div>

      {/* Terms Agreement Checkbox */}
      <div className="flex flex-col gap-1 mt-1">
        <label className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleInputChange}
            className="w-4.5 h-4.5 rounded border-[#14532D] text-[#22C55E] focus:ring-0 focus:ring-offset-0 bg-[#08120F] transition-all cursor-pointer accent-[#22C55E] mt-0.5"
          />
          <span className="leading-relaxed">
            I agree to the{" "}
            <Link to="/terms" target="_blank" className="text-[#22C55E] hover:text-[#4ADE80] transition-colors font-semibold underline">
              Terms & Conditions
            </Link>{" "}
            &{" "}
            <Link to="/privacy" target="_blank" className="text-[#22C55E] hover:text-[#4ADE80] transition-colors font-semibold underline">
              Privacy Policy
            </Link>
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] disabled:bg-[#14532D]/40 text-[#08120F] disabled:text-gray-500 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:shadow-none transition-all cursor-pointer mt-3 w-full disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-[#08120F] border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <span>Create Account</span>
        )}
      </button>

      {/* Transition link */}
      <p className="text-center text-sm text-gray-400 mt-2">
        Already have an account?{" "}
        <Link to="/login" className="text-[#22C55E] hover:text-[#4ADE80] font-bold transition-colors">
          Login
        </Link>
      </p>
    </form>
  );
}
