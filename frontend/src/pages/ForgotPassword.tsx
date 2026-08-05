import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertTriangle, Send, CheckCircle2, Lock, Eye, EyeOff, Check } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import api from "../services/api";
import { useToast } from "../hooks/useToast";

export default function ForgotPassword() {
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: OTP state
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const otpInputsRef = useRef<HTMLInputElement[]>([]);

  // Step 3: Password state
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Live Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim() !== "" && emailRegex.test(email);
  const emailError = email && !emailRegex.test(email)
    ? "Please enter a valid email address."
    : "";

  // Resend Timer Countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 2 && resendCooldown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    } else if (step === 2 && resendCooldown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Live Password Validation Checks
  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    noSpaces: newPassword.length > 0 && !/\s/.test(newPassword),
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.noSpaces;

  const passwordIssues = [];
  if (!passwordChecks.length) passwordIssues.push("8+ chars");
  if (!passwordChecks.uppercase) passwordIssues.push("uppercase");
  if (!passwordChecks.lowercase) passwordIssues.push("lowercase");
  if (!passwordChecks.number) passwordIssues.push("number");
  if (!passwordChecks.special) passwordIssues.push("special char");
  if (!passwordChecks.noSpaces) passwordIssues.push("no spaces");
  
  const passwordError = newPassword && passwordIssues.length > 0
    ? `Required: ${passwordIssues.join(", ")}`
    : "";

  const isConfirmPasswordValid = confirmPassword !== "" && confirmPassword === newPassword;
  const confirmPasswordError = confirmPassword && confirmPassword !== newPassword
    ? "Passwords do not match."
    : "";

  const isFormValid = isPasswordValid && isConfirmPasswordValid && !!resetToken;

  // Mask email helper
  const maskEmail = (emailStr: string) => {
    const [name, domain] = emailStr.split("@");
    if (!name || !domain) return emailStr;
    if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  };

  // STEP 1 Handlers: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/auth/forgot-password", { email });
      toast("Verification code sent to your email!", "success");
      setStep(2);
      setResendCooldown(30);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to send verification code. Please try again.";
      setError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2 Handlers: Resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/auth/resend-reset-otp", { email });
      toast("A new verification code has been sent!", "success");
      setResendCooldown(30);
      setCanResend(false);
      setOtp(Array(6).fill(""));
      // Focus first input
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 50);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to resend code. Please try again.";
      setError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2 Handlers: OTP Inputs
  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) return; // accept numbers only

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Automatically move to next input if value entered
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move focus to previous and clear it
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        otpInputsRef.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) {
      toast("Please paste a 6-digit numeric verification code.", "error");
      return;
    }

    const digits = pastedData.split("");
    setOtp(digits);
    otpInputsRef.current[5]?.focus();
  };

  // STEP 2 Handlers: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      toast("Please enter all 6 digits of the verification code.", "error");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post("/auth/verify-reset-otp", {
        email,
        otp: fullOtp,
      });
      setResetToken(res.data.reset_token);
      toast("Email verified successfully!", "success");
      setStep(3);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Invalid or expired verification code.";
      setError(errMsg);
      toast(errMsg, "error");
      if (errMsg.includes("Too many incorrect attempts") || errMsg.includes("expired")) {
        setOtp(Array(6).fill(""));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 3 Handlers: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/auth/reset-password", {
        token: resetToken,
        password: newPassword,
      });
      toast("Password reset successfully!", "success");
      setStep(4);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to reset password. Please request a new verification code.";
      setError(errMsg);
      toast(errMsg, "error");
      // Redirect to Step 1 if token expired or invalid
      if (errMsg.includes("expired") || errMsg.includes("authorization")) {
        setStep(1);
        setEmail("");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Helpers
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-5 w-full">
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <span className="text-red-400 text-sm font-medium">{error}</span>
              </div>
            )}

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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                    emailError ? "border-red-500/80" : "border-[#14532D]/60"
                  }`}
                  placeholder=""
                />
              </div>
              {emailError && (
                <span className="text-red-400 text-xs flex items-center gap-1.5 mt-1 font-medium animate-pulse">
                  <AlertTriangle size={12} /> {emailError}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!isEmailValid || isSubmitting}
              className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] disabled:bg-[#14532D]/40 text-[#08120F] disabled:text-gray-500 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:shadow-none transition-all cursor-pointer mt-2 w-full disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#08120F] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Send OTP</span>
                  <Send size={16} />
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-400 mt-2">
              Remember your credentials?{" "}
              <Link to="/login" className="text-[#22C55E] hover:text-[#4ADE80] font-bold transition-colors">
                Sign In
              </Link>
            </p>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5 w-full">
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <span className="text-red-400 text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-4 text-center">
              <p className="text-gray-400 text-sm">
                We sent a 6-digit verification code to <span className="text-white font-semibold">{maskEmail(email)}</span>
              </p>

              <div className="flex justify-center gap-2 sm:gap-3 my-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    ref={(el) => {
                      if (el) otpInputsRef.current[idx] = el;
                    }}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-10 h-12 sm:w-12 sm:h-14 bg-[#08120F] border border-[#14532D]/80 focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] rounded-xl text-center text-lg sm:text-xl font-bold text-white focus:outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={otp.join("").length !== 6 || isSubmitting}
              className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] disabled:bg-[#14532D]/40 text-[#08120F] disabled:text-gray-500 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:shadow-none transition-all cursor-pointer mt-1 w-full disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#08120F] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Verify OTP</span>
              )}
            </button>

            <div className="text-center text-sm mt-2">
              <span className="text-gray-400">Didn't receive the code? </span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isSubmitting}
                  className="text-[#22C55E] hover:text-[#4ADE80] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Resend OTP
                </button>
              ) : (
                <span className="text-gray-500 font-semibold">
                  Resend OTP in {resendCooldown} seconds
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError(null);
              }}
              className="text-[#22C55E] hover:text-[#4ADE80] text-sm text-center font-bold transition-colors cursor-pointer"
            >
              Back
            </button>
          </form>
        );

      case 3:
        return (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4 w-full">
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={16} />
                <span className="text-red-400 text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-start gap-3">
              <CheckCircle2 className="text-[#22C55E] shrink-0 mt-0.5" size={16} />
              <span className="text-[#22C55E] text-sm font-semibold">OTP Verified. Create your new password.</span>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                    newPassword && !isPasswordValid ? "border-red-500" : "border-[#14532D]/60"
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
              {passwordError && (
                <span className="text-amber-400 text-xs flex items-center gap-1.5 mt-1 font-medium animate-pulse">
                  <AlertTriangle size={12} /> {passwordError}
                </span>
              )}
              {newPassword && !passwordError && (
                <span className="text-green-400 text-xs flex items-center gap-1.5 mt-1 font-medium animate-none">
                  <Check size={12} /> Password requirements met!
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
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
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
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
                <span className="text-red-400 text-xs flex items-center gap-1.5 mt-1 font-medium animate-pulse">
                  <AlertTriangle size={12} /> {confirmPasswordError}
                </span>
              )}
            </div>

            {/* Reset Submit */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] disabled:bg-[#14532D]/40 text-[#08120F] disabled:text-gray-500 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:shadow-none transition-all cursor-pointer mt-2 w-full disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#08120F] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Reset Password</span>
                  <Send size={16} />
                </>
              )}
            </button>
          </form>
        );

      case 4:
        return (
          <div className="flex flex-col gap-6 items-center text-center">
            <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Password Reset Successful</h3>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                Your password has been changed successfully.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full bg-[#10211C] hover:bg-[#14532D]/40 text-[#22C55E] border border-[#14532D] font-bold py-3 px-6 rounded-xl text-center transition-all mt-2 cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  const getWizardInfo = () => {
    switch (step) {
      case 1:
        return {
          title: "Forgot Password",
          subtitle: "Enter your email address and we'll send you a verification code.",
        };
      case 2:
        return {
          title: "Verify OTP",
          subtitle: "We sent a 6-digit verification code to your email.",
        };
      case 3:
        return {
          title: "Create New Password",
          subtitle: "Your email has been verified. Create your new password.",
        };
      case 4:
        return {
          title: "Password Reset Successful",
          subtitle: "Your password has been changed successfully.",
        };
    }
  };

  const wizardInfo = getWizardInfo();

  return (
    <AuthLayout
      title={wizardInfo.title}
      subtitle={wizardInfo.subtitle}
    >
      {renderStep()}
    </AuthLayout>
  );
}
