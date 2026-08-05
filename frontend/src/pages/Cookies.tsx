import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { Cookie, Key, BarChart3, Settings, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

export default function Cookies() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const cookieTypes = [
    {
      icon: ShieldCheck,
      title: "Essential Cookies",
      description: "These cookies are strictly necessary to support the basic security functions of the VeriNova site. They permit core tasks like server load-balancing, layout rendering integrity, and anti-CSRF request validation. These cannot be disabled.",
      storageTime: "Session / Persistent (up to 1 year)"
    },
    {
      icon: Key,
      title: "Authentication Cookies",
      description: "When you register and log in to your dashboard, we set authentication tokens and identifier cookies. These recognize your browser profile as authorized, preventing you from needing to sign in repeatedly on every dashboard sub-view.",
      storageTime: "Until Logout / Token Expiration"
    },
    {
      icon: BarChart3,
      title: "Analytics Cookies",
      description: "We use analytics cookies to monitor aggregated usage stats, execution triggers, and loading latencies. This helps our operations team identify query bottlenecks and tune sandbox server capacities. No individual identity variables are shared.",
      storageTime: "Varies (from 30 minutes to 2 years)"
    },
    {
      icon: Settings,
      title: "User Preferences",
      description: "These cookies store settings like theme selection (Emerald Green Dark is our primary core theme), interface language configurations, collapsible sidebar positions, and API key copy shortcuts to streamline your dashboard workflow.",
      storageTime: "Persistent (up to 1 year)"
    }
  ];

  return (
    <div className="min-h-screen bg-[#08120F] text-white flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden bg-grid-pattern">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#22C55E]/2 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#4ADE80]/2 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#10211C] border border-[#14532D]/80 flex items-center justify-center text-[#22C55E] mx-auto mb-4 shadow-lg shadow-green-500/10">
              <Cookie size={32} />
            </div>
            <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
              Cookie Consent
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
              Cookie Policy
            </h1>
            <p className="text-gray-400 text-sm mt-3 font-mono">
              Last updated: July 2026
            </p>
          </motion.div>

          {/* Card Wrapper */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-panel border border-[#14532D]/40 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar"
          >
            <div className="border-b border-[#14532D]/20 pb-6">
              <h3 className="text-lg font-bold text-white mb-2">About Cookies</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Cookies are small text strings saved on your local device. We use them primarily to authenticate profile identities, secure API routes, and gather interface response speed data.
              </p>
            </div>

            {cookieTypes.map((type, idx) => {
              const Icon = type.icon;
              return (
                <div key={idx} className="border-b border-[#14532D]/20 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E]">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {type.title}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed pl-12 mb-2">
                    {type.description}
                  </p>
                  <p className="text-gray-500 text-xs font-mono pl-12">
                    <span className="font-semibold text-gray-400">Duration:</span> {type.storageTime}
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
