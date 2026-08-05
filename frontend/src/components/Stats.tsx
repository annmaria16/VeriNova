import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, Target, Cpu, TrendingUp } from "lucide-react";

interface CounterProps {
  target: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

function Counter({ target, suffix = "", decimals = 0, duration = 1.5 }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Ease out quad
      const easedProgress = progress * (2 - progress);
      setCount(easedProgress * target);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration, isInView]);

  return <span ref={ref}>{count.toFixed(decimals)}{suffix}</span>;
}

export default function Stats() {
  const statItems = [
    {
      id: "tasks",
      title: "Tasks Verified",
      value: 10000,
      suffix: "+",
      decimals: 0,
      icon: ShieldCheck,
      description: "AI outputs verified in production.",
    },
    {
      id: "accuracy",
      title: "Verification Accuracy",
      value: 99.8,
      suffix: "%",
      decimals: 1,
      icon: Target,
      description: "Proven false-positive detection rate.",
    },
    {
      id: "apis",
      title: "APIs Monitored",
      value: 50,
      suffix: "+",
      decimals: 0,
      icon: Cpu,
      description: "Different tool integrations supported.",
    },
    {
      id: "confidence",
      title: "Average Confidence",
      value: 95,
      suffix: "%",
      decimals: 0,
      icon: TrendingUp,
      description: "Self-improving validation threshold.",
    },
  ];

  return (
    <section className="relative py-12 bg-[#08120F] border-y border-[#14532D]/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#22C55E]/2 to-transparent pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="glass-panel group relative rounded-2xl p-6 flex flex-col justify-between hover:border-[#22C55E]/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all duration-300 overflow-hidden"
              >
                {/* Micro-glow behind hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#22C55E]/5 to-transparent rounded-bl-full group-hover:from-[#22C55E]/15 transition-all duration-300"></div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold tracking-wider text-gray-400 uppercase group-hover:text-gray-300 transition-colors">
                    {item.title}
                  </span>
                  <div className="p-2.5 rounded-xl bg-[#10211C] border border-[#14532D] text-[#22C55E] group-hover:border-[#22C55E] group-hover:bg-[#22C55E]/10 transition-all duration-300">
                    <Icon size={20} />
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    <Counter
                      target={item.value}
                      suffix={item.suffix}
                      decimals={item.decimals}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-2 font-medium leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
