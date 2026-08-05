import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { Target, Eye, Shield, Cpu, Layers } from "lucide-react";
import { useEffect } from "react";

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#08120F] text-white flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden bg-grid-pattern">
        {/* Background Gradients */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#22C55E]/2 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#4ADE80]/2 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
              Who We Are
            </span>
            <h1 className="text-4xl sm:text-6xl font-black text-white mt-3 tracking-tight leading-none">
              About VeriNova
            </h1>
            <p className="text-gray-400 text-base sm:text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
              VeriNova is the first Zero-Trust outcome verification platform built specifically to monitor, audit, and assert safety constraints on autonomous AI systems in production.
            </p>
          </motion.div>

          {/* Grid Layout: Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-panel border border-[#14532D]/40 rounded-2xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#22C55E]/5 blur-[20px] rounded-full"></div>
              <div className="w-12 h-12 rounded-xl bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E] mb-6">
                <Target size={24} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide mb-4">Our Mission</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                To build the infrastructure that guarantees alignment, accountability, and deterministic safety in AI operations. We aim to ensure that generative agents act within secure sandbox margins, protecting organization systems and users.
              </p>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-panel border border-[#14532D]/40 rounded-2xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4ADE80]/5 blur-[20px] rounded-full"></div>
              <div className="w-12 h-12 rounded-xl bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E] mb-6">
                <Eye size={24} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide mb-4">Our Vision</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                A world where developers deploy AI agents with complete confidence. We visualize a zero-trust future where every automated outcome, code generation, database change, or API request is crypto-signed, validated, and transparently auditable.
              </p>
            </motion.div>
          </div>

          {/* Platform Overview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-panel border border-[#14532D]/40 rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#22C55E]/5 blur-[35px] rounded-full"></div>
            <div className="flex flex-col gap-6">
              <div>
                <span className="text-[#22C55E] text-xs font-mono tracking-wider uppercase">System Architecture</span>
                <h2 className="text-3xl font-black text-white tracking-tight mt-1">AI Verification Platform Overview</h2>
              </div>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                VeriNova introduces an isolated audit layer between generative model endpoints and enterprise database tables. Through multi-agent evaluations, real-time code sandboxes, and cryptographic logging, the platform intercepts invalid behaviors before they write to records.
              </p>

              {/* Three Pillars */}
              <div className="grid sm:grid-cols-3 gap-6 mt-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-white font-bold">
                    <Shield size={16} className="text-[#22C55E]" />
                    <span>Deterministic Auditing</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Uses strict schema checks and regex validation patterns to lock down critical data fields.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-white font-bold">
                    <Cpu size={16} className="text-[#22C55E]" />
                    <span>LLM-in-the-Loop Heuristics</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Applies lightweight, fine-tuned consensus modules to identify semantic anomalies.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-white font-bold">
                    <Layers size={16} className="text-[#22C55E]" />
                    <span>Cryptographic Receipts</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Produces SHA-256 digital log certificates, creating secure historical trace ledgers.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
