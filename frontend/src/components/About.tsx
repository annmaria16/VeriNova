import { motion } from "framer-motion";
import { ShieldAlert, Award, Database, Sparkles, CheckCircle } from "lucide-react";

export default function About() {
  const pillars = [
    {
      icon: ShieldAlert,
      title: "Real-Time Prevention",
      desc: "Catch hallucinations, faulty code commits, or API errors before they hit your end users.",
    },
    {
      icon: Award,
      title: "Trust & Compliance",
      desc: "Produce tamper-proof cryptographic logs detailing exactly how each AI outcome was validated.",
    },
    {
      icon: Database,
      title: "Consensus Modeling",
      desc: "Cross-reference results with deterministic databases, search index caches, and fallback validation layers.",
    },
  ];

  return (
    <section id="about" className="relative py-24 bg-[#08120F] overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-[#22C55E]/2 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Information */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
              About VeriNova
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">
              Bridging the Trust Gap in AI Operations
            </h2>
            <p className="text-gray-400 mt-6 text-base leading-relaxed">
              Generative AI is transforming business, but hallucination rates and unverified actions expose businesses to critical risks. VeriNova sits between your LLMs and production databases to verify results, score confidence, and audit execution logs.
            </p>

            {/* Key Pillars */}
            <div className="mt-10 flex flex-col gap-6">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#10211C] border border-[#14532D] flex items-center justify-center text-[#22C55E]">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{pillar.title}</h4>
                      <p className="text-gray-400 text-sm mt-1 leading-relaxed">{pillar.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column: High Fidelity Verification Report Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="w-full max-w-[450px] glass-panel border border-[#14532D]/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              {/* Internal card background glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#22C55E]/5 blur-[30px] rounded-full"></div>

              {/* Certificate Header */}
              <div className="flex justify-between items-center border-b border-[#14532D]/30 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-white tracking-wide">Verification Audit</h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">TX-9048-VERIFIED</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-full text-[#4ADE80] text-xs font-bold animate-pulse">
                  <CheckCircle size={12} />
                  <span>PASSED</span>
                </div>
              </div>

              {/* Certificate Metadata fields */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-sm border-b border-[#14532D]/20 pb-3">
                  <span className="text-gray-400 font-medium">Source Model</span>
                  <span className="text-white font-mono flex items-center gap-1.5 bg-[#10211C] px-2 py-0.5 rounded border border-[#14532D]">
                    <Sparkles size={12} className="text-[#22C55E]" />
                    Claude 3.5 Sonnet
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-[#14532D]/20 pb-3">
                  <span className="text-gray-400 font-medium">Verification Method</span>
                  <span className="text-white font-mono text-xs">API Evidence + Logic Check</span>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-[#14532D]/20 pb-3">
                  <span className="text-gray-400 font-medium">Confidence Score</span>
                  <span className="text-[#4ADE80] font-bold font-mono">98.4%</span>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-[#14532D]/20 pb-3">
                  <span className="text-gray-400 font-medium">Evidence Checked</span>
                  <span className="text-gray-300 font-mono text-xs">5/5 Sources Verified</span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs pt-2">
                  <span className="text-gray-500 font-mono">SHA-256 Ledger Receipt:</span>
                  <div className="bg-[#08120F] border border-[#14532D]/40 font-mono text-[10px] p-2.5 rounded text-gray-400 break-all select-all">
                    8f6b1a92e10c73d5b1e4c76b92f0ea21a64bd2189ffca21074dae5801ba29ff1
                  </div>
                </div>
              </div>

              {/* Decorative scan line element */}
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#22C55E]/40 to-transparent mt-6"></div>
              <p className="text-center text-gray-500 text-[10px] font-medium mt-3">
                Protected by VeriNova Zero-Trust Execution Layer
              </p>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
