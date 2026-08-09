import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Loader2, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import { useTheme } from "../../hooks/useTheme";

export function VerificationActivityChart() {
  const [filter, setFilter] = useState<"today" | "last_7_days" | "last_30_days" | "this_month">("last_7_days");
  const [chartData, setChartData] = useState<{ labels: string[]; values: number[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/activity?filter=${filter}`);
      setChartData(res.data);
    } catch (err) {
      console.error("Failed to fetch chart activity data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, [filter]);

  // Support live updates on dashboard events
  useEffect(() => {
    const handleRefresh = () => {
      fetchActivityData();
    };
    window.addEventListener("dashboard-refresh", handleRefresh);
    return () => window.removeEventListener("dashboard-refresh", handleRefresh);
  }, [filter]);

  if (loading) {
    return (
      <div className="bg-dash-card border border-dash-border rounded-2xl p-5 text-left flex flex-col justify-between h-[300px] shadow-sm animate-pulse">
        <div className="flex items-center justify-between pb-3.5 border-b border-dash-border">
          <div className="h-4 bg-dash-bg rounded w-1/3"></div>
          <div className="h-6 bg-dash-bg rounded w-16"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-dash-primary animate-spin" />
        </div>
      </div>
    );
  }

  const hasData = chartData && chartData.values.length > 0 && chartData.values.some(v => v > 0);

  if (!hasData) {
    return (
      <div className="bg-dash-card border border-dash-border rounded-2xl p-5 text-left flex flex-col justify-between h-[300px] shadow-sm">
        <div className="flex items-center justify-between pb-3.5 border-b border-dash-border">
          <h3 className="text-sm font-black text-dash-text tracking-tight">Confidence Trend</h3>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="appearance-none pr-8 pl-3 py-1 bg-dash-bg border border-dash-border rounded-lg text-[10px] font-black text-dash-secondary hover:text-dash-primary transition-colors cursor-pointer uppercase tracking-wider outline-none focus:border-dash-primary"
            >
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
            <ChevronDown className="w-3 h-3 text-dash-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-dash-secondary/60" />
          <span className="text-xs text-dash-secondary font-bold">No confidence trend data available.</span>
        </div>
      </div>
    );
  }

  const values = chartData!.values;
  const labels = chartData!.labels;
  const N = values.length;

  const maxVal = Math.max(...values);
  const scaleMax = maxVal < 5 ? 5 : maxVal;

  const yLabels = [
    scaleMax,
    Math.round(scaleMax * 0.75),
    Math.round(scaleMax * 0.5),
    Math.round(scaleMax * 0.25),
    0
  ];

  // Map values to viewBox coordinates (X: 10 to 370, Y: 10 to 100)
  const pointsStr = values.map((val, i) => {
    const x = N > 1 ? 10 + (360 / (N - 1)) * i : 190;
    const y = 100 - (90 / scaleMax) * val;
    return `${x},${y}`;
  }).join(" ");

  const areaPointsStr = N > 1 
    ? `10,110 ${pointsStr} 370,110`
    : `190,110 ${pointsStr} 190,110`;

  // Select key labels for axis to prevent overflow
  const showLabels = N <= 7
    ? labels
    : [labels[0], labels[Math.floor(N / 2)], labels[N - 1]];

  return (
    <div className="bg-dash-card border border-dash-border rounded-2xl p-5 text-left flex flex-col justify-between h-[300px] shadow-sm">
      <div className="flex items-center justify-between pb-3.5 border-b border-dash-border">
        <h3 className="text-sm font-black text-dash-text tracking-tight">Confidence Trend</h3>
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="appearance-none pr-8 pl-3 py-1 bg-dash-bg border border-dash-border rounded-lg text-[10px] font-black text-dash-secondary hover:text-dash-primary transition-colors cursor-pointer uppercase tracking-wider outline-none focus:border-dash-primary"
          >
            <option value="today">Today</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
          </select>
          <ChevronDown className="w-3 h-3 text-dash-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 flex gap-4 pt-5 select-none relative">
        {/* Y Axis labels */}
        <div className="flex flex-col justify-between text-[9px] font-black text-dash-secondary w-6 pb-6">
          {yLabels.map((lbl, idx) => (
            <span key={idx} className="text-right">{lbl}</span>
          ))}
        </div>

        {/* Canvas curves */}
        <div className="flex-1 flex flex-col justify-between relative pb-6">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
            {/* Grid lines */}
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="border-b border-dash-border/60 w-full h-0" />
            ))}
          </div>

          <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 380 110" preserveAspectRatio="none">
            <defs>
              <linearGradient id="glowCurve" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area gradient underlay */}
            <polygon points={areaPointsStr} fill="url(#glowCurve)" />

            {/* Line Path */}
            <motion.polyline
              points={pointsStr}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            {/* Key interactive points */}
            {values.map((val, i) => {
              const x = N > 1 ? 10 + (360 / (N - 1)) * i : 190;
              const y = 100 - (90 / scaleMax) * val;
              const isMajor = i === 0 || i === N - 1 || val === maxVal;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isMajor ? 4.5 : 3.5}
                  fill={isMajor ? "#22D3EE" : "#8B5CF6"}
                  stroke={isMajor ? (theme === "dark" ? "#0A0D18" : "#FFFFFF") : "none"}
                  strokeWidth={isMajor ? 1.5 : 0}
                />
              );
            })}
          </svg>

          {/* X Axis labels */}
          <div className="absolute bottom-0 inset-x-0 flex justify-between text-[9px] font-black text-dash-secondary px-1">
            {showLabels.map((lbl, idx) => (
              <span key={idx} className="text-center min-w-[30px]">{lbl}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskStatusDonutProps {
  total: number;
  verified: number;
  pending: number;
  running: number;
  failed: number;
}

export function TaskStatusDonut({ total, verified, pending, running, failed }: TaskStatusDonutProps) {
  const { theme } = useTheme();

  if (total === 0) {
    return (
      <div className="bg-dash-card border border-dash-border rounded-2xl p-5 text-left flex flex-col justify-between h-[300px] shadow-sm">
        <div className="flex items-center justify-between pb-3.5 border-b border-dash-border mb-3">
          <h3 className="text-sm font-black text-dash-text tracking-tight">Task Status</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-dash-secondary/60" />
          <span className="text-xs text-dash-secondary font-bold">No verification data available.</span>
        </div>
      </div>
    );
  }

  const verifiedPercent = Math.round((verified / total) * 100);
  const pendingPercent = Math.round((pending / total) * 100);
  const runningPercent = Math.round((running / total) * 100);
  const failedPercent = Math.round((failed / total) * 100);

  // Circle path circumference: 2 * Math.PI * r = 2 * 3.14159 * 42 = 263.89
  const circ = 263.89;
  
  // Percent slice sizes
  const vOffset = circ - (circ * verifiedPercent) / 100;
  const pOffset = circ - (circ * pendingPercent) / 100;
  const rOffset = circ - (circ * runningPercent) / 100;
  const fOffset = circ - (circ * failedPercent) / 100;

  const baseStroke = theme === "dark" ? "rgba(255, 255, 255, 0.04)" : "#E2E8F0";

  return (
    <div className="bg-dash-card border border-dash-border rounded-2xl p-5 text-left flex flex-col justify-between h-[300px] shadow-sm">
      <div className="flex items-center justify-between pb-3.5 border-b border-dash-border mb-3">
        <h3 className="text-sm font-black text-dash-text tracking-tight">Task Status</h3>
      </div>

      <div className="flex-1 flex items-center justify-between gap-6 px-1">
        {/* SVG Circle */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background base circle */}
            <circle cx="50" cy="50" r="42" fill="transparent" stroke={baseStroke} strokeWidth="8" />

            {/* Verified segment (green) */}
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="transparent"
              stroke="#22C55E"
              strokeWidth="9.5"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: vOffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="origin-center"
            />

            {/* Pending segment (yellow) */}
            <motion.circle
              cx="50"
              cy="50"
              r="42"
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

            {/* Running segment (cyan) */}
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="transparent"
              stroke="#22D3EE"
              strokeWidth="9"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: rOffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="origin-center"
              style={{ transform: `rotate(${((verifiedPercent + pendingPercent) / 100) * 360}deg)` }}
            />

            {/* Failed segment (red) */}
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="transparent"
              stroke="#EF4444"
              strokeWidth="9"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: fOffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="origin-center"
              style={{ transform: `rotate(${((verifiedPercent + pendingPercent + runningPercent) / 100) * 360}deg)` }}
            />
          </svg>

          {/* Inner Total numbers */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
            <span className="text-[14px] font-black text-dash-text leading-none">
              {total.toLocaleString()}
            </span>
            <span className="text-[9px] text-dash-secondary font-black uppercase tracking-wider mt-1">
              Total
            </span>
          </div>
        </div>

        {/* Legend listing */}
        <div className="flex-1 space-y-2.5 text-xs font-bold pl-2 select-none">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#22C55E] rounded-full" />
              <span className="text-dash-secondary">Verified</span>
            </div>
            <span className="text-dash-text font-mono">{verifiedPercent}% ({verified})</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#F59E0B] rounded-full" />
              <span className="text-dash-secondary">Pending</span>
            </div>
            <span className="text-dash-text font-mono">{pendingPercent}% ({pending})</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#22D3EE] rounded-full" />
              <span className="text-dash-secondary">Running</span>
            </div>
            <span className="text-dash-text font-mono">{runningPercent}% ({running})</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#EF4444] rounded-full" />
              <span className="text-dash-secondary">Failed</span>
            </div>
            <span className="text-dash-text font-mono">{failedPercent}% ({failed})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
