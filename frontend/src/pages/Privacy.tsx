import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, UploadCloud, Cpu, Lock, Database, Globe, Key, Trash, Info } from "lucide-react";
import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      icon: Eye,
      title: "1. Information We Collect",
      content: "VeriNova collects telemetry and registry information required to provide outcome auditing services. This includes standard metadata regarding execution loops, connection state logs, and user profile parameters."
    },
    {
      icon: ShieldCheck,
      title: "2. Personal Information",
      content: "When registering on VeriNova, we collect your Full Name and Email Address. This information is used exclusively to distinguish account authorization spaces and verify system operations."
    },
    {
      icon: UploadCloud,
      title: "3. Uploaded Evidence",
      content: "Our verification engine processes evidence files uploaded via our API or SDK, which may include text files, sensor outputs, image captures, or execution logs. Evidence payloads are securely sandboxed and evaluated."
    },
    {
      icon: Cpu,
      title: "4. AI Processing",
      content: "Telemetry logs and evidence are passed through our automated verification pipelines and LLM evaluation engines to run assertions and determine confidence ratings. We ensure that your input payloads are not used by upstream LLM providers to train public models."
    },
    {
      icon: Database,
      title: "5. Cookies",
      content: "We use cookies to maintain your login session state and secure dashboard navigation. Read our Cookie Policy for details on essential cookies and preference tracking."
    },
    {
      icon: Database,
      title: "6. Database Storage",
      content: "All account profiles, hashed credentials, verification tasks, and status logs are stored securely in a relational PostgreSQL database. We implement strict table-level and foreign-key isolation rules to protect tenant data."
    },
    {
      icon: Lock,
      title: "7. Security",
      content: "VeriNova uses industry-standard hashing algorithms (bcrypt) for user passwords, tokenized authorization headers (JWT), and SSL/TLS encrypted traffic. We continuously scan our codebase and dependencies for security compliance."
    },
    {
      icon: Globe,
      title: "8. Third Party Services",
      content: "We interface with selected AI API services and infrastructure providers to host sandboxed runner nodes. We do not sell or trade your workspace telemetry to third-party marketing companies."
    },
    {
      icon: Key,
      title: "9. Google OAuth",
      content: "If you log in using Google OAuth, we fetch only the necessary identity scope (email, public profile name, avatar). Google authentication data is handled through secure redirection protocols and is never stored as a raw password on our servers."
    },
    {
      icon: Key,
      title: "10. GitHub OAuth",
      content: "If you log in using GitHub OAuth, we access your authorized primary email and developer handle to initialize your VeriNova account workspace. You can manage or revoke these permissions in your GitHub settings panel."
    },
    {
      icon: Info,
      title: "11. User Rights",
      content: "You retain full ownership rights over your system models and verification rules. You have the right to request exports of your task histories or request full account erasure at any time."
    },
    {
      icon: Trash,
      title: "12. Data Retention",
      content: "We retain verification statistics and logs for active user profiles. If you delete a task or cancel your account, the related evidence files, notifications, and verification logs are permanently purged from our PostgreSQL database tables."
    },
    {
      icon: Lock,
      title: "13. Contact Information",
      content: "For privacy questions, data deletion queries, or security reports, please contact our data safety officer at privacy@verinova.ai."
    }
  ];

  return (
    <div className="min-h-screen bg-[#08120F] text-white flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden bg-grid-pattern">
        {/* Background Gradients */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#22C55E]/2 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#4ADE80]/2 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
              Data Privacy
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
              Privacy Policy
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
