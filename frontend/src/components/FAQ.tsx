import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const faqs: FAQItem[] = [
    {
      question: "What is AI outcome verification?",
      answer: "AI outcome verification is the process of independently validating that the output of an AI agent or LLM task is correct, safe, and true before it is committed to production. VeriNova intercepts AI outcomes, collects execution footprints (like API response logs and DB records), and runs deterministic validations.",
    },
    {
      question: "How does VeriNova prevent AI hallucinations?",
      answer: "VeriNova collects real evidence from your API responses and database layers. Instead of trusting the LLM text output directly, we confirm that downstream executions actually occurred as expected. If the AI claims to have updated a record but no DB query or API request exists, VeriNova flags it as a hallucination.",
    },
    {
      question: "Does this add significant latency to my AI calls?",
      answer: "No. The verification engine is written in highly optimized Rust/WebAssembly binaries and runs concurrently with your workflows. The average verification latency is less than 45 milliseconds, making it suitable for real-time customer-facing interactions.",
    },
    {
      question: "Can VeriNova be integrated with custom or private LLMs?",
      answer: "Yes. VeriNova is model-agnostic. We support standard APIs (OpenAI, Anthropic, Google Gemini) as well as open-source frameworks (Llama, Mistral) and custom on-premise models running in your private clouds.",
    },
    {
      question: "Is my corporate data secure with VeriNova?",
      answer: "Completely. We offer a zero-data-retention policy on payloads and cryptographically sign execution logs. VeriNova is fully SOC2 Type II, HIPAA, and GDPR compliant. We also offer private VPC deployments for enterprise tier customers.",
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="relative py-24 bg-[#08120F] border-t border-[#14532D]/20 overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-[#22C55E]/2 rounded-full blur-[110px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 mt-4 text-base leading-relaxed">
            Everything you need to know about setting up outcome verification and ensuring trust in generative systems.
          </p>
        </div>

        {/* Accordions */}
        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.question}
                className="glass-panel rounded-2xl border border-[#14532D]/40 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-[#10211C]/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 pr-4">
                    <HelpCircle size={20} className={isOpen ? "text-[#4ADE80]" : "text-[#22C55E]"} />
                    <span className="text-white font-semibold text-base sm:text-lg">
                      {faq.question}
                    </span>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full border border-[#14532D]/70 flex items-center justify-center text-gray-400 group-hover:text-white transition-all duration-300 ${
                      isOpen ? "rotate-180 border-[#22C55E] text-[#22C55E]" : ""
                    }`}
                  >
                    <ChevronDown size={16} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="p-6 pt-0 border-t border-[#14532D]/20 text-gray-400 text-sm leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
