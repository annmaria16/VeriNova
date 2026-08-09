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
    <section id="how-it-works" className="relative py-24 bg-dash-sidebar border-t border-dash-border overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-dash-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
            Operational Flow
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-dash-text mt-3 leading-tight">
            How VeriNova Works
          </h2>
          <p className="text-dash-secondary mt-4 text-base leading-relaxed font-semibold">
            A pipeline designed to intercept, investigate, and validate outputs before committing decisions. Click steps to inspect.
          </p>
        </div>

        {/* Visual Pipeline Layout */}
        <div className="relative flex flex-col items-center">
          
          {/* Horizontal line for desktop, vertical line for mobile */}
          <div className="absolute top-[28px] left-[50%] -translate-x-1/2 w-0.5 h-[calc(100%-60px)] lg:top-[38px] lg:left-6 lg:right-6 lg:w-[calc(100%-48px)] lg:h-0.5 lg:translate-x-0 bg-dash-border -z-10 opacity-70">
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
              className="hidden lg:block absolute top-1/2 -translate-y-1/2 w-8 h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent shadow-[0_0_10px_#8B5CF6]"
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
                          className="absolute -inset-2.5 rounded-full border-2 border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_20px_rgba(139,92,246,0.3)] pointer-events-none"
                          transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        />
                      )}
                    </AnimatePresence>
 
                    {/* Central Bubble */}
                    <div
                      className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                        isActive
                          ? "bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-[0_8px_25px_rgba(139,92,246,0.35)]"
                          : "bg-dash-bg border-dash-border text-dash-primary hover:border-dash-primary/70"
                      }`}
                    >
                      <Icon size={24} className={isActive ? "scale-110" : "group-hover:scale-110 transition-transform"} />
                    </div>

                    {/* Step number badge */}
                    <div
                      className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border transition-all duration-300 ${
                        activeStep === idx
                          ? "bg-dash-card border-[#8B5CF6] text-[#8B5CF6]"
                          : "bg-dash-bg border-dash-border text-dash-secondary group-hover:border-dash-primary/30"
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
                      className={`text-base sm:text-lg font-black transition-colors ${
                        isActive ? "text-dash-primary" : "text-dash-text group-hover:text-[#8B5CF6]"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-dash-secondary text-xs mt-2 max-w-[200px] leading-relaxed font-semibold">
                      {step.desc}
                    </p>
                  </motion.div>

                  {/* Flow Arrow for mobile view */}
                  {idx < steps.length - 1 && (
                    <div className="lg:hidden mt-8 text-dash-border flex flex-col items-center animate-pulse">
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
