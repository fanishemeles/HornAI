import React, { useState } from "react";
import { Info, Sparkles, BookOpen, AlertCircle, Bookmark } from "lucide-react";

export default function LinguisticInsights() {
  const [activeTab, setActiveTab] = useState<"geez" | "somali" | "admin">("geez");

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5 animate-fade-in" id="linguistic-insights-root">
      <div>
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Script & Linguistic Guidebook
        </h3>
        <p className="text-xs text-slate-500">
          Essential insights into the orthographies, grammatical properties, and regional administrative structures of Amharic and Somali.
        </p>
      </div>

      {/* Mini tabs */}
      <div className="flex border-b border-slate-100 pb-px gap-2">
        <button
          onClick={() => setActiveTab("geez")}
          className={`px-3 py-1.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "geez"
              ? "border-indigo-505 border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Amharic Ge&apos;ez Script
        </button>
        <button
          onClick={() => setActiveTab("somali")}
          className={`px-3 py-1.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "somali"
              ? "border-indigo-505 border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Somali Orthography
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`px-3 py-1.5 text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "admin"
              ? "border-indigo-505 border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Ethiopian Administration
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === "geez" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-slate-600 leading-relaxed">
              Amharic is written in the <strong>Ge&apos;ez (Ethiopic) script</strong>, a unique abugida script where each symbol represents a consonant-vowel combination. It contains over 300 base characters, which poses unique challenges for optical character recognition (OCR) systems.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-1">OCR Confusion Clusters</span>
                <p className="text-slate-500 leading-relaxed">
                  Many characters differ by only small serifs or leg variations:
                </p>
                <div className="flex gap-2 mt-1.5 font-mono text-xs bg-white px-2 py-1 rounded border border-slate-150 justify-around">
                  <span>ሀ (ha) vs ሃ (ha-long)</span>
                  <span>በ (ba) vs ቨ (va)</span>
                  <span>አ (&apos;a) vs ኡ (u)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Morphological Richness</span>
                <p className="text-slate-500 leading-relaxed">
                  Amharic is a highly synthetic language with complex verb conjugation. Prepositions, subject/object markers, and plural suffixes are fused into a single word:
                </p>
                <p className="font-mono text-indigo-700 font-bold mt-1.5">
                  &ldquo;አልወደዱትም&rdquo; (al-weded-ut-im) = &ldquo;They did not like it.&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "somali" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-slate-600 leading-relaxed">
              Somali was officially transcribed using the <strong>Latin script</strong> in October 1972 under linguist Shire Jama Ahmed. Standard Somali is phonetically consistent but has regional dialects like <em>Maay Maay</em> spoken in southern areas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Double Vowels & Consonants</span>
                <p className="text-slate-500 leading-relaxed">
                  Somali utilizes double letters to indicate vowel length or consonant gemination:
                </p>
                <div className="mt-1.5 space-y-1">
                  <p className="font-mono text-xs"><span className="font-bold text-indigo-700">Laas</span> (well/water) vs <span className="font-bold text-slate-700">Las</span> (part)</p>
                  <p className="font-mono text-xs"><span className="font-bold text-indigo-700">Haddii</span> (if) vs <span className="font-bold text-slate-700">Hadii</span> (gift)</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Phonetic Sounds</span>
                <p className="text-slate-500 leading-relaxed">
                  Some Latin letters produce distinct guttural or pharyngeal Somali sounds:
                </p>
                <div className="mt-1.5 space-y-1 font-mono text-[11px] text-slate-600">
                  <p><strong className="text-indigo-700">X</strong> represents a voiceless pharyngeal fricative (like Arabic ح)</p>
                  <p><strong className="text-indigo-700">C</strong> represents a voiced pharyngeal fricative (like Arabic ع)</p>
                  <p><strong className="text-indigo-700">Q</strong> represents a voiceless uvular plosive (like Arabic ق)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "admin" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-slate-600 leading-relaxed">
              When translating administrative documents of the Somali Region of Ethiopia, standard dictionary translations may fail due to specific geopolitical, tribal, or bureaucratic frameworks.
            </p>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Governance Hierarchy</span>
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                <div className="bg-white p-2 rounded border border-slate-100">
                  <strong className="text-indigo-700 block text-[11px]">Region (Deegaan)</strong>
                  <span className="text-[10px] text-slate-400">Largest unit (e.g. Somali Regional State)</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-100">
                  <strong className="text-indigo-700 block text-[11px]">Woreda (Degmo)</strong>
                  <span className="text-[10px] text-slate-400">District division managing municipal services</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-100">
                  <strong className="text-indigo-700 block text-[11px]">Kebele</strong>
                  <span className="text-[10px] text-slate-400">Lowest neighborhood or peasant ward</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
