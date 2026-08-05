import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { FileText, Shield, UserCheck, AlertTriangle, Scale, Mail } from "lucide-react";
import { useEffect } from "react";

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      icon: FileText,
      title: "1. Introduction",
      content: "Welcome to VeriNova (the \"Platform\"). These Terms & Conditions (\"Terms\") govern your access to and use of our outcome verification services, software applications, and APIs. By accessing or using VeriNova, you agree to be bound by these Terms. If you do not agree, please do not use the Platform."
    },
    {
      icon: UserCheck,
      title: "2. User Eligibility",
      content: "You must be at least 18 years of age or the legal age of majority in your jurisdiction to use VeriNova. By registering, you warrant that you possess the legal authority to enter into a binding agreement and that your use of the Platform complies with all applicable local laws."
    },
    {
      icon: Shield,
      title: "3. Account Registration",
      content: "To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration. You are solely responsible for maintaining the confidentiality of your credentials (including passwords and API tokens) and for all activities that occur under your account."
    },
    {
      icon: UserCheck,
      title: "4. User Responsibilities",
      content: "You agree to use the Platform in a manner consistent with its purpose: auditing and verifying AI system outcomes. You must not upload corrupt evidence files, attempt unauthorized access to other users' namespaces, or intercept cryptographic payloads belonging to other entities."
    },
    {
      icon: AlertTriangle,
      title: "5. AI Verification Disclaimer",
      content: "VeriNova provides automated verification metrics, confidence scores, and sandbox execution logs based on deterministic algorithms and machine learning heuristics. While we strive for maximum accuracy, we do not warrant that our verification reports are free of errors or that they completely eliminate the risk of AI failures. Users should not rely solely on automated verification for safety-critical systems."
    },
    {
      icon: Shield,
      title: "6. Acceptable Use Policy",
      content: "You shall not use the Platform to process data that violates third-party rights, is unlawful, or contains malware. Scraping, reverse-engineering, or load-testing the verification sandbox without prior written consent from VeriNova is strictly prohibited."
    },
    {
      icon: FileText,
      title: "7. Intellectual Property",
      content: "All content, software, logo designs, trademarks, and cryptographic methods developed by VeriNova are the exclusive property of VeriNova Inc. and its licensors. You are granted a limited, non-transferable, revocable license to access the Platform for your internal business operations."
    },
    {
      icon: Scale,
      title: "8. Limitation of Liability",
      content: "To the maximum extent permitted by law, VeriNova Inc. shall not be liable for any indirect, incidental, special, exemplary, or consequential damages, including loss of profits, data corruption, or business interruption arising out of the use or inability to use our verification engine."
    },
    {
      icon: AlertTriangle,
      title: "9. Account Suspension",
      content: "We reserve the right to temporarily suspend your account if we detect anomalous API traffic patterns, excessive failed execution triggers, or suspect a breach of these Terms. We will make reasonable efforts to notify you in advance, except in cases of immediate security threats."
    },
    {
      icon: Scale,
      title: "10. Termination",
      content: "Either party may terminate this agreement at any time. Upon termination, your right to access the verification engine and export dashboard logs will cease immediately. Any outstanding payment obligations or intellectual property protections survive termination."
    },
    {
      icon: Mail,
      title: "11. Contact Information",
      content: "If you have any questions, disputes, or concerns regarding these Terms, please contact our legal compliance team at legal@verinova.ai or by submitting a inquiry on our Contact Page."
    },
    {
      icon: Scale,
      title: "12. Governing Law",
      content: "These Terms and any disputes arising out of or related to your use of VeriNova shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions."
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
            <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
              Legal Agreement
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
              Terms & Conditions
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
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div key={idx} className="border-b border-[#14532D]/20 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E]">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed pl-12">
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
