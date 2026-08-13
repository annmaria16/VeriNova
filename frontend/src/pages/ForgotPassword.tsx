import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertTriangle, Send, Check } from "lucide-react";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const isEmailValid = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.post("/auth/forgot-password", { email });
      const msg = "If an account exists for this email, a password reset link has been sent.";
      setSuccessMessage(msg);
      toast(msg, "success");
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to send reset link. Please try again.";
      setError(errMsg);
      toast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a password reset link"
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
            Back to Login
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
                value={email}
                onChange={handleInputChange}
                required
                className={`w-full bg-dash-bg border rounded-xl pl-10 pr-4 py-3 text-sm text-dash-text placeholder-dash-secondary/50 focus:outline-none focus:border-dash-primary focus:ring-1 focus:ring-dash-primary/30 transition-all font-semibold ${
                  email && !isEmailValid ? "border-red-500" : "border-dash-border"
                }`}
              />
            </div>
            {email && !isEmailValid && (
              <span className="text-red-500 text-xs flex items-center gap-1.5 mt-1 font-semibold">
                <AlertTriangle size={12} /> Please enter a valid email address.
              </span>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!isEmailValid || isSubmitting}
            className="glow-btn bg-gradient-to-r from-[#FF6B00] to-[#FF8A1F] hover:opacity-95 text-white disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-md shadow-orange-500/10 disabled:shadow-none hover:shadow-lg transition-all cursor-pointer mt-2 w-full disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Send Reset Link</span>
                <Send size={16} />
              </>
            )}
          </button>

          {/* Transition link */}
          <p className="text-center text-sm text-dash-secondary mt-2 font-semibold">
            Remember your password?{" "}
            <Link to="/login" className="text-dash-primary hover:text-dash-hover font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
