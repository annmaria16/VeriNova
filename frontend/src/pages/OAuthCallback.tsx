import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSessionToken } = useAuth();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Establishing secure handshake...");

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        setError(oauthError);
        toast(oauthError, "error");
        return;
      }

      if (!token) {
        setError("Invalid OAuth callback parameters. Secure token is missing.");
        toast("Invalid OAuth callback parameters.", "error");
        return;
      }

      try {
        setStatusText("Verifying credentials and exchanging tokens...");
        await new Promise((resolve) => setTimeout(resolve, 500));

        setStatusText("Initializing secure session...");
        await setSessionToken(token);

        toast("Successfully authenticated!", "success");
        navigate("/", { replace: true });
      } catch (err: any) {
        console.error(err);
        const errMsg = err.message || "Failed to complete authentication. Please try again.";
        setError(errMsg);
        toast(errMsg, "error");
      }
    };

    handleCallback();
  }, [searchParams, setSessionToken, navigate, toast]);

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col items-center justify-center p-6 relative overflow-hidden bg-grid-pattern">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FF8C42]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] bg-dash-card border border-dash-border rounded-2xl p-8 shadow-xl relative flex flex-col items-center text-center"
      >
        {error ? (
          <>
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-bold text-dash-text mb-3">Authentication Failed</h2>
            <p className="text-sm text-dash-secondary leading-relaxed mb-6 font-semibold">
              {error}
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF7F32] hover:from-[#FF7F32] hover:to-[#FF8C42] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div className="relative w-16 h-16 flex items-center justify-center mb-6">
              <Loader2 className="w-14 h-14 text-dash-primary animate-spin" />
              <ShieldCheck className="absolute text-dash-primary w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-dash-text mb-2">Verifying Identity</h2>
            <p className="text-xs text-dash-secondary font-mono tracking-wide animate-pulse">
              {statusText}
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
