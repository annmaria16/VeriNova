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
    <div className="min-h-screen bg-dash-bg text-dash-text flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden bg-grid-pattern">
        {/* Background Gradients */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#FF6B00]/2 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#FF8C42]/2 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto relative z-10 text-left">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
              Who We Are
            </span>
            <h1 className="text-4xl sm:text-6xl font-black text-dash-text mt-3 tracking-tight leading-none">
              About VeriNova AI
            </h1>
            <p className="text-dash-secondary text-base sm:text-lg mt-4 max-w-2xl mx-auto leading-relaxed font-bold">
              VeriNova AI is the first outcome verification assistant built specifically to shopping search, book, purchase, and verify outcomes on autonomous AI platforms.
            </p>
          </motion.div>

          {/* Grid Layout: Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-panel bg-dash-card border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-md"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B00]/5 blur-[20px] rounded-full"></div>
              <div className="w-12 h-12 rounded-xl bg-dash-bg border border-dash-border flex items-center justify-center text-dash-primary mb-6">
                <Target size={24} />
              </div>
              <h2 className="text-2xl font-black text-dash-text tracking-wide mb-4">Our Mission</h2>
              <p className="text-dash-secondary text-sm leading-relaxed font-semibold">
                To build the commerce and booking infrastructure that guarantees alignment, accountability, and safety in autonomous AI interactions. We aim to ensure that generative agents execute correct bookings, find verified deals, and prevent incorrect charges.
              </p>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-panel bg-dash-card border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-md"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF8C42]/5 blur-[20px] rounded-full"></div>
              <div className="w-12 h-12 rounded-xl bg-dash-bg border border-dash-border flex items-center justify-center text-dash-primary mb-6">
                <Eye size={24} />
              </div>
              <h2 className="text-2xl font-black text-dash-text tracking-wide mb-4">Our Vision</h2>
              <p className="text-dash-secondary text-sm leading-relaxed font-semibold">
                A future where users can describe booking or shopping tasks and rely on AI to securely verify outcomes. We visualize a seamless AI Personal Commerce layer where every ticket reservation, product buy order, or payment invoice is audited, validated, and logged.
              </p>
            </motion.div>
          </div>

          {/* Platform Overview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="glass-panel bg-dash-card border border-dash-border rounded-2xl p-8 sm:p-10 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF6B00]/5 blur-[35px] rounded-full"></div>
            <div className="flex flex-col gap-6">
              <div>
                <span className="text-dash-primary text-xs font-mono tracking-wider uppercase font-bold">System Architecture</span>
                <h2 className="text-3xl font-black text-dash-text tracking-tight mt-1">Outcome Verification Assistant</h2>
              </div>
              <p className="text-dash-secondary text-sm sm:text-base leading-relaxed font-semibold">
                VeriNova AI introduces an isolated verification layer between LLMs and commercial booking systems. Through sandbox mock execution tests, automated invoice parsing, and strict transaction rule checkers, the assistant flags abnormalities before final purchases.
              </p>

              {/* Three Pillars */}
              <div className="grid sm:grid-cols-3 gap-6 mt-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-dash-text font-bold">
                    <Shield size={16} className="text-dash-primary" />
                    <span>Secure Sandboxing</span>
                  </div>
                  <p className="text-dash-secondary text-xs leading-relaxed font-medium">
                    We trace purchase decisions inside isolated mock sandboxes before executing transaction steps.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-dash-text font-bold">
                    <Cpu size={16} className="text-dash-primary" />
                    <span>Real-Time Audit</span>
                  </div>
                  <p className="text-dash-secondary text-xs leading-relaxed font-medium">
                    Continuously checks product prices, ticket bookings, and inventory conditions to guarantee exact matches.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5 text-dash-text font-bold">
                    <Layers size={16} className="text-dash-primary" />
                    <span>Cryptographic Receipts</span>
                  </div>
                  <p className="text-dash-secondary text-xs leading-relaxed font-medium">
                    Compiles tamper-proof signed execution receipts, securing transactions and logs against modifications.
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
