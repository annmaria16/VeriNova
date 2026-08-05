import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import Features from "../components/Features";
import Workflow from "../components/Workflow";
import About from "../components/About";
import FAQ from "../components/FAQ";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#08120F] text-white selection:bg-[#22C55E]/30 selection:text-[#4ADE80]">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Workflow />
      <About />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}