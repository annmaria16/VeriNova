import { ShieldCheck, BarChart3, Link2, FileText, Activity, Lock } from "lucide-react";
import FeatureCard from "./FeatureCard";

export default function Features() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Outcome Verification",
      description: "Independently validates AI-generated results through execution testing and consensus models.",
    },
    {
      icon: BarChart3,
      title: "Confidence Scoring",
      description: "Calculates strict certainty quotients using semantic search, heuristics, and execution path matching.",
    },
    {
      icon: Link2,
      title: "API Evidence",
      description: "Integrates directly with upstream tools to pull receipts, JSON responses, and HTTP response metadata.",
    },
    {
      icon: FileText,
      title: "Execution Logs",
      description: "Compiles complete, tamper-proof audit trails detailing exact prompt structures, parameters, and tokens.",
    },
    {
      icon: Activity,
      title: "AI Monitoring",
      description: "Tracks real-time system performance, drift metrics, confidence drop alerts, and model fallback states.",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Protects sensitive data layers with zero-trust architectures, end-to-end data encryption, and HIPAA compliance.",
    },
  ];

  return (
    <section id="features" className="relative py-24 bg-dash-bg overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-[#FF6B00]/4 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#FF8A1F]/4 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-dash-primary text-xs font-bold uppercase tracking-[0.2em]">
            Core Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-dash-text mt-3 leading-tight">
            Why Choose VeriNova
          </h2>
          <p className="text-dash-secondary mt-4 text-base leading-relaxed font-semibold">
            Ensure reliability and compliance in automated workflows. We provide a rigorous evidence-backed safety layer for mission-critical AI operations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={idx * 0.08}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
