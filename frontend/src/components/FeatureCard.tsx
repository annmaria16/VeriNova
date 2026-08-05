import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export default function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className="glass-panel glass-panel-hover group relative rounded-2xl p-8 flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      {/* Decorative Gradient Background (visible on hover) */}
      <div className="absolute -inset-px bg-gradient-to-br from-[#22C55E]/0 via-[#4ADE80]/0 to-[#22C55E]/0 group-hover:from-[#22C55E]/20 group-hover:via-transparent group-hover:to-[#14532D]/30 rounded-2xl transition-all duration-500 pointer-events-none -z-10" />

      {/* Floating back-glow particle inside card */}
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-[#22C55E]/5 blur-[25px] rounded-full group-hover:bg-[#4ADE80]/15 group-hover:scale-125 transition-all duration-500 pointer-events-none" />

      <div>
        {/* Animated Icon Ring */}
        <div className="w-12 h-12 rounded-xl bg-[#10211C] border border-[#14532D] flex items-center justify-center text-[#22C55E] group-hover:text-white group-hover:bg-[#22C55E] group-hover:border-[#22C55E] group-hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-300 mb-6">
          <Icon size={24} className="group-hover:rotate-6 transition-transform" />
        </div>

        {/* Feature Title */}
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#4ADE80] transition-colors duration-300">
          {title}
        </h3>

        {/* Feature Description */}
        <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
          {description}
        </p>
      </div>

      {/* Learn More Action Button */}
      <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#22C55E] group-hover:text-[#4ADE80] transition-colors duration-300">
        <span>Learn More</span>
        <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}
