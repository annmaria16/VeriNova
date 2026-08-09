import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { Shield, Eye, Lock, Server, HelpCircle, Mail } from "lucide-react";
import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      icon: Shield,
      title: "1. Privacy Commitment",
      content: "VeriNova Inc. (\"VeriNova\", \"we\", \"our\", or \"us\") is dedicated to protecting user data and verifying transactions safely. This Privacy Policy details how we handle, cryptographically store, and audit inputs submitted to our validation engines."
    },
    {
      icon: Eye,
      title: "2. Information We Collect",
      content: "We collect account registration data (name, email address, password hash) and system metrics necessary to verify actions (transaction receipts, execution logs, API payloads). We do not collect unnecessary personal files or track your browser activity outside the sandbox."
    },
    {
      icon: Lock,
      title: "3. Cryptographic Logging",
      content: "All audit records, receipts, and outcomes logged inside the VeriNova network are verified using hash chains. This guarantees that your historical execution data remains completely tamper-proof and private."
    },
    {
      icon: Server,
      title: "4. Data Storage and VPCs",
      content: "Default customer accounts use our multi-tenant cloud workspace hosted inside secured AWS clusters. Enterprise subscribers can opt to execute workflows in private VPC regions with strict single-tenant containment."
    },
    {
      icon: HelpCircle,
      title: "5. Cookies and Analytics",
      content: "We use core cookies to sustain user authentication tokens and save theme configuration preferences. We do not integrate third-party ad targeting or cross-site tracking systems."
    },
    {
      icon: Mail,
      title: "6. Contact Information",
      content: "For privacy questions, data deletion queries, or security reports, please contact our data safety officer at privacy@verinova.ai."
    }
  ];

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden bg-grid-pattern">
        {/* Background Gradients */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#FF6B00]/2 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#FF8C42]/2 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10 text-left">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
              Data Privacy
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-dash-text mt-3 tracking-tight">
              Privacy Policy
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
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div key={idx} className="border-b border-dash-border/40 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-dash-bg border border-dash-border flex items-center justify-center text-dash-primary">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-dash-text tracking-wide">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-dash-secondary text-sm leading-relaxed pl-12 font-medium">
                    {section.content}
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
