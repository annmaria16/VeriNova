import { ArrowRight, Play, Shield, Cpu, Lock, Link2, FileCode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Hero() {
  const [pulseCount, setPulseCount] = useState(0);

  // Trigger pulse animation every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCount((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Floating particles coordinate data
  const particles = [
    { id: 1, x: "15%", y: "20%", size: 6, delay: 0 },
    { id: 2, x: "85%", y: "25%", size: 8, delay: 1 },
    { id: 3, x: "75%", y: "80%", size: 5, delay: 0.5 },
    { id: 4, x: "20%", y: "75%", size: 7, delay: 1.5 },
    { id: 5, x: "50%", y: "15%", size: 6, delay: 2.2 },
    { id: 6, x: "10%", y: "50%", size: 5, delay: 0.8 },
  ];

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#08120F] pt-28 lg:pt-20 pb-16"
    >
      {/* Subtle Grid Overlay and Glowing Backgrounds */}
      <div className="absolute inset-0 bg-grid-pattern opacity-100 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#22C55E]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#4ADE80]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full z-10 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-left"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10211C] border border-[#14532D] shadow-[0_0_15px_rgba(34,197,94,0.1)] mb-6">
            <span className="text-yellow-400 text-xs">⭐</span>
            <span className="text-[#4ADE80] text-xs font-bold uppercase tracking-wider">
              AI Outcome Verification Platform
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
            Verify AI Outcomes
            <span className="block mt-2 bg-gradient-to-r from-[#22C55E] to-[#4ADE80] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              Before You Trust Them
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-gray-400 text-base sm:text-lg leading-relaxed max-w-xl">
            Empower your automated systems with independent validation. VeriNova
            uses multi-source evidence collection, confidence scoring, and cryptographic logs
            to certify LLM decisions in real time.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              to="/register"
              className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] text-[#08120F] font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(74,222,128,0.6)] transform hover:scale-[1.02] transition-all duration-300"
            >
              Get Started
              <ArrowRight size={20} />
            </Link>

            <button className="border border-[#14532D] bg-[#10211C]/40 hover:bg-[#10211C] text-gray-300 hover:text-white px-8 py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 group">
              <span className="p-1 rounded-full bg-[#14532D] text-[#22C55E] group-hover:bg-[#22C55E] group-hover:text-[#08120F] transition-all duration-300">
                <Play size={14} fill="currentColor" />
              </span>
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Right Cybersecurity Dashboard Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative flex justify-center items-center w-full min-h-[450px]"
        >
          {/* Main Visual Wrapper with Glassmorphism */}
          <div className="relative w-full max-w-[420px] aspect-square rounded-full border border-[#14532D]/40 bg-[#10211C]/20 shadow-[0_0_60px_rgba(34,197,94,0.05)] backdrop-blur-sm flex items-center justify-center">
            {/* Pulsing glow ring from center */}
            <div className="absolute inset-0 bg-radial-gradient from-[#22C55E]/10 to-transparent rounded-full pointer-events-none"></div>

            {/* Concentric Rotating Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute w-[92%] h-[92%] rounded-full border border-dashed border-[#14532D]/30"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute w-[80%] h-[80%] rounded-full border border-dashed border-[#22C55E]/20"
            />
            <motion.div
              animate={{ rotate: 180 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute w-[68%] h-[68%] rounded-full border border-double border-[#14532D]/40"
            />

            {/* Interactive Grid Lines connecting nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Central connection lines */}
              <line x1="50%" y1="50%" x2="50%" y2="28%" stroke="#14532D" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="50%" y1="50%" x2="25%" y2="58%" stroke="#14532D" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="50%" y1="50%" x2="75%" y2="58%" stroke="#14532D" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Upper Network Lines */}
              <line x1="33%" y1="28%" x2="67%" y2="28%" stroke="#22C55E" strokeWidth="1.5" opacity="0.6" />
              <line x1="33%" y1="28%" x2="20%" y2="40%" stroke="#14532D" strokeWidth="1.5" />
              <line x1="67%" y1="28%" x2="80%" y2="40%" stroke="#14532D" strokeWidth="1.5" />

              {/* Connection between AI node and Shield */}
              <line x1="50%" y1="28%" x2="50%" y2="68%" stroke="#4ADE80" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
            </svg>

            {/* Pulse waves triggered on interval */}
            <AnimatePresence>
              {pulseCount >= 0 && (
                <motion.div
                  key={pulseCount}
                  initial={{ scale: 0.1, opacity: 0.8 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3.5, ease: "easeOut" }}
                  className="absolute w-[60%] h-[60%] rounded-full border-2 border-[#4ADE80] shadow-[0_0_30px_rgba(74,222,128,0.4)] pointer-events-none"
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {pulseCount >= 0 && (
                <motion.div
                  key={pulseCount + 100}
                  initial={{ scale: 0.1, opacity: 0.6 }}
                  animate={{ scale: 1.1, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.5, delay: 0.5, ease: "easeOut" }}
                  className="absolute w-[60%] h-[60%] rounded-full border border-[#22C55E] pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Central Network Node: "AI" Ring (Upper Center) */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[18%] left-[36%] right-[36%] aspect-video bg-[#10211C] border border-[#22C55E] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)] z-20"
            >
              <div className="flex items-center gap-1.5">
                <Cpu size={14} className="text-[#4ADE80] animate-pulse" />
                <span className="text-white text-xs font-black tracking-widest">AI DECISION</span>
              </div>
            </motion.div>

            {/* Central Verification Node: "Shield Check" (Lower Center) */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 5, delay: 1, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[20%] w-24 h-24 rounded-full border-2 border-[#4ADE80] bg-[#08120F] flex flex-col items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.3)] z-20"
            >
              <Shield size={36} className="text-[#4ADE80] fill-[#4ADE80]/15" />
              <span className="text-[10px] font-black text-gray-300 mt-1 tracking-wider">VERIFIED</span>
            </motion.div>

            {/* Orbital Network Nodes */}
            {/* Top Left: API Evidence */}
            <div className="absolute top-[22%] left-[10%] w-10 h-10 rounded-lg bg-[#10211C] border border-[#14532D] flex items-center justify-center shadow-[0_0_15px_rgba(20,83,45,0.4)] hover:border-[#22C55E] transition-colors cursor-pointer group">
              <Link2 size={16} className="text-gray-400 group-hover:text-[#22C55E] transition-colors" />
            </div>

            {/* Top Right: Logs */}
            <div className="absolute top-[22%] right-[10%] w-10 h-10 rounded-lg bg-[#10211C] border border-[#14532D] flex items-center justify-center shadow-[0_0_15px_rgba(20,83,45,0.4)] hover:border-[#22C55E] transition-colors cursor-pointer group">
              <FileCode size={16} className="text-gray-400 group-hover:text-[#22C55E] transition-colors" />
            </div>

            {/* Left Mid: Secure Vault */}
            <div className="absolute top-[48%] left-[2%] w-10 h-10 rounded-lg bg-[#10211C] border border-[#14532D] flex items-center justify-center shadow-[0_0_15px_rgba(20,83,45,0.4)] hover:border-[#22C55E] transition-colors cursor-pointer group">
              <Lock size={16} className="text-gray-400 group-hover:text-[#22C55E] transition-colors" />
            </div>

            {/* Right Mid: Real-time Monitor */}
            <div className="absolute top-[48%] right-[2%] w-10 h-10 rounded-lg bg-[#10211C] border border-[#14532D] flex items-center justify-center shadow-[0_0_15px_rgba(20,83,45,0.4)] hover:border-[#22C55E] transition-colors cursor-pointer group">
              <Cpu size={16} className="text-gray-400 group-hover:text-[#22C55E] transition-colors" />
            </div>

            {/* Scanning Laser Line */}
            <motion.div
              animate={{ top: ["15%", "85%", "15%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#4ADE80] to-transparent shadow-[0_0_12px_#4ADE80] opacity-70 z-10 pointer-events-none"
            />
          </div>

          {/* Drifting Background Particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              animate={{
                y: [0, -25, 0],
                x: [0, 15, 0],
                opacity: [0.3, 0.9, 0.3],
              }}
              transition={{
                duration: 6 + particle.size * 0.5,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
              style={{
                top: particle.y,
                left: particle.x,
                width: particle.size,
                height: particle.size,
              }}
              className="absolute rounded-full bg-[#4ADE80]/30 shadow-[0_0_8px_#4ADE80] pointer-events-none"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}