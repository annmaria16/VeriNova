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
      <div className="absolute -inset-px bg-gradient-to-br from-[#FF6B00]/0 via-transparent to-[#FF8A1F]/0 group-hover:from-[#FF6B00]/5 group-hover:to-[#FF8A1F]/10 rounded-2xl transition-all duration-500 pointer-events-none -z-10" />

      {/* Floating back-glow particle inside card */}
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-[#FF6B00]/2 blur-[25px] rounded-full group-hover:bg-[#FF8A1F]/10 group-hover:scale-125 transition-all duration-500 pointer-events-none" />

      <div className="text-left">
        {/* Animated Icon Ring */}
        <div className="w-12 h-12 rounded-xl bg-dash-card border border-dash-border flex items-center justify-center text-dash-primary group-hover:text-white group-hover:bg-[#FF6B00] group-hover:border-[#FF6B00] group-hover:shadow-[0_8px_20px_rgba(255,107,0,0.25)] transition-all duration-300 mb-6">
          <Icon size={24} className="group-hover:rotate-6 transition-transform" />
        </div>

        {/* Feature Title */}
        <h3 className="text-xl font-black text-dash-text mb-3 group-hover:text-dash-primary transition-colors duration-300">
          {title}
        </h3>

        {/* Feature Description */}
        <p className="text-dash-secondary text-sm leading-relaxed font-semibold transition-colors duration-300">
          {description}
        </p>
      </div>

      {/* Learn More Action Button */}
      <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-dash-primary group-hover:text-dash-hover transition-colors duration-300">
        <span>Learn More</span>
        <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}
