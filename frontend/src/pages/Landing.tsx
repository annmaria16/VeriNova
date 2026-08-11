import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Workflow from "../components/Workflow";
import About from "../components/About";
import FAQ from "../components/FAQ";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-dash-bg text-dash-text selection:bg-dash-primary/20 selection:text-dash-primary">
      <Navbar />
      <Hero />
      <Features />
      <Workflow />
      <About />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}
