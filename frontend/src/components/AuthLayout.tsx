import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#08120F] text-white flex flex-col relative overflow-hidden bg-grid-pattern">
      {/* Background radial glow spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#22C55E]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#4ADE80]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-gradient-to-br from-green-500 to-[#14532D] p-2 rounded-xl shadow-lg">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide leading-none group-hover:text-[#4ADE80] transition-colors">
              VeriNova
            </h1>
            <p className="text-gray-400 text-[10px] tracking-[0.2em] font-semibold uppercase mt-0.5">
              Outcome Verification
            </p>
          </div>
        </Link>
      </header>

      {/* Main Form Content Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[480px] glass-panel border border-[#14532D]/50 rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative internal glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#22C55E]/5 blur-[25px] rounded-full pointer-events-none"></div>

          {/* Heading slot */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {title}
            </h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Form and Social details */}
          {children}
        </motion.div>
      </main>
    </div>
  );
}
