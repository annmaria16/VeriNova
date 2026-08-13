import { ShieldCheck, BarChart3, Link2, FileText, Activity, Lock } from "lucide-react";
import FeatureCard from "./FeatureCard";

export default function Features() {
  const features = [
    {
      icon: ShieldCheck,
      title: "AI Outcome Verification",
      description: "Analyze AI-generated answers, claims, and outcomes against available evidence before relying on them.",
    },
    {
      icon: FileText,
      title: "Evidence Analysis",
      description: "Review supporting evidence and identify information that may require additional verification.",
    },
    {
      icon: BarChart3,
      title: "Confidence Scoring",
      description: "Understand how strongly the available evidence supports a verification result.",
    },
    {
      icon: Activity,
      title: "Verification History",
      description: "Keep a record of previous verification requests, results, and activity in one place.",
    },
    {
      icon: Link2,
      title: "Transparent Results",
      description: "Present verification outcomes in a clear format so users can understand what was verified and why.",
    },
    {
      icon: Lock,
      title: "Trusted Decision Support",
      description: "Use verification insights as an additional layer of review before making important decisions.",
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
            Verification Built for Better Decisions
          </h2>
          <p className="text-dash-secondary mt-4 text-base leading-relaxed font-semibold">
            Turn uncertain information into clear, reviewable verification results.
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
