import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, Send, CheckCircle, AlertTriangle } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required.";
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    
    if (!formData.message.trim()) {
      newErrors.message = "Message cannot be empty.";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message should be at least 10 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Mock API Submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({ name: "", email: "", company: "", message: "" });
    }, 2000);
  };

  return (
    <section id="contact" className="relative py-24 bg-[#08120F] border-t border-[#14532D]/20 overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-[#4ADE80]/3 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: text details */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
              Start Verifying Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">
              Secure Your AI Deployments
            </h2>
            <p className="text-gray-400 mt-5 text-base leading-relaxed">
              Have questions about integrating VeriNova into your existing LangChain, Autogen, or custom AI agents? Get in touch to discuss compliance requirements, API keys, or enterprise VPC deployments.
            </p>

            <div className="mt-8 flex flex-col gap-5">
              <div className="flex items-center gap-4 text-gray-300">
                <div className="w-10 h-10 rounded-xl bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E]">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Email support</p>
                  <p className="text-sm font-semibold hover:text-[#22C55E] transition-colors cursor-pointer">
                    enterprise@verinova.ai
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-gray-300">
                <div className="w-10 h-10 rounded-xl bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E]">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Direct Support</p>
                  <p className="text-sm font-semibold">24/7 Slack & Teams verification channels</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Contact form box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full flex justify-center"
          >
            <div className="w-full max-w-[500px] glass-panel border border-[#14532D]/50 rounded-2xl p-8 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-xl font-bold text-white mb-2">Request Integration Keys</h3>

                    {/* Name field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="name" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder=""
                        className={`w-full bg-[#08120F]/90 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                          errors.name ? "border-red-500" : "border-[#14532D]/60"
                        }`}
                      />
                      {errors.name && (
                        <span className="text-red-400 text-xs flex items-center gap-1.5 mt-1">
                          <AlertTriangle size={12} /> {errors.name}
                        </span>
                      )}
                    </div>

                    {/* Email field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Work Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder=""
                        className={`w-full bg-[#08120F]/90 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                          errors.email ? "border-red-500" : "border-[#14532D]/60"
                        }`}
                      />
                      {errors.email && (
                        <span className="text-red-400 text-xs flex items-center gap-1.5 mt-1">
                          <AlertTriangle size={12} /> {errors.email}
                        </span>
                      )}
                    </div>

                    {/* Company field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="company" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Company / Org (Optional)
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder=""
                        className="w-full bg-[#08120F]/90 border border-[#14532D]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all"
                      />
                    </div>

                    {/* Message field */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="message" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder=""
                        className={`w-full bg-[#08120F]/90 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all resize-none ${
                          errors.message ? "border-red-500" : "border-[#14532D]/60"
                        }`}
                      />
                      {errors.message && (
                        <span className="text-red-400 text-xs flex items-center gap-1.5 mt-1">
                          <AlertTriangle size={12} /> {errors.message}
                        </span>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] disabled:bg-[#14532D] text-[#08120F] disabled:text-gray-400 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3.5 shadow-lg shadow-green-500/20 disabled:shadow-none transition-all cursor-pointer mt-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-[#08120F] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Submit Request</span>
                          <Send size={16} />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    className="flex flex-col items-center justify-center py-12 text-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 14 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/40 flex items-center justify-center text-[#22C55E] mb-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                      <CheckCircle size={36} className="animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black text-white">Request Received</h3>
                    <p className="text-gray-400 text-sm mt-3 max-w-sm leading-relaxed">
                      Thank you! Our engineering team will review your requirements and reach out within 2 hours with integration sandbox access instructions.
                    </p>
                    <button
                      onClick={() => setIsSuccess(false)}
                      className="mt-8 text-xs font-bold uppercase tracking-wider text-[#22C55E] border border-[#14532D] px-6 py-2.5 rounded-xl hover:bg-[#10211C] transition-colors"
                    >
                      Send Another Message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
