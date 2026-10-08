import React, { useState, useEffect } from "react";
import { BookOpen, Search, Plus, Sparkles, Filter, Check, AlertCircle, Bookmark, Users } from "lucide-react";
import { GlossaryTerm, User } from "../types";

interface GlossaryTabProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
}

export default function GlossaryTab({ currentUser, onOpenAuthModal }: GlossaryTabProps) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Custom term form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSomali, setNewSomali] = useState("");
  const [newAmharic, setNewAmharic] = useState("");
  const [newEnglish, setNewEnglish] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newCategory, setNewCategory] = useState("Administration");
  const [newExample, setNewExample] = useState("");

  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // AI Term extraction states
  const [aiExtractText, setAiExtractText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [suggestedTerms, setSuggestedTerms] = useState<any[]>([]);

  useEffect(() => {
    fetchGlossary();
  }, []);

  const handleExtractTerms = async () => {
    if (!aiExtractText.trim()) return;
    setExtracting(true);
    setFormError("");
    setSuggestedTerms([]);
    try {
      const res = await fetch("/api/glossary/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiExtractText })
      });
      const result = await res.json();
      if (result.status === "success") {
        setSuggestedTerms(result.data || []);
        if ((result.data || []).length === 0) {
          setFormError("No regional terms could be extracted from the text. Please try pasting a text with more regional vocabulary (e.g., mentioning woreda, kebeles, custom taxes, hawala, etc.).");
        }
      } else {
        setFormError(result.error || "Failed to extract terms.");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred during extraction.");
    } finally {
      setExtracting(false);
    }
  };

  const applySuggestion = (term: any) => {
    setNewSomali(term.termSomali || "");
    setNewAmharic(term.termAmharic === "N/A" ? "" : (term.termAmharic || ""));
    setNewEnglish(term.termEnglish || "");
    setNewDefinition(term.definition || "");
    setNewCategory(term.category || "General");
    setNewExample(term.example || "");
    // Clear suggested list
    setSuggestedTerms([]);
    setAiExtractText("");
  };

  const fetchGlossary = async () => {
    setLoading(true);
    try {
      const { collection, getDocs, query } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      
      const q = query(collection(db, "glossary"));
      const snapshot = await getDocs(q);
      const fetchedTerms = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          termSomali: data.termSomali,
          termAmharic: data.termAmharic,
          termEnglish: data.termEnglish,
          definition: data.definition,
          category: data.category,
          example: data.example,
          createdBy: data.createdBy || "official"
        } as GlossaryTerm;
      });
      
      // Sort terms alphabetically by Somali term
      fetchedTerms.sort((a, b) => a.termSomali.localeCompare(b.termSomali));
      
      setTerms(fetchedTerms);
    } catch (error) {
      console.error("Error fetching glossary from client Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSomali || !newEnglish || !newDefinition) {
      setFormError("Somali Term, English Translation, and Definition are required.");
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");

      const termData = {
        termSomali: newSomali,
        termAmharic: newAmharic || "N/A",
        termEnglish: newEnglish,
        definition: newDefinition,
        category: newCategory,
        example: newExample || "",
        createdBy: currentUser?.id || "anonymous",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "glossary"), termData);

      setFormSuccess(true);
      setNewSomali("");
      setNewAmharic("");
      setNewEnglish("");
      setNewDefinition("");
      setNewExample("");
      // Refresh terms
      fetchGlossary();
      setTimeout(() => {
        setFormSuccess(false);
        setShowAddForm(false);
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Categories list
  const categories = ["All", "Administration", "Government", "Customary Law", "Local Life", "Banking & Finance", "General"];

  // Filter and search logic
  const filteredTerms = terms.filter((term) => {
    const matchesCategory = selectedCategory === "All" || term.category === selectedCategory;
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      term.termSomali.toLowerCase().includes(s) ||
      term.termAmharic.toLowerCase().includes(s) ||
      term.termEnglish.toLowerCase().includes(s) ||
      term.definition.toLowerCase().includes(s);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="glossary-tab-root">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Regional & Administrative Glossary
          </h2>
          <p className="text-sm text-slate-500">
            Specialized terminology, cultural words, and local governance vocabulary of the Somali Region of Ethiopia (Ogaden).
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          id="btn-toggle-add-term"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? "View Glossary" : "Add Custom Term"}
        </button>
      </div>

      {/* Community Collaboration Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-3.5 shadow-xs" id="glossary-improvement-notice">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Help Us Improve Our Data</h4>
          <p className="text-xs text-slate-650 leading-relaxed">
            Our translation engine gets smarter with localized, district-level data. If you know specific administrative, cultural, or dialectal terms, please share them! Any custom terms you submit will be carefully reviewed by our validation team and integrated into our official glossary once confirmed.
          </p>
        </div>
      </div>

      {showAddForm ? (
        <form onSubmit={handleAddTerm} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 max-w-2xl" id="add-term-form">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Contribute New Term
            </h3>
            <p className="text-xs text-slate-450">Add a localized term or administrative designation to make translations smarter.</p>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2" id="form-error-alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs rounded-lg flex items-center gap-2" id="form-success-alert">
              <Check className="w-4 h-4 shrink-0" />
              Term successfully added to the system glossary!
            </div>
          )}

          {/* AI Drafting Assistant Card */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-150 rounded-xl space-y-3" id="ai-drafting-assistant">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">AI-Powered Draft Assistant (Optional)</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Paste a paragraph or sentence containing any local administration, customs, or financial terms. Gemini will extract, translate, and define it for you automatically.
            </p>
            <div className="flex gap-2">
              <textarea
                value={aiExtractText}
                onChange={(e) => setAiExtractText(e.target.value)}
                placeholder="e.g., Heshiiska xawaalada ee Shabelle Bank waxaa laga mamnuucay ribada iyo dulsaarka..."
                className="flex-1 min-h-[50px] max-h-[100px] text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={handleExtractTerms}
                disabled={extracting || !aiExtractText.trim()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-all self-end cursor-pointer"
              >
                {extracting ? "Extracting..." : "Draft with AI"}
              </button>
            </div>

            {suggestedTerms.length > 0 && (
              <div className="bg-white border border-indigo-100 rounded-lg p-3 space-y-2 animate-fade-in" id="ai-extracted-suggestions">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Extracted Suggestions:</span>
                <div className="space-y-2 divide-y divide-slate-100">
                  {suggestedTerms.map((term, index) => (
                    <div key={index} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">{term.termSomali}</span>
                          <span className="text-[10px] text-slate-400">({term.termEnglish})</span>
                          <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-500 font-mono">{term.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{term.definition}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(term)}
                        className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 rounded-md transition-all self-start sm:self-auto cursor-pointer"
                      >
                        Apply Draft
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Somali Term *</label>
              <input
                type="text"
                required
                value={newSomali}
                onChange={(e) => setNewSomali(e.target.value)}
                placeholder="e.g. Degmo"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amharic Equivalent</label>
              <input
                type="text"
                value={newAmharic}
                onChange={(e) => setNewAmharic(e.target.value)}
                placeholder="e.g. ወረዳ"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">English Translation *</label>
              <input
                type="text"
                required
                value={newEnglish}
                onChange={(e) => setNewEnglish(e.target.value)}
                placeholder="e.g. District"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="Administration">Administration</option>
                <option value="Government">Government</option>
                <option value="Customary Law">Customary Law</option>
                <option value="Local Life">Local Life</option>
                <option value="Banking & Finance">Banking & Finance</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Definition / Meaning *</label>
            <textarea
              required
              rows={3}
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              placeholder="Explain what this term designates in the Somali Region or general Ethiopian government structure."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Context / Example Sentence</label>
            <input
              type="text"
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="e.g. Degmada Jigjiga waxay ka tirsan tahay gobolka... "
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-all shadow-xs flex items-center gap-2"
            >
              {submitting ? "Adding..." : "Add to Glossary"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Somali, Amharic, or English terms..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden md:block" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all shrink-0 ${
                    selectedCategory === cat
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-3xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Terms */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
              {[1, 2, 4, 5].map((i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          ) : filteredTerms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">No glossary terms found matching your criteria.</p>
              <p className="text-slate-400 text-xs mt-1">Try resetting search or filters, or add your own custom regional term above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="glossary-grid">
              {filteredTerms.map((term) => (
                <div
                  key={term.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300/60 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 font-display">{term.termSomali}</span>
                        {term.termAmharic && term.termAmharic !== "N/A" && (
                          <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                            {term.termAmharic}
                          </span>
                        )}
                        {term.createdBy && term.createdBy !== "official" && (
                          <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5" title="Contributed by a community member">
                            <Users className="w-2.5 h-2.5" />
                            User Term
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase bg-slate-100 rounded-full shrink-0">
                        {term.category}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-indigo-700 mb-2">
                      English: <span className="font-medium text-slate-700">{term.termEnglish}</span>
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{term.definition}</p>
                  </div>

                  {term.example && (
                    <div className="pt-2.5 border-t border-slate-50">
                      <p className="text-[11px] text-slate-400 italic font-mono flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-indigo-500" />
                        Usage: &ldquo;{term.example}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
