import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, Database, FileSearch, Scale, CheckCircle2 } from "lucide-react";

export default function Workflow() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "User Request",
      desc: "User initiates an automated task or query in the application ecosystem.",
      icon: User,
    },
    {
      title: "AI Execution",
      desc: "The generative AI model processes the request and proposes an outcome.",
      icon: Sparkles,
    },
    {
      title: "Evidence Collection",
      desc: "System intercepts outputs and gathers downstream logs, DB logs, and API receipts.",
      icon: Database,
    },
    {
      title: "Verification Engine",
      desc: "VeriNova checks evidence against deterministic schemas and semantic rules.",
      icon: FileSearch,
    },
    {
      title: "Confidence Score",
      desc: "Calculates overall certainty percentage based on evidentiary criteria.",
      icon: Scale,
    },
    {
      title: "Verified Result",
      desc: "The certified outcome is released to production, or flagged for inspection.",
      icon: CheckCircle2,
    },
  ];

  // Rotate active step every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="how-it-works" className="relative py-24 bg-[#08120F] border-t border-[#14532D]/20 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#22C55E]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
            Operational Flow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">
            How VeriNova Works
          </h2>
          <p className="text-gray-400 mt-4 text-base leading-relaxed">
            A pipeline designed to intercept, investigate, and validate outputs before committing decisions. Click steps to inspect.
          </p>
        </div>

        {/* Visual Pipeline Layout */}
        <div className="relative flex flex-col items-center">
          
          {/* Horizontal line for desktop, vertical line for mobile */}
          <div className="absolute top-[28px] left-[50%] -translate-x-1/2 w-0.5 h-[calc(100%-60px)] lg:top-[38px] lg:left-6 lg:right-6 lg:w-[calc(100%-48px)] lg:h-0.5 lg:translate-x-0 bg-[#14532D] -z-10 opacity-70">
            {/* Animated traveling dot along the line */}
            <motion.div
              animate={{
                left: ["0%", "100%"],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear",
              }}
              className="hidden lg:block absolute top-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent via-[#4ADE80] to-transparent shadow-[0_0_10px_#4ADE80]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 w-full">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.title}
                  onClick={() => setActiveStep(idx)}
                  className="flex flex-col items-center text-center cursor-pointer group"
                >
                  {/* Step Connector Number & Node Bubble */}
                  <div className="relative flex items-center justify-center mb-6">
                    {/* Ring glow */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="activeGlow"
                          className="absolute -inset-2.5 rounded-full border-2 border-[#22C55E] bg-[#22C55E]/5 shadow-[0_0_20px_rgba(34,197,94,0.4)] pointer-events-none"
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Central Bubble */}
                    <div
                      className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                        isActive
                          ? "bg-[#22C55E] border-[#22C55E] text-[#08120F] shadow-[0_0_25px_rgba(74,222,128,0.5)]"
                          : "bg-[#10211C] border-[#14532D] text-[#22C55E] hover:border-[#22C55E]/70"
                      }`}
                    >
                      <Icon size={24} className={isActive ? "scale-110" : "group-hover:scale-110 transition-transform"} />
                    </div>

                    {/* Step number badge */}
                    <div
                      className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-all duration-300 ${
                        isActive
                          ? "bg-white border-white text-[#08120F]"
                          : "bg-[#10211C] border-[#14532D] text-gray-400"
                      }`}
                    >
                      {idx + 1}
                    </div>
                  </div>

                  {/* Text Details with dynamic opacity */}
                  <motion.div
                    animate={{
                      opacity: isActive ? 1 : 0.6,
                      scale: isActive ? 1.02 : 1,
                    }}
                    className="flex flex-col items-center"
                  >
                    <h3
                      className={`text-base sm:text-lg font-bold transition-colors ${
                        isActive ? "text-[#4ADE80]" : "text-white group-hover:text-[#22C55E]"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-xs mt-2 max-w-[200px] leading-relaxed">
                      {step.desc}
                    </p>
                  </motion.div>

                  {/* Flow Arrow for mobile view */}
                  {idx < steps.length - 1 && (
                    <div className="lg:hidden mt-8 text-[#14532D] flex flex-col items-center animate-pulse">
                      <span>↓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
