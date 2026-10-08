import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Languages, FileText, BookOpen, GraduationCap } from "lucide-react";
import TranslateTab from "./components/TranslateTab";
import OcrTab from "./components/OcrTab";
import GlossaryTab from "./components/GlossaryTab";
import LinguisticInsights from "./components/LinguisticInsights";
import { User } from "./types";

const DEFAULT_USER: User = {
  id: "scholar_session",
  username: "Scholar",
  email: "scholar@hornai.internal",
  avatar: "🦉",
  createdAt: new Date().toISOString(),
  role: "user"
};

const headerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const headerItemVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"translate" | "ocr" | "glossary" | "insights">("translate");
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem("hornai_current_user");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_USER;
  });

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem("hornai_current_user", JSON.stringify(updatedUser));
    } catch {
      // ignore
    }
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 pb-12" id="app-viewport">
      {/* Visual Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <motion.div 
            className="flex items-center gap-3"
            initial="hidden"
            animate="visible"
            variants={headerContainerVariants}
          >
            <motion.div 
              className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0"
              variants={headerItemVariants}
            >
              <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
            </motion.div>
            <div>
              <motion.h1 
                className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2 flex-wrap"
                variants={headerItemVariants}
              >
                HornAI <span className="text-indigo-600">Translate</span>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 shrink-0">
                  Linguistic Core v2.4.1
                </span>
              </motion.h1>
              <motion.p 
                className="text-xs text-slate-400"
                variants={headerItemVariants}
              >
                Ethiopic Ge&apos;ez and Somali Latin Multimodal Platform
              </motion.p>
            </div>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end overflow-hidden">
            {/* Tab Navigation */}
            <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-full overflow-x-auto whitespace-nowrap shrink-0 scrollbar-none">
              <button
                onClick={() => setActiveTab("translate")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === "translate"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                Translator
              </button>

              <button
                onClick={() => setActiveTab("ocr")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === "ocr"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Document OCR
              </button>

              <button
                onClick={() => setActiveTab("glossary")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === "glossary"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Glossary
              </button>

              <button
                onClick={() => setActiveTab("insights")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
                  activeTab === "insights"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Insights
              </button>
            </nav>

            {/* Scholar Session Badge */}
            <div className="flex items-center shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-xs">
                <span className="text-base" role="img" aria-label="avatar">{currentUser.avatar}</span>
                <div className="text-left leading-tight">
                  <span className="text-xs font-bold text-slate-800 block truncate" title={currentUser.username}>
                    {currentUser.username}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-indigo-600 block uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-8" id="app-content-container">
        {/* Descriptive intro banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden shadow-xs">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-full">
              <Sparkles className="w-3 h-3 text-indigo-300" />
              Cross-Orthographic AI Translation
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-50 leading-tight">
              Bridging the Ethiopic and Somali Linguistic Systems
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
              Handling Amharic&apos;s complex Ge&apos;ez script syllables alongside the Somali region&apos;s Latin alphabet. Optimized for regional Ethiopian administrative designations (Woreda, Kebele) and dialectal terms.
            </p>
          </div>
          {/* Subtle design accents */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-indigo-600/15 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Tab contents switcher */}
        <div className="min-h-[400px]">
          {activeTab === "translate" && (
            <TranslateTab
              currentUser={currentUser}
              onUpdateUser={handleUpdateUser}
              onOpenAuthModal={() => {}}
            />
          )}
          {activeTab === "ocr" && <OcrTab />}
          {activeTab === "glossary" && (
            <GlossaryTab
              currentUser={currentUser}
              onOpenAuthModal={() => {}}
            />
          )}
          {activeTab === "insights" && <LinguisticInsights />}
        </div>
      </main>

      {/* Human design-first footer */}
      <footer className="max-w-6xl mx-auto px-4 mt-16 pt-6 border-t border-slate-200 text-center space-y-2">
        <p className="text-xs text-slate-500 font-sans">
          Somali &amp; Amharic AI Translation System &copy; {new Date().getFullYear()}. Designed for administrative and regional linguistic accuracy.
        </p>
        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
          Designed by nubbletechs
        </p>
      </footer>
    </div>
  );
}
