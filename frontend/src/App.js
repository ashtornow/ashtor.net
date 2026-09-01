import { useEffect, lazy, Suspense } from "react";
import "@/App.css";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/i18n";
import { usePageMeta } from "@/lib/seo";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Manifesto from "@/components/Manifesto";
import Specializations from "@/components/Specializations";
import SuccessStories from "@/components/SuccessStories";
import Pathways from "@/components/Pathways";
import AiMatch from "@/components/AiMatch";
import LeadForm from "@/components/LeadForm";
import Footer from "@/components/Footer";

const ChatWidget = lazy(() => import("@/components/ChatWidget"));
const Admin = lazy(() => import("@/pages/Admin"));
const InfoPage = lazy(() => import("@/pages/InfoPage"));
const WelcomePage = lazy(() => import("@/pages/WelcomePage"));

const Landing = () => {
  usePageMeta('home');
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Manifesto />
        <Specializations />
        <SuccessStories />
        <Pathways />
        <AiMatch />
        <LeadForm />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </>
  );
};

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
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/talent-portal" element={<InfoPage slug="talent-portal" />} />
            <Route path="/client-hub" element={<InfoPage slug="client-hub" />} />
            <Route path="/security-charter" element={<InfoPage slug="security-charter" />} />
            <Route path="/terms" element={<InfoPage slug="terms" />} />
            <Route path="/privacy" element={<InfoPage slug="privacy" />} />
            <Route path="/welcome/:token" element={<WelcomePage />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
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
