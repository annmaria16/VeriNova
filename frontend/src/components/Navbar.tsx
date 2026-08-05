import { ShieldCheck, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "How it Works", href: "#how-it-works" },
    { name: "About", href: "#about" },
    { name: "FAQ", href: "#faq" },
    { name: "Contact", href: "#contact" },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);

    if (location.pathname !== "/") {
      // If we are not on Home, navigate to Home first with the hash in state
      navigate("/", { state: { scrollTo: href } });
    } else {
      // Otherwise, perform standard smooth scroll
      performScroll(href);
    }
  };

  const performScroll = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // height of sticky navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Scroll if routed from another page with scrollTo state
  useEffect(() => {
    if (location.pathname === "/" && location.state && (location.state as any).scrollTo) {
      const targetHash = (location.state as any).scrollTo;
      // Clear the navigation state so it doesn't scroll again on refresh
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        performScroll(targetHash);
      }, 100);
    }
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled || location.pathname !== "/"
          ? "bg-[#08120F]/85 backdrop-blur-md border-b border-[#14532D]/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
          : "bg-transparent border-b border-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 lg:px-8 py-4">
        {/* Logo */}
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          onClick={(e) => {
            if (isAuthenticated) {
              return;
            }
            if (location.pathname === "/") {
              e.preventDefault();
              performScroll("#home");
            }
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-gradient-to-br from-green-500 to-[#14532D] p-2 rounded-xl shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide leading-none">
              VeriNova
            </h1>
            <p className="text-gray-400 text-[10px] tracking-[0.2em] font-semibold uppercase mt-0.5">
              Outcome Verification
            </p>
          </div>
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden lg:flex gap-8 text-gray-300 font-medium text-sm">
          {navLinks.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="hover:text-[#22C55E] transition-colors duration-200 cursor-pointer relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#22C55E] hover:after:w-full after:transition-all after:duration-300"
              >
                {link.name}
              </a>
            </li>
          ))}
        </ul>

        {/* Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-gray-300 hover:text-white px-4 py-2 font-medium text-sm transition-colors duration-200"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                className="relative overflow-hidden group bg-gradient-to-r from-[#14532D] to-[#08120F] border border-[#14532D] hover:border-[#22C55E] px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all duration-300 text-center cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-300 hover:text-white px-4 py-2 font-medium text-sm transition-colors duration-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="relative overflow-hidden group bg-gradient-to-r from-[#22C55E] to-[#14532D] hover:from-[#4ADE80] hover:to-[#22C55E] px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(74,222,128,0.5)] transition-all duration-300 text-center"
              >
                <span className="relative z-10">Get Started</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden text-[#22C55E] p-2 hover:bg-[#10211C] rounded-lg transition-colors"
          aria-label="Toggle Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-[#10211C]/95 backdrop-blur-lg border-b border-[#14532D] absolute top-full left-0 w-full shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-5">
          <ul className="flex flex-col p-6 gap-4 text-gray-300 font-medium">
            {navLinks.map((link) => (
              <li key={link.name} className="border-b border-[#14532D]/30 pb-2">
                <a
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="block hover:text-[#22C55E] transition-colors py-1"
                >
                  {link.name}
                </a>
              </li>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="w-full border border-[#14532D] rounded-xl py-2.5 text-gray-300 hover:bg-[#10211C] transition-colors text-center"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate("/", { replace: true });
                    }}
                    className="w-full bg-[#14532D]/40 text-red-400 font-bold rounded-xl py-2.5 hover:bg-red-500/10 transition-colors text-center cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full border border-[#14532D] rounded-xl py-2.5 text-gray-300 hover:bg-[#10211C] transition-colors text-center"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="w-full bg-[#22C55E] text-[#08120F] font-bold rounded-xl py-2.5 shadow-lg shadow-green-500/20 hover:bg-[#4ADE80] transition-colors text-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </ul>
        </div>
      )}
    </nav>
  );
}