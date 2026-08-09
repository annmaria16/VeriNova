import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardCardProps {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: ReactNode;
  accentColor: "green" | "emerald" | "yellow" | "red" | "blue";
}

export default function DashboardCard({
  title,
  value,
  change,
  trend,
  icon,
  accentColor,
}: DashboardCardProps) {
  const bgClasses = {
    green: "bg-dash-card border-dash-border shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:border-dash-primary/30",
    emerald: "bg-dash-card border-dash-border shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:border-[#10B981]/30",
    yellow: "bg-dash-card border-dash-border shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:border-yellow-500/30",
    red: "bg-dash-card border-dash-border shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:border-red-500/30",
    blue: "bg-dash-card border-dash-border shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:border-blue-500/30",
  };

  const textTrendClasses = {
    up: "text-dash-primary",
    down: "text-red-500",
    neutral: "text-amber-500",
  };

  const iconClasses = {
    green: "bg-dash-primary/10 text-dash-primary border border-dash-primary/20",
    emerald: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20",
    yellow: "bg-yellow-500/10 text-amber-500 border border-yellow-500/20",
    red: "bg-red-500/10 text-red-500 border border-red-500/20",
    blue: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`border rounded-2xl p-4.5 transition-all duration-300 flex flex-col justify-between ${bgClasses[accentColor]}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Icon & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconClasses[accentColor]}`}>
            {icon}
          </div>
          <div className="text-left min-w-0">
            <span className="text-[10px] font-bold text-dash-secondary uppercase tracking-wider block truncate">
              {title}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-dash-text leading-none tracking-tight mt-1 truncate">
              {value}
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-3.5 text-left border-t border-dash-border/40 pt-2.5">
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${textTrendClasses[trend]}`}>
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5" />}
          {trend === "neutral" && <Minus className="w-3.5 h-3.5" />}
          <span>{change}</span>
        </div>
      </div>
    </motion.div>
  );
}
