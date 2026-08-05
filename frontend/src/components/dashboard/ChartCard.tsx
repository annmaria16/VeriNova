import { motion } from "framer-motion";

interface ChartCardProps {
  title: string;
  subtitle: string;
  type: "success-rate" | "status-donut" | "weekly-bar" | "monthly-line";
  total?: number;
  verified?: number;
  pending?: number;
  failed?: number;
  tasks?: any[];
}

export default function ChartCard({
  title,
  subtitle,
  type,
  total = 0,
  verified = 0,
  pending = 0,
  failed = 0,
  tasks = [],
}: ChartCardProps) {
  // Chart rendering helpers
  const renderSuccessRate = () => {
    // 6 data points showing an area curve from 92% to 99%
    const points = "0,80 80,45 160,50 240,25 320,15 400,10";
    const fillPoints = `0,120 ${points} 400,120`;

    return (
      <svg className="w-full h-32" viewBox="0 0 400 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGlowCard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Horizontal grid lines */}
        <line x1="0" y1="30" x2="400" y2="30" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="60" x2="400" y2="60" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="0" y1="90" x2="400" y2="90" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
        
        {/* Glow Area */}
        <polygon points={fillPoints} fill="url(#areaGlowCard)" />
        
        {/* Stroke Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        
        {/* Endpoint dots */}
        <circle cx="0" cy="80" r="3.5" fill="#10B981" />
        <circle cx="80" cy="45" r="3.5" fill="#10B981" />
        <circle cx="160" cy="50" r="3.5" fill="#10B981" />
        <circle cx="240" cy="25" r="3.5" fill="#10B981" />
        <circle cx="320" cy="15" r="3.5" fill="#10B981" />
        <circle cx="400" cy="10" r="4.5" fill="#34D399" stroke="#111827" strokeWidth="1.5" />
      </svg>
    );
  };

  const renderStatusDonut = () => {
    const verifiedPercent = total > 0 ? (verified / total) * 100 : 60;
    const pendingPercent = total > 0 ? (pending / total) * 100 : 25;
    const failedPercent = total > 0 ? (failed / total) * 100 : 15;

    // Donut math: Circumference is 2 * PI * 50 = 314.16
    const circ = 314.16;
    const vOffset = circ - (circ * verifiedPercent) / 100;
    const pOffset = circ - (circ * pendingPercent) / 100;
    const fOffset = circ - (circ * failedPercent) / 100;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
        {/* SVG Circle Stack */}
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background base */}
            <circle cx="60" cy="60" r="50" fill="transparent" stroke="#374151" strokeWidth="9" />
            
            {/* Pending segment (yellow) */}
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="transparent"
              stroke="#F59E0B"
              strokeWidth="9"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: pOffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="origin-center"
              style={{ transform: `rotate(${(verifiedPercent / 100) * 360}deg)` }}
            />

            {/* Failed segment (red) */}
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="transparent"
              stroke="#EF4444"
              strokeWidth="9"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: fOffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="origin-center"
              style={{ transform: `rotate(${((verifiedPercent + pendingPercent) / 100) * 360}deg)` }}
            />

            {/* Verified segment (emerald-green) */}
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="transparent"
              stroke="#10B981"
              strokeWidth="10"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: vOffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-dash-secondary font-bold uppercase tracking-wider">Total</span>
            <span className="text-lg font-black text-white">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 text-left text-xs font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full" />
            <span className="text-white">Verified ({verifiedPercent.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#F59E0B] rounded-full" />
            <span className="text-white">Pending ({pendingPercent.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#EF4444] rounded-full" />
            <span className="text-white">Failed ({failedPercent.toFixed(0)}%)</span>
          </div>
        </div>
      </div>
    );
  };

  const renderWeeklyBar = () => {
    // 7 height items for Monday - Sunday
    const barHeights = [45, 65, 30, 85, 95, 55, 40];

    return (
      <div className="flex items-end justify-between h-32 px-2 pt-4">
        {barHeights.map((h, i) => {
          const days = ["M", "T", "W", "T", "F", "S", "S"];
          return (
            <div key={i} className="flex flex-col items-center flex-1 space-y-2">
              <div className="w-4 bg-dash-card rounded-t-md h-full flex items-end relative group border border-dash-border">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="w-full bg-gradient-to-t from-[#14532D] to-[#10B981] rounded-t-[4px] shadow-[0_0_10px_rgba(16,185,129,0.15)] group-hover:from-[#10B981] group-hover:to-[#34D399]"
                />
              </div>
              <span className="text-[9px] text-dash-secondary font-bold">{days[i]}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyLine = () => {
    // Calculates last 4 months tasks verified trends
    const getTasksByMonth = () => {
      const counts = [0, 0, 0, 0];
      const now = new Date();
      
      tasks.forEach((t) => {
        if (t.status !== "Verified") return;
        const taskDate = new Date(t.date);
        const diffMonths =
          (now.getFullYear() - taskDate.getFullYear()) * 12 +
          now.getMonth() -
          taskDate.getMonth();
        if (diffMonths >= 0 && diffMonths < 4) {
          counts[3 - diffMonths]++;
        }
      });

      // Default fallback counts if DB is empty
      if (counts.every((c) => c === 0)) {
        return [8, 14, 25, tasks.filter((t) => t.status === "Verified").length || 32];
      }
      return counts;
    };

    const counts = getTasksByMonth();
    const maxVal = Math.max(...counts, 10);
    const getSvgY = (val: number) => 100 - (val / maxVal) * 80;

    const points = `10,${getSvgY(counts[0])} 130,${getSvgY(counts[1])} 250,${getSvgY(counts[2])} 370,${getSvgY(counts[3])}`;

    const months = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString("en-US", { month: "short" }));
    }

    return (
      <div className="space-y-2">
        <svg className="w-full h-32" viewBox="0 0 380 110">
          {/* Horizontal lines */}
          <line x1="0" y1="20" x2="380" y2="20" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="60" x2="380" y2="60" stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="100" x2="380" y2="100" stroke="#374151" strokeWidth="1" />

          {/* Stroke Path */}
          <motion.polyline
            points={points}
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2 }}
          />

          {/* Data point circles */}
          <circle cx="10" cy={getSvgY(counts[0])} r="4.5" fill="#10B981" stroke="#111827" strokeWidth="1.5" />
          <circle cx="130" cy={getSvgY(counts[1])} r="4.5" fill="#10B981" stroke="#111827" strokeWidth="1.5" />
          <circle cx="250" cy={getSvgY(counts[2])} r="4.5" fill="#10B981" stroke="#111827" strokeWidth="1.5" />
          <circle cx="370" cy={getSvgY(counts[3])} r="5.5" fill="#34D399" stroke="#111827" strokeWidth="2" />
        </svg>

        {/* Labels */}
        <div className="flex justify-between px-2 text-[9px] text-dash-secondary font-bold">
          {months.map((m, idx) => (
            <span key={idx}>{m} ({counts[idx]} runs)</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-dash-sidebar/20 border border-dash-border/60 rounded-2xl p-5 shadow-xl backdrop-blur-md text-left flex flex-col justify-between">
      <div>
        <h3 className="font-black text-white text-sm tracking-tight">{title}</h3>
        <p className="text-[10px] text-dash-secondary mt-0.5 font-bold uppercase tracking-wider">{subtitle}</p>
      </div>

      <div className="mt-6 flex-1">
        {type === "success-rate" && renderSuccessRate()}
        {type === "status-donut" && renderStatusDonut()}
        {type === "weekly-bar" && renderWeeklyBar()}
        {type === "monthly-line" && renderMonthlyLine()}
      </div>
    </div>
  );
}
