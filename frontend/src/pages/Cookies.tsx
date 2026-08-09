import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { Cookie, Shield, Activity, Settings } from "lucide-react";
import { useEffect } from "react";

export default function Cookies() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const cookieTypes = [
    {
      icon: Shield,
      title: "Essential Cookies",
      description: "Required to keep you signed in, access secure APIs, and run validation sandboxes. These cannot be disabled.",
      storageTime: "Session / Persistent (up to 30 days)"
    },
    {
      icon: Settings,
      title: "Preference Cookies",
      description: "Stores interface preferences, such as light/dark mode selection and workspace layout settings.",
      storageTime: "Persistent (up to 1 year)"
    },
    {
      icon: Activity,
      title: "Performance Cookies",
      description: "Collects anonymous telemetry regarding task execution speeds and API call latencies to optimize system performance.",
      storageTime: "Persistent (up to 1 year)"
    }
  ];

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden bg-grid-pattern">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#FF6B00]/2 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#FF8C42]/2 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10 text-left">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-dash-card border border-dash-primary/30 flex items-center justify-center text-dash-primary mx-auto mb-4 shadow-lg shadow-orange-500/10">
              <Cookie size={32} />
            </div>
            <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
              Cookie Consent
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-dash-text mt-3 tracking-tight">
              Cookie Policy
            </h1>
            <p className="text-dash-secondary text-sm mt-3 font-mono">
              Last updated: July 2026
            </p>
          </motion.div>

          {/* Card Wrapper */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-panel bg-dash-card border border-dash-border rounded-2xl p-6 sm:p-10 shadow-xl space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar"
          >
            <div className="border-b border-dash-border/40 pb-6">
              <h3 className="text-lg font-bold text-dash-text mb-2">About Cookies</h3>
              <p className="text-dash-secondary text-sm leading-relaxed font-medium">
                Cookies are small text strings saved on your local device. We use them primarily to authenticate profile identities, secure API routes, and gather interface response speed data.
              </p>
            </div>

            {cookieTypes.map((type, idx) => {
              const Icon = type.icon;
              return (
                <div key={idx} className="border-b border-dash-border/40 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-dash-bg border border-dash-border flex items-center justify-center text-dash-primary">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-dash-text tracking-wide">
                      {type.title}
                    </h3>
                  </div>
                  <p className="text-dash-secondary text-sm leading-relaxed pl-12 mb-2 font-medium">
                    {type.description}
                  </p>
                  <p className="text-dash-secondary/70 text-xs font-mono pl-12">
                    <span className="font-semibold text-dash-secondary">Duration:</span> {type.storageTime}
                  </p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
