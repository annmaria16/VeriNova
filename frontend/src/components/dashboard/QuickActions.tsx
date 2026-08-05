import { PlayCircle, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";

interface QuickActionsProps {
  setActiveModule: (mod: string) => void;
}

export default function QuickActions({ setActiveModule }: QuickActionsProps) {
  const actions = [
    {
      title: "New Verification",
      description: "Start a new outcome verification run",
      icon: <PlayCircle className="w-6 h-6 text-dash-primary" />,
      module: "new-verification",
    },
    {
      title: "Upload Evidence",
      description: "Upload transaction logs, screenshots, or code metrics",
      icon: <UploadCloud className="w-6 h-6 text-[#10B981]" />,
      module: "ai-evidence",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {actions.map((act) => (
        <motion.button
          key={act.title}
          whileHover={{ y: -2, scale: 1.01 }}
          onClick={() => setActiveModule(act.module)}
          className="flex items-start gap-4 p-5 rounded-2xl bg-dash-card border border-dash-border hover:border-dash-primary/40 transition-all duration-300 text-left w-full cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.15)] group"
        >
          <div className="p-3 bg-dash-sidebar rounded-xl border border-dash-border group-hover:border-dash-primary/30 transition-colors">
            {act.icon}
          </div>
          <div>
            <h4 className="text-sm font-black text-white group-hover:text-dash-primary transition-colors">
              {act.title}
            </h4>
            <p className="text-xs text-dash-secondary mt-1 font-semibold leading-relaxed">
              {act.description}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
