import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, Send, CheckCircle, AlertTriangle, User, HelpCircle } from "lucide-react";
import { useEffect } from "react";

export default function ContactPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
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
    
    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required.";
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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate API request to backend contact handler
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#08120F] text-white flex flex-col">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 relative overflow-hidden bg-grid-pattern">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#22C55E]/2 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#4ADE80]/2 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-[#22C55E] text-xs font-bold uppercase tracking-[0.2em]">
              Support & Partnerships
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white mt-3 tracking-tight">
              Contact VeriNova
            </h1>
            <p className="text-gray-400 text-sm mt-3">
              Reach out for developer support, pricing packages, or VPC integrations.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Info Cards Column */}
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="glass-panel border border-[#14532D]/40 rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E] shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Email Inquiry</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    For enterprise plans or security integrations:
                  </p>
                  <p className="text-sm text-[#22C55E] font-semibold mt-1 hover:text-[#4ADE80] transition-colors cursor-pointer">
                    support@verinova.ai
                  </p>
                </div>
              </div>

              <div className="glass-panel border border-[#14532D]/40 rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#10211C] border border-[#14532D]/60 flex items-center justify-center text-[#22C55E] shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Developer Community</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Check out open issues, API samples, or start auditing locally:
                  </p>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#22C55E] font-semibold mt-1 hover:text-[#4ADE80] inline-block transition-colors"
                  >
                    GitHub Repository →
                  </a>
                </div>
              </div>
            </div>

            {/* Form Column */}
            <div className="md:col-span-3">
              <div className="glass-panel border border-[#14532D]/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-10 flex flex-col items-center gap-4"
                    >
                      <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center animate-bounce">
                        <CheckCircle size={28} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Inquiry Received</h3>
                        <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                          Thank you! Your message has been sent successfully. Our team will contact you shortly.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsSuccess(false)}
                        className="mt-4 px-5 py-2 border border-[#14532D] hover:border-[#22C55E] text-sm text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Send another message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-4"
                    >
                      {/* Name */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Full Name
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                            <User size={16} />
                          </span>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                              errors.name ? "border-red-500" : "border-[#14532D]/60"
                            }`}
                          />
                        </div>
                        {errors.name && (
                          <span className="text-red-400 text-xs flex items-center gap-1.5 mt-0.5 font-medium animate-pulse">
                            <AlertTriangle size={12} /> {errors.name}
                          </span>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Email Address
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                            <Mail size={16} />
                          </span>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                              errors.email ? "border-red-500" : "border-[#14532D]/60"
                            }`}
                          />
                        </div>
                        {errors.email && (
                          <span className="text-red-400 text-xs flex items-center gap-1.5 mt-0.5 font-medium animate-pulse">
                            <AlertTriangle size={12} /> {errors.email}
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="subject" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Subject
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                            <HelpCircle size={16} />
                          </span>
                          <input
                            type="text"
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleInputChange}
                            className={`w-full bg-[#08120F]/90 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                              errors.subject ? "border-red-500" : "border-[#14532D]/60"
                            }`}
                          />
                        </div>
                        {errors.subject && (
                          <span className="text-red-400 text-xs flex items-center gap-1.5 mt-0.5 font-medium animate-pulse">
                            <AlertTriangle size={12} /> {errors.subject}
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="message" className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Message
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          rows={4}
                          value={formData.message}
                          onChange={handleInputChange}
                          className={`w-full bg-[#08120F]/90 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all ${
                            errors.message ? "border-red-500" : "border-[#14532D]/60"
                          }`}
                        />
                        {errors.message && (
                          <span className="text-red-400 text-xs flex items-center gap-1.5 mt-0.5 font-medium animate-pulse">
                            <AlertTriangle size={12} /> {errors.message}
                          </span>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="glow-btn bg-[#22C55E] hover:bg-[#4ADE80] disabled:bg-[#14532D]/40 text-[#08120F] disabled:text-gray-500 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:shadow-none transition-all cursor-pointer mt-2"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-[#08120F] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <span>Send Message</span>
                            <Send size={16} />
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
