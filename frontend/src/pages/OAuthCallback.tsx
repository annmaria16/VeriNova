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

        setStatusText("Initializing secure dashboard session...");
        await setSessionToken(token);

        toast("Successfully authenticated!", "success");
        navigate("/dashboard", { replace: true });
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
    <div className="min-h-screen bg-[#08120F] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden bg-grid-pattern">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#22C55E]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#4ADE80]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] glass-panel border border-[#14532D]/40 rounded-2xl p-8 shadow-2xl relative flex flex-col items-center text-center"
      >
        {error ? (
          <>
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Authentication Failed</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-[#10211C] hover:bg-[#14532D]/40 text-[#22C55E] border border-[#14532D] font-bold py-3 px-6 rounded-xl transition-all"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <div className="relative w-16 h-16 flex items-center justify-center mb-6">
              <Loader2 className="w-14 h-14 text-[#22C55E] animate-spin" />
              <ShieldCheck className="absolute text-[#4ADE80] w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Verifying Identity</h2>
            <p className="text-xs text-gray-400 font-mono tracking-wide animate-pulse">
              {statusText}
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
