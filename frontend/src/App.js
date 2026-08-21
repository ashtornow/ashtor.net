import { useEffect } from "react";
import "@/App.css";
import Lenis from "lenis";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/i18n";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Manifesto from "@/components/Manifesto";
import Specializations from "@/components/Specializations";
import Pathways from "@/components/Pathways";
import AiMatch from "@/components/AiMatch";
import LeadForm from "@/components/LeadForm";
import Footer from "@/components/Footer";

function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <LanguageProvider>
      <div className="noise-overlay min-h-screen bg-[#07090E] text-slate-100 overflow-x-hidden">
        <Navbar />
        <main>
          <Hero />
          <Marquee />
          <Manifesto />
          <Specializations />
          <Pathways />
          <AiMatch />
          <LeadForm />
        </main>
        <Footer />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111620",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#F8FAFC",
              fontFamily: "'IBM Plex Mono', monospace",
            },
          }}
        />
      </div>
    </LanguageProvider>
  );
}

export default App;
