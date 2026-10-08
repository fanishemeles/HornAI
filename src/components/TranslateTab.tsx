import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeftRight, Volume2, Sparkles, Loader2, BookOpen, AlertCircle, RefreshCw, Languages, Clipboard, FileDown, Play, Square, Sliders, Clock, Trash2, History, Calendar, ChevronRight, Check } from "lucide-react";
import { TranslationData, HistoryItem, User } from "../types";
import { jsPDF } from "jspdf";

const ADMINISTRATIVE_KEYWORDS = [
  // English Administrative & Legal Terms
  "Ministry", "Department", "Directorate", "Commission", "Bureau", "Office",
  "Woreda", "Kebele", "Kilil", "Gobol", "Degmo", "Sub-district", "District",
  "Regional", "Federal", "Republic", "Article", "Section", "Clause", "Decree",
  "Proclamation", "Official", "Memorandum", "Circular", "Law", "Regulation",
  "Authority", "Agency", "Certificate", "Registry", "National", "Council",
  "Executive", "President", "Minister", "Governor", "Director", "Mayor",
  "Togochale", "Jijiga", "Harar", "Addis Ababa", "Charter", "Treaty", "Resolution",
  "Constitutional", "Municipality", "Administration", "Government", "Customary Law",
  
  // Somali Administrative & Legal Terms
  "Wasaaradda", "Xafiiska", "Maamulka", "Degmada", "Gobolka", "Tuulada", "Qebele",
  "Xeer", "Guurti", "Go'aan", "Wareegto", "Sharci", "Awoodda", "Hantidhawrka",
  "Guddiga", "Hay'adda", "Madaxweynaha", "Guddoomiyaha", "Wasiirka", "Maay Maay",
  "Kala-sarifka", "Koonto", "Xisaab", "Baanka", "Odayaasha", "Xeer-beegti", "Garsoor",
  
  // Amharic Administrative & Legal Terms
  "ሚኒስቴር", "ቢሮ", "መምሪያ", "ኮሚሽን", "ቀበሌ", "ወረዳ", "ዞን", "ክልል", "አዋጅ",
  "ድንጋጌ", "መመሪያ", "ህግ", "ደንብ", "ባለስልጣን", "ኤጀንሲ", "ምክር ቤት", "ፕሬዝዳንት",
  "አስተዳዳሪ", "ሚኒስትር", "ከንቲባ", "ከተማ", "መንግስት", "የውጭ ምንዛሬ", "የባንክ ሂሳብ",
  "ፍትህ", "ፍርድ ቤት", "ዳኛ", "የአገር ሽማግሌዎች"
];

interface TranslateTabProps {
  currentUser: User | null;
  onUpdateUser: (updatedUser: User) => void;
  onOpenAuthModal: () => void;
}

export default function TranslateTab({ currentUser, onUpdateUser, onOpenAuthModal }: TranslateTabProps) {
  const [sourceLang, setSourceLang] = useState("Amharic");
  const [targetLang, setTargetLang] = useState("Somali");
  const [contextType, setContextType] = useState("standard");
  const [outputTone, setOutputTone] = useState("standard");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationData | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [refining, setRefining] = useState(false);

  // Load settings preferences on login automatically
  useEffect(() => {
    if (currentUser && currentUser.preferences) {
      const { preferredSourceLang, preferredTargetLang, preferredTone } = currentUser.preferences;
      if (preferredSourceLang) setSourceLang(preferredSourceLang);
      if (preferredTargetLang) setTargetLang(preferredTargetLang);
      if (preferredTone) setOutputTone(preferredTone);
    }
  }, [currentUser?.id, currentUser?.preferences]);

  const [detectedLang, setDetectedLang] = useState<"Amharic" | "Somali" | "English" | null>(null);
  const [showDetectionSuggestion, setShowDetectionSuggestion] = useState(false);

  // Automatic language detection effect
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setDetectedLang(null);
      setShowDetectionSuggestion(false);
      return;
    }

    // Run simple but robust language detection
    const amharicRegex = /[\u1200-\u137F]/;
    if (amharicRegex.test(trimmed)) {
      setDetectedLang("Amharic");
      setShowDetectionSuggestion(sourceLang !== "Amharic");
      return;
    }

    // Somali/English detection
    const words = trimmed.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, ""));
    const somaliKeywords = [
      "iyo", "waa", "ku", "ah", "ee", "soo", "ka", "u", "la", "in", "ay", "uu", "oo", 
      "waxaa", "degmada", "gobolka", "wasaaradda", "xafiiska", "maamulka", "xeer", "guurti",
      "goaan", "wareegto", "sharci", "awoodda", "guddiga", "hayadda", "wasiirka", "shacabka",
      "mudane", "doorashada", "calanka", "soomaaliya", "soomaali", "muqdisho", "hargeysa",
      "boosaaso", "garowe", "kismaayo", "baydhabo", "jabuuti", "somaliland", "puntland",
      "galmudug", "jubaland", "hirshabelle", "koonfur", "galbeed", "bari", "waqooyi"
    ];

    const englishKeywords = [
      "the", "and", "of", "to", "a", "in", "is", "that", "it", "he", "was", "for", "on", 
      "are", "as", "with", "his", "they", "i", "at", "be", "this", "have", "from", "or", 
      "one", "had", "by", "but", "not", "what", "all", "were", "we", "when", "your", 
      "can", "said", "there", "use", "an", "each", "which", "she", "do", "how", "their", "if",
      "will", "up", "other", "about", "out", "many", "then", "them", "these", "so", "some", 
      "her", "would", "make", "like", "him", "into", "time", "has", "look", "two", "more", "write",
      "go", "see", "number", "no", "way", "could", "people", "my", "than", "first", "water"
    ];

    let somaliScore = 0;
    let englishScore = 0;

    for (const word of words) {
      if (somaliKeywords.includes(word)) {
        somaliScore += 1;
      } else if (englishKeywords.includes(word)) {
        englishScore += 1;
      }
    }

    // Checking specific character combinations for Somali (such as dh, kh, sh, double vowels)
    const doubleVowels = (trimmed.match(/[aeiou]{2}/gi) || []).length;
    const commonSomaliPairs = (trimmed.match(/(dh|sh|kh|uu|oo|aa|ee|ii)/gi) || []).length;
    somaliScore += (doubleVowels * 0.1) + (commonSomaliPairs * 0.2);

    let detected: "Amharic" | "Somali" | "English" = "Somali";
    if (englishScore > somaliScore) {
      detected = "English";
    }

    setDetectedLang(detected);
    setShowDetectionSuggestion(sourceLang !== detected);
  }, [text, sourceLang]);

  const applyDetectedLanguage = () => {
    if (!detectedLang) return;
    setSourceLang(detectedLang);
    // Set appropriate target language
    if (detectedLang === "Amharic") {
      setTargetLang("Somali");
    } else if (detectedLang === "Somali") {
      setTargetLang("Amharic");
    } else {
      // English -> Somali or Amharic
      setTargetLang(sourceLang === "English" ? "Somali" : sourceLang);
    }
    setShowDetectionSuggestion(false);
  };

  // TTS audio playing state
  const [playingTts, setPlayingTts] = useState(false);
  const [ttsVoice, setTtsVoice] = useState("Zephyr"); // Zephyr, Kore, Puck, Charon, Fenrir

  // Web Speech API state variables
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLocalVoice, setSelectedLocalVoice] = useState<string>("");
  const [speechEngine, setSpeechEngine] = useState<"cloud" | "webSpeech">("webSpeech");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [playbackPitch, setPlaybackPitch] = useState<number>(1.0);
  const [optimizePhonetics, setOptimizePhonetics] = useState<boolean>(true);
  const [readPronunciationGuide, setReadPronunciationGuide] = useState<boolean>(false);
  const [playingWebSpeech, setPlayingWebSpeech] = useState(false);

  // History state and helpers
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (currentUser) {
        try {
          const { collection, getDocs, query, orderBy, limit } = await import("firebase/firestore");
          const { db } = await import("../lib/firebase");
          
          const historyRef = collection(db, "users", currentUser.id, "history");
          const q = query(historyRef, orderBy("timestamp", "desc"), limit(5));
          const snapshot = await getDocs(q);
          const historyList = snapshot.docs.map(doc => doc.data() as HistoryItem);
          setHistory(historyList);
          return;
        } catch (err) {
          console.error("Failed to load history from Firestore:", err);
        }
      }

      const stored = localStorage.getItem("hornai_translation_history");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setHistory(parsed.slice(0, 5));
          }
        } catch (e) {
          console.error("Error parsing history from localStorage", e);
        }
      }
    };

    loadHistory();
  }, [currentUser?.id]);

  const saveToHistory = async (sourceText: string, resultData: TranslationData, sourceL: string, targetL: string, contextT: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " - " + new Date().toLocaleDateString(),
      sourceLang: sourceL,
      targetLang: targetL,
      contextType: contextT,
      sourceText,
      translationResult: resultData
    };

    setHistory(prev => {
      // Remove any exact source text matches to avoid redundant clutter
      const filtered = prev.filter(item => item.sourceText.trim() !== sourceText.trim());
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem("hornai_translation_history", JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        
        const historyDocRef = doc(db, "users", currentUser.id, "history", newItem.id);
        await setDoc(historyDocRef, newItem);
      } catch (err) {
        console.error("Failed to add history item to Firestore:", err);
      }
    }
  };

  const clearHistory = async () => {
    if (window.confirm("Are you sure you want to clear your entire translation history?")) {
      setHistory([]);
      localStorage.removeItem("hornai_translation_history");

      if (currentUser) {
        try {
          const { collection, getDocs, writeBatch } = await import("firebase/firestore");
          const { db } = await import("../lib/firebase");
          
          const historyRef = collection(db, "users", currentUser.id, "history");
          const snapshot = await getDocs(historyRef);
          
          const batch = writeBatch(db);
          snapshot.docs.forEach(snapshotDoc => {
            batch.delete(snapshotDoc.ref);
          });
          await batch.commit();
        } catch (err) {
          console.error("Failed to clear history from Firestore:", err);
        }
      }
    }
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem("hornai_translation_history", JSON.stringify(updated));
      return updated;
    });

    if (currentUser) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        
        const historyDocRef = doc(db, "users", currentUser.id, "history", id);
        await deleteDoc(historyDocRef);
      } catch (err) {
        console.error("Failed to delete history item from Firestore:", err);
      }
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setContextType(item.contextType);
    setText(item.sourceText);
    setTranslationResult(item.translationResult);
    
    // Smooth scroll to top/editor area
    document.getElementById("translate-tab-root")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Try to pre-select a matching voice if possible (e.g., am-ET or so-SO, or fall back to English/default)
        const bestVoice = availableVoices.find(v => 
          v.lang.startsWith("am") || 
          v.lang.startsWith("so") || 
          v.lang.startsWith("en")
        );
        if (bestVoice) {
          setSelectedLocalVoice(bestVoice.name);
        } else if (availableVoices.length > 0) {
          setSelectedLocalVoice(availableVoices[0].name);
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStopWebSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setPlayingWebSpeech(false);
    }
  };

  const handlePlayWebSpeech = () => {
    if (!translationResult || !translationResult.translatedText) return;
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Web Speech API is not supported in this browser.");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    let textToSpeak = translationResult.translatedText;

    // Check if we want to read the Pronunciation Guide instead of raw text
    if (readPronunciationGuide && translationResult.pronunciation) {
      textToSpeak = translationResult.pronunciation;
    } else if (targetLang === "Amharic" && !readPronunciationGuide) {
      // Check if we have an Amharic voice selected. If not, auto-suggest pronunciation guide
      const activeVoiceObj = voices.find(v => v.name === selectedLocalVoice);
      const isAmharicVoice = activeVoiceObj?.lang.toLowerCase().startsWith("am");
      if (!isAmharicVoice && translationResult.pronunciation) {
        textToSpeak = translationResult.pronunciation;
      }
    }

    // Optimize phonetics for Somali text if read by standard Latin-based voices
    if (targetLang === "Somali" && optimizePhonetics && !readPronunciationGuide) {
      const activeVoiceObj = voices.find(v => v.name === selectedLocalVoice);
      const isSomaliVoice = activeVoiceObj?.lang.toLowerCase().startsWith("so");
      if (!isSomaliVoice) {
        // Phonetically map Somali sounds to standard Latin letters that most TTS voices read closer to native
        textToSpeak = textToSpeak
          .replace(/x/g, "h")
          .replace(/X/g, "H")
          .replace(/c/g, "a")
          .replace(/C/g, "A")
          .replace(/dh/g, "d")
          .replace(/Dh/g, "D")
          .replace(/DH/g, "D")
          .replace(/q/g, "k")
          .replace(/Q/g, "K");
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Configure voice
    if (selectedLocalVoice) {
      const voiceObj = voices.find(v => v.name === selectedLocalVoice);
      if (voiceObj) {
        utterance.voice = voiceObj;
        utterance.lang = voiceObj.lang;
      }
    } else {
      utterance.lang = targetLang === "Amharic" ? "am-ET" : targetLang === "Somali" ? "so-SO" : "en-US";
    }

    // Set speed and pitch
    utterance.rate = playbackRate;
    utterance.pitch = playbackPitch;

    utterance.onstart = () => {
      setPlayingWebSpeech(true);
    };

    utterance.onend = () => {
      setPlayingWebSpeech(false);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesisUtterance error:", e);
      setPlayingWebSpeech(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSwapLanguages = () => {
    const nextSource = targetLang;
    const nextTarget = sourceLang;
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    if (translationResult?.translatedText) {
      setText(translationResult.translatedText);
      setTranslationResult(null);
    }
  };

  const activePreset = 
    sourceLang === "Amharic" && targetLang === "Somali" ? "am-so" :
    sourceLang === "Somali" && targetLang === "Amharic" ? "so-am" :
    "custom";

  const handleSetDirectionPreset = (preset: "am-so" | "so-am") => {
    const nextSource = preset === "am-so" ? "Amharic" : "Somali";
    const nextTarget = preset === "am-so" ? "Somali" : "Amharic";
    if (sourceLang === nextSource && targetLang === nextTarget) {
      return;
    }
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    if (translationResult?.translatedText) {
      setText(translationResult.translatedText);
      setTranslationResult(null);
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setTranslationResult(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
          contextType,
          tone: outputTone
        })
      });

      const result = await response.json();
      if (result.status === "success") {
        setTranslationResult(result.data);
        saveToHistory(text, result.data, sourceLang, targetLang, contextType);
      } else {
        setError(result.error || "Translation request failed.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during translation.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementPrompt.trim() || !translationResult) return;
    setRefining(true);
    setError("");

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
          contextType,
          tone: outputTone,
          refinementPrompt,
          previousTranslation: translationResult.translatedText
        })
      });

      const result = await response.json();
      if (result.status === "success") {
        setTranslationResult(result.data);
        setRefinementPrompt("");
        saveToHistory(text, result.data, sourceLang, targetLang, contextType);
      } else {
        setError(result.error || "Translation refinement failed.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during translation refinement.");
    } finally {
      setRefining(false);
    }
  };

  const playTtsAudio = async () => {
    if (!translationResult || !translationResult.translatedText) return;
    setPlayingTts(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: translationResult.translatedText,
          voiceName: ttsVoice
        })
      });

      const result = await response.json();
      if (result.status === "success" && result.audio) {
        // Decode base64 16-bit PCM 24kHz audio and play via Web Audio API
        const binaryString = atob(result.audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const arrayBuffer = bytes.buffer;
        const int16Array = new Int16Array(arrayBuffer);

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 24000 });
        const buffer = audioCtx.createBuffer(1, int16Array.length, 24000);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768.0; // scale Int16 sample to Float32
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        
        source.onended = () => {
          setPlayingTts(false);
        };
        
        source.start(0);
      } else {
        alert(result.error || "TTS audio synthesis failed.");
        setPlayingTts(false);
      }
    } catch (err) {
      console.error("TTS Audio Playing Error:", err);
      alert("Failed to play synthesized TTS audio.");
      setPlayingTts(false);
    }
  };

  const exportTranslationToPdf = () => {
    if (!translationResult) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2); // 170mm

    // Draw top brand bar
    doc.setFillColor(79, 70, 229); // Brand Indigo
    doc.rect(margin, 15, contentWidth, 2.5, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Linguistic Alignment & Translation Report", margin, 27);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Official administrative output generated via HornAI Translate VLM Core Engine", margin, 32);

    // Separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, 36, margin + contentWidth, 36);

    let y = 43;

    // Metadata Panel (Fills background with light gray)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin, y, contentWidth, 24, "F");
    
    // Draw fine border for metadata box
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 24, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    
    // Column 1
    doc.text("REPORT DATE", margin + 6, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // slate-800
    const reportDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(reportDateStr, margin + 6, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("PROCESSING ENGINE", margin + 6, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("Modern VLM (Gemini Pro)", margin + 6, y + 21);

    // Column 2
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("SOURCE SYSTEM", margin + 62, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(sourceLang, margin + 62, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TARGET SYSTEM", margin + 62, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(targetLang, margin + 62, y + 21);

    // Column 3
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CONTEXT TYPE", margin + 115, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(contextType.toUpperCase(), margin + 115, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("LINGUISTIC CORE", margin + 115, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("v2.4.1-stable", margin + 115, y + 21);

    y += 34;

    const checkOverflow = (neededHeight: number) => {
      if (y + neededHeight > 270) {
        doc.addPage();
        // Add header banner on new page
        doc.setFillColor(79, 70, 229);
        doc.rect(margin, 15, contentWidth, 1.5, "F");
        y = 25;
      }
    };

    // Helper to draw a content section block (light backgrounds + left accent border)
    const drawContentBox = (title: string, textContent: string, isResult: boolean = false, extraSubtext?: string) => {
      // Determine wrapping text lines
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitLines = doc.splitTextToSize(textContent, contentWidth - 12);
      const lineHeightMm = 10 * 0.352778 * 1.35; // 1.35 line spacing
      let boxHeight = (splitLines.length * lineHeightMm) + 16;
      
      let extraLines: string[] = [];
      if (extraSubtext) {
        extraLines = doc.splitTextToSize(extraSubtext, contentWidth - 12);
        boxHeight += (extraLines.length * lineHeightMm) + 4;
      }

      checkOverflow(boxHeight + 10);

      // Draw box background
      doc.setFillColor(isResult ? 245 : 248, isResult ? 247 : 250, isResult ? 255 : 252); // Slate or light indigo tint
      doc.rect(margin, y, contentWidth, boxHeight, "F");

      // Draw left color edge
      doc.setFillColor(isResult ? 79 : 148, isResult ? 70 : 163, isResult ? 229 : 184); // Slate or Indigo
      doc.rect(margin, y, 1.5, boxHeight, "F");

      // Header label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(isResult ? 79 : 100, isResult ? 70 : 116, isResult ? 229 : 139);
      doc.text(title.toUpperCase(), margin + 6, y + 6);

      // Paragraph content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // slate-800
      
      let textY = y + 12;
      doc.text(splitLines, margin + 6, textY);
      textY += (splitLines.length * lineHeightMm);

      if (extraSubtext && extraLines.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(extraLines, margin + 6, textY + 1.5);
        textY += (extraLines.length * lineHeightMm) + 1.5;
      }

      y += boxHeight + 8;
    };

    // Box 1: Source text
    drawContentBox(`1. Source Document Text (${sourceLang})`, text, false);

    // Box 2: Translation result
    drawContentBox(
      `2. Translated Output (${targetLang})`, 
      translationResult.translatedText, 
      true, 
      translationResult.pronunciation ? `Pronunciation Guide: ${translationResult.pronunciation}` : undefined
    );

    // Box 3: Linguistic and script nuances analysis
    if (translationResult.linguisticNotes || (translationResult.regionalTerminologyUsed && translationResult.regionalTerminologyUsed.length > 0)) {
      checkOverflow(40);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("3. LINGUISTIC ANALYSIS & LOCAL TERMINOLOGY", margin, y);
      y += 5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;

      if (translationResult.linguisticNotes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85); // slate-700
        const notesLines = doc.splitTextToSize(translationResult.linguisticNotes, contentWidth);
        const lineHeightMm = 9.5 * 0.352778 * 1.35;
        const height = notesLines.length * lineHeightMm;
        
        checkOverflow(height + 10);
        doc.text(notesLines, margin, y);
        y += height + 8;
      }

      if (translationResult.regionalTerminologyUsed && translationResult.regionalTerminologyUsed.length > 0) {
        checkOverflow(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(79, 70, 229);
        doc.text("DETECTED ADMINISTRATIVE & REGIONAL GLOSSARY TERMS:", margin, y);
        y += 5;

        translationResult.regionalTerminologyUsed.forEach((term) => {
          const termHeader = `${term.term} ${term.equivalent ? `(Amharic Equiv: ${term.equivalent})` : ""}`;
          const explanation = term.meaning;

          const expLines = doc.splitTextToSize(explanation, contentWidth - 8);
          const lineHeightMm = 8.5 * 0.352778 * 1.3;
          const termHeight = 4 + (expLines.length * lineHeightMm) + 5;

          checkOverflow(termHeight + 5);

          // Draw item background card
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, termHeight, "F");
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.rect(margin, y, contentWidth, termHeight, "S");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text(termHeader, margin + 4, y + 4.5);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text(expLines, margin + 4, y + 9.5);

          y += termHeight + 3;
        });
      }
    }

    // Decorate Footers with page count on all generated pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer separation line
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin, 280, margin + contentWidth, 280);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("HornAI Translate • Official Linguistic Alignment Report", margin, 284);
      doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth, 284, { align: "right" });
    }

    // Save PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const safeFilename = `Linguistic_Report_${sourceLang}_to_${targetLang}_${timestamp}.pdf`;
    doc.save(safeFilename);
  };

  const highlightAdministrativeTerms = (text: string, regionalTerms: any[] = []) => {
    if (!text) return null;

    // Gather unique terms
    const termsSet = new Set<string>();
    
    // Add regional terms from API if they exist
    regionalTerms.forEach(item => {
      if (item && item.term && item.term.trim().length > 1) {
        termsSet.add(item.term.trim());
      }
    });

    // Add static administrative keywords
    ADMINISTRATIVE_KEYWORDS.forEach(kw => {
      termsSet.add(kw);
    });

    const uniqueTerms = Array.from(termsSet)
      .filter(t => t.length > 1)
      .sort((a, b) => b.length - a.length); // Sort descending by length

    if (uniqueTerms.length === 0) return text;

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const escapedTerms = uniqueTerms.map(term => {
      const escaped = escapeRegExp(term);
      if (/^[A-Za-z0-9]/.test(term) && /[A-Za-z0-9]$/.test(term)) {
        return `\\b${escaped}\\b`;
      }
      return escaped;
    });

    // Create regex pattern joining all terms with OR (|)
    const pattern = `(${escapedTerms.join("|")})`;
    const regex = new RegExp(pattern, "gi");

    const parts = text.split(regex);

    return parts.map((part, index) => {
      // If the part matches one of our unique terms (case-insensitive)
      const isMatched = uniqueTerms.some(
        term => term.toLowerCase() === part.toLowerCase()
      );

      if (isMatched) {
        // Find meaning if it's in regionalTerms
        const termInfo = regionalTerms.find(
          t => t && t.term && t.term.toLowerCase() === part.toLowerCase()
        );

        return (
          <span
            key={index}
            className="relative group inline-block bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded font-semibold transition-all duration-200 hover:bg-indigo-500/30 cursor-help"
          >
            {part}
            {/* Custom hover info tooltip */}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 scale-0 rounded-lg bg-slate-950 p-2 text-[10px] leading-normal text-slate-200 border border-slate-800 shadow-xl transition-all duration-150 group-hover:scale-100 font-sans font-normal normal-case text-center">
              <span className="font-bold text-indigo-400 block border-b border-slate-800 pb-1 mb-1">Administrative Term</span>
              {termInfo ? (
                <>
                  <span className="block mb-0.5 font-medium">{termInfo.meaning}</span>
                  {termInfo.equivalent && (
                    <span className="text-slate-400 block text-[9px]">Equiv: {termInfo.equivalent}</span>
                  )}
                </>
              ) : (
                <span className="text-slate-300">Official legal, registry, or administrative terminology.</span>
              )}
            </span>
          </span>
        );
      }

      return part;
    });
  };

  const copyToClipboard = (txt: string, id: string = "translation") => {
    if (!txt) return;
    navigator.clipboard.writeText(txt)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  return (
    <div className="space-y-6 animate-fade-in" id="translate-tab-root">
      {/* Configuration bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
        
        {/* Translation Direction 3D Flip Selector & Presets */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-indigo-500" />
            Language Mode:
          </span>

          {/* 3D Smooth Flip Language Selection Button */}
          <div className="relative inline-block" style={{ perspective: "1000px" }}>
            <motion.button
              type="button"
              id="btn-flip-language-mode"
              onClick={handleSwapLanguages}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              animate={{ rotateY: sourceLang === "Somali" ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 20, mass: 0.8 }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative h-10 w-[240px] sm:w-[260px] rounded-xl border border-indigo-200/90 bg-linear-to-r from-indigo-50 via-white to-indigo-50/70 shadow-xs hover:shadow-md hover:border-indigo-300 transition-shadow cursor-pointer select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/30 overflow-visible"
              title="Click to flip translation mode between Amharic and Somali"
              aria-label={`Current translation mode: ${sourceLang} to ${targetLang}. Click to flip.`}
            >
              {/* Front Face: Amharic -> Somali (0 deg) */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden"
                }}
                className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold rounded-xl bg-linear-to-r from-indigo-50/90 via-white to-indigo-50/70"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200/80 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-800">አማርኛ</span>
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(Amharic)</span>
                </div>

                <div className="mx-1.5 p-1 rounded-full bg-indigo-100 text-indigo-700 shadow-2xs flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-indigo-700">Soomaali</span>
                  <span className="text-[10px] text-indigo-400 font-normal hidden sm:inline">(Somali)</span>
                </div>
              </div>

              {/* Back Face: Somali -> Amharic (180 deg) */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)"
                }}
                className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold rounded-xl bg-linear-to-r from-blue-50/90 via-white to-blue-50/70"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-200/80 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-800">Soomaali</span>
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(Somali)</span>
                </div>

                <div className="mx-1.5 p-1 rounded-full bg-indigo-100 text-indigo-700 shadow-2xs flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-indigo-700">አማርኛ</span>
                  <span className="text-[10px] text-indigo-400 font-normal hidden sm:inline">(Amharic)</span>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Quick Direct Presets */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              id="preset-am-so"
              onClick={() => handleSetDirectionPreset("am-so")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activePreset === "am-so"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50 font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              አማርኛ ➔ Soomaali
            </button>
            <button
              type="button"
              id="preset-so-am"
              onClick={() => handleSetDirectionPreset("so-am")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                activePreset === "so-am"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50 font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Soomaali ➔ አማርኛ
            </button>
          </div>
        </div>



        {/* Translation Mode/Context */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Context & Dialect:</span>
          <select
            id="context-type-select"
            value={contextType}
            onChange={(e) => setContextType(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="standard">Standard Literary</option>
            <option value="administrative">Administrative (Woreda/Kebele/Official)</option>
            <option value="regional">Somali Region Dialectal (Ogaden)</option>
            <option value="banking">Banking & Finance (Birr/Shilling/EVC/Loans)</option>
            <option value="customs">Customs & Border Trade (Tariffs/Import/Duty)</option>
          </select>
        </div>

        {/* Output Tone */}
        <div className="flex items-center gap-3" id="output-tone-select-container">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Output Tone:</span>
          <select
            id="output-tone-select"
            value={outputTone}
            onChange={(e) => setOutputTone(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="standard">Standard / Neutral</option>
            <option value="formal">Formal / Respectful</option>
            <option value="informal">Casual / Informal</option>
            <option value="academic">Academic / Literary</option>
          </select>
        </div>
      </div>

      {/* Settings Persistence Layer Bar */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between flex-wrap gap-4 -mt-2 text-xs">
        {currentUser ? (
          (() => {
            const currentMatchesSaved = 
              (currentUser.preferences?.preferredSourceLang || "Amharic") === sourceLang &&
              (currentUser.preferences?.preferredTargetLang || "Somali") === targetLang &&
              (currentUser.preferences?.preferredTone || "standard") === outputTone;

            const handleSavePreferences = () => {
              const updatedUser = {
                ...currentUser,
                preferences: {
                  preferredSourceLang: sourceLang,
                  preferredTargetLang: targetLang,
                  preferredTone: outputTone
                }
              };
              onUpdateUser(updatedUser);
            };

            return (
              <>
                <div className="flex items-center gap-2 text-slate-600">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  <span>
                    Settings for <strong className="font-bold text-slate-800">{currentUser.username}</strong>:
                  </span>
                  {currentMatchesSaved ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[10px]">
                      <Check className="w-3 h-3" />
                      Saved defaults active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md text-[10px] animate-pulse">
                      Modified setup (not saved)
                    </span>
                  )}
                </div>

                {!currentMatchesSaved && (
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all text-[11px] shadow-xs hover:shadow-md cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Setup as Default
                  </button>
                )}
              </>
            );
          })()
        ) : (
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              Sign in to automatically save and apply your translation direction & tone preferences.
            </span>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 hover:border-slate-300 rounded-lg font-bold transition-all shadow-xs cursor-pointer text-[11px]"
            >
              Sign In / Register
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Linguistic System Notice:</span> {error}
          </div>
        </div>
      )}

      {/* Editor & Translation View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Text Input */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[250px]">
          <div className="border-b border-slate-100 px-4 py-3 flex justify-between items-center bg-slate-50/50 rounded-t-xl gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-slate-400" />
                <span>Source:</span>
                <motion.span
                  key={sourceLang}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-bold text-slate-800 font-sans"
                >
                  {sourceLang}
                </motion.span>
              </span>
              <button
                type="button"
                onClick={handleSwapLanguages}
                id="btn-swap-editor-languages"
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-md transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                title="Flip translation direction"
              >
                <motion.span
                  animate={{ rotate: sourceLang === "Somali" ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="inline-flex"
                >
                  <ArrowLeftRight className="w-3 h-3 text-indigo-600" />
                </motion.span>
                <span>Flip</span>
              </button>
            </div>
            <span className="text-xs text-slate-400 font-mono">{text.length} chars</span>
          </div>

          <AnimatePresence>
            {showDetectionSuggestion && detectedLang && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-indigo-50/80 border-b border-indigo-100/60 px-4 py-2.5 flex items-center justify-between gap-3 overflow-hidden text-xs"
              >
                <div className="flex items-center gap-2 text-indigo-800 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse shrink-0" />
                  <span>
                    Your input matches <strong className="font-bold text-indigo-700">{detectedLang}</strong>. Adjust source direction?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={applyDetectedLanguage}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all text-[11px] shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  Apply mapping
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Enter text in ${sourceLang} to translate...`}
            maxLength={5000}
            className="flex-1 p-4 text-base placeholder-slate-400 focus:outline-none resize-none font-sans"
          />

          <div className="p-3 border-t border-slate-100 flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                <div 
                  className={`h-full transition-all duration-300 ${
                    text.length >= 4500 ? "bg-rose-500 animate-pulse" : text.length >= 3500 ? "bg-amber-500" : "bg-indigo-600"
                  }`}
                  style={{ width: `${Math.min(100, (text.length / 5000) * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-mono font-semibold ${
                text.length >= 4800 ? "text-rose-600 font-bold" : text.length >= 3500 ? "text-amber-600" : "text-slate-500"
              }`}>
                {text.length.toLocaleString()} / 5,000 chars
              </span>

              {detectedLang && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100/50 text-emerald-700 font-bold flex items-center gap-1 select-none animate-fade-in shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Detected: {detectedLang}</span>
                </span>
              )}
            </div>

            <button
              onClick={handleTranslate}
              disabled={loading || !text.trim() || text.length > 5000}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Translate System
                </>
              )}
            </button>
          </div>
        </div>

        {/* Target Translation Output */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg flex flex-col min-h-[250px] relative">
          <div className="border-b border-slate-800 px-4 py-3 flex justify-between items-center bg-slate-950/50 rounded-t-xl">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5 flex-wrap">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target:</span>
              <motion.span
                key={targetLang}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-indigo-300 font-sans"
              >
                {targetLang}
              </motion.span>
              {translationResult && (
                <span className="text-[10px] lowercase normal-case bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 sm:ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Hover terms for administrative meanings
                </span>
              )}
            </span>

            {translationResult && (
              <div className="flex items-center gap-3">
                <button
                  onClick={exportTranslationToPdf}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-300 bg-indigo-600 hover:bg-indigo-700 hover:text-white rounded-md transition-all shadow-xs cursor-pointer"
                  title="Export Report PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-white" />
                  <span>Export PDF</span>
                </button>
                <div className="h-4 w-px bg-slate-800"></div>
                <button
                  onClick={() => copyToClipboard(translationResult.translatedText, "translation")}
                  className={`p-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                    copiedId === "translation"
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2"
                      : "hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                  title="Copy Translation"
                >
                  {copiedId === "translation" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <Clipboard className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col justify-between">
            {translationResult ? (
              <div className="space-y-4">
                <div className="text-base text-slate-100 leading-relaxed font-sans select-all whitespace-pre-wrap">
                  {highlightAdministrativeTerms(translationResult.translatedText, translationResult.regionalTerminologyUsed)}
                </div>

                {translationResult.pronunciation && (
                  <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80 flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Phonetic Pronunciation Guide:</span>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed select-all">
                        {translationResult.pronunciation}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(translationResult.pronunciation, "phonetic")}
                      className={`p-1 rounded transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                        copiedId === "phonetic"
                          ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2"
                          : "hover:bg-slate-800 text-slate-500 hover:text-slate-400"
                      }`}
                      title="Copy Pronunciation Guide"
                    >
                      {copiedId === "phonetic" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[9px] font-bold text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <Clipboard className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {translationResult.qualityAssessment && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Linguistic Quality Audit:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-950/60 p-2 rounded-md border border-slate-900/60 text-center">
                        <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Accuracy</span>
                        <div className="text-xs font-bold text-emerald-400">{translationResult.qualityAssessment.accuracyScore}%</div>
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${translationResult.qualityAssessment.accuracyScore}%` }}></div>
                        </div>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded-md border border-slate-900/60 text-center">
                        <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Naturalness</span>
                        <div className="text-xs font-bold text-indigo-400">{translationResult.qualityAssessment.naturalnessScore}%</div>
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: `${translationResult.qualityAssessment.naturalnessScore}%` }}></div>
                        </div>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded-md border border-slate-900/60 text-center">
                        <span className="text-[9px] text-slate-500 uppercase block mb-0.5">Clarity</span>
                        <div className="text-xs font-bold text-purple-400">{translationResult.qualityAssessment.clarityScore}%</div>
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                          <div className="bg-purple-500 h-full" style={{ width: `${translationResult.qualityAssessment.clarityScore}%` }}></div>
                        </div>
                      </div>
                    </div>
                    {translationResult.qualityAssessment.critique && (
                      <p className="text-[10px] text-slate-400 italic leading-relaxed bg-slate-950/50 p-2 rounded border border-slate-900/40">
                        💡 {translationResult.qualityAssessment.critique}
                      </p>
                    )}
                  </div>
                )}

                {translationResult.alternatives && translationResult.alternatives.length > 0 && (
                  <div className="border-t border-slate-800/80 pt-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Alternative Styles (Click to apply):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {translationResult.alternatives.map((alt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setTranslationResult({
                              ...translationResult,
                              translatedText: alt.text
                            });
                          }}
                          className="text-left p-2.5 bg-slate-950/30 hover:bg-indigo-950/20 border border-slate-800 hover:border-indigo-500/30 rounded-lg transition-all text-xs text-slate-300 group cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                              {alt.tone}
                            </span>
                          </div>
                          <p className="font-sans text-slate-200 line-clamp-2">"{alt.text}"</p>
                          {alt.description && <span className="text-[9px] text-slate-500 block mt-1">{alt.description}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {translationResult.sentenceAlignments && translationResult.sentenceAlignments.length > 0 && (
                  <div className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Bilingual Fragment Alignment:</span>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {translationResult.sentenceAlignments.map((align, idx) => (
                        <div key={idx} className="p-2 bg-slate-950/60 rounded border border-slate-800 hover:border-slate-700/80 transition-all text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] text-slate-500 block mb-0.5">Source ({sourceLang})</span>
                              <p className="text-slate-300 font-medium font-sans">"{align.source}"</p>
                            </div>
                            <div className="border-t md:border-t-0 md:border-l border-slate-800 md:pl-2.5 pt-1.5 md:pt-0">
                              <span className="text-[9px] text-indigo-400 block mb-0.5">Translation ({targetLang})</span>
                              <p className="text-slate-100 font-bold font-sans">"{align.target}"</p>
                            </div>
                          </div>
                          {align.explanation && (
                            <p className="text-[10px] text-slate-400 mt-1 pl-1 border-l-2 border-indigo-500/40 italic">
                              {align.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive AI Translation Refinement */}
                <div className="border-t border-slate-800/80 pt-3 mt-2">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Refine Translation with AI:</span>
                  </div>
                  <form onSubmit={handleRefine} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder="Type refinement instructions (e.g., 'make it simpler', 'correct tone')..."
                        className="w-full bg-slate-950 text-slate-100 border border-slate-800 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs focus:outline-none placeholder-slate-500"
                      />
                      {refinementPrompt.trim() && (
                        <button
                          type="button"
                          onClick={() => setRefinementPrompt("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={refining || !refinementPrompt.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {refining ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Refining...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Refine</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                    <p className="text-sm text-slate-400">Synthesizing grammar and translating characters...</p>
                  </>
                ) : (
                  <>
                    <Languages className="w-8 h-8 text-slate-700 mb-2" />
                    <p className="text-sm text-slate-500">Translated text will appear here.</p>
                  </>
                )}
              </div>
            )}

            {translationResult && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                {/* Engine Selector tabs */}
                <div className="flex border-b border-slate-800 pb-px gap-2">
                  <button
                    onClick={() => {
                      setSpeechEngine("webSpeech");
                      handleStopWebSpeech();
                    }}
                    className={`pb-2 px-3 text-xs font-semibold transition-all border-b-2 -mb-px ${
                      speechEngine === "webSpeech"
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    Web Speech API (Local Reader)
                  </button>
                  <button
                    onClick={() => {
                      setSpeechEngine("cloud");
                      handleStopWebSpeech();
                    }}
                    className={`pb-2 px-3 text-xs font-semibold transition-all border-b-2 -mb-px ${
                      speechEngine === "cloud"
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    Cloud Voice Synthesis (Gemini TTS)
                  </button>
                </div>

                {speechEngine === "webSpeech" ? (
                  <div className="space-y-3.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Voice Selection */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Local Voice</label>
                        {voices.length > 0 ? (
                          <select
                            value={selectedLocalVoice}
                            onChange={(e) => setSelectedLocalVoice(e.target.value)}
                            className="bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded text-xs text-slate-200 focus:outline-none w-full"
                          >
                            {voices.map((voice) => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-xs text-slate-500 italic p-1">No local browser voices available</div>
                        )}
                      </div>

                      {/* Reading Mode */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reading Input</label>
                        <div className="flex items-center gap-4 mt-1.5">
                          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="readingMode"
                              checked={!readPronunciationGuide}
                              onChange={() => setReadPronunciationGuide(false)}
                              className="accent-indigo-500"
                            />
                            <span>Translated Text</span>
                          </label>
                          {translationResult.pronunciation && (
                            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none" title="Uses the Latin pronunciation guide which standard voices read beautifully">
                              <input
                                type="radio"
                                name="readingMode"
                                checked={readPronunciationGuide}
                                onChange={() => setReadPronunciationGuide(true)}
                                className="accent-indigo-500"
                              />
                              <span>Phonetic Guide</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Phonetic Optimizations Notice / Toggle for Somali and Amharic */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      {targetLang === "Somali" && !readPronunciationGuide && (
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={optimizePhonetics}
                            onChange={(e) => setOptimizePhonetics(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                          />
                          <span>Apply phonetic adaptations for non-native Somali voices (e.g. x &rarr; h)</span>
                        </label>
                      )}
                      {targetLang === "Amharic" && !readPronunciationGuide && (
                        <div className="text-[11px] text-slate-400 italic">
                          💡 If no local Amharic voice is available, the system will automatically fall back to the phonetic pronunciation guide to ensure clean output.
                        </div>
                      )}
                    </div>

                    {/* Rate & Pitch Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1.5 border-t border-slate-800/40">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                          <span className="flex items-center gap-1"><Sliders className="w-3 h-3" /> Reading Speed</span>
                          <span>{playbackRate.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={playbackRate}
                          onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                          <span>Voice Pitch</span>
                          <span>{playbackPitch.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.1"
                          value={playbackPitch}
                          onChange={(e) => setPlaybackPitch(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/40">
                      {playingWebSpeech && (
                        <button
                          onClick={handleStopWebSpeech}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md transition-all cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Stop Speech
                        </button>
                      )}
                      <button
                        onClick={handlePlayWebSpeech}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-all shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {playingWebSpeech ? "Replay Speech" : "Speak (Local Web Speech)"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                    {/* Voice Selection for TTS */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Voice Profile:</span>
                      <select
                        value={ttsVoice}
                        onChange={(e) => setTtsVoice(e.target.value)}
                        className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="Zephyr">Zephyr (Male Ambient)</option>
                        <option value="Kore">Kore (Female Crisp)</option>
                        <option value="Puck">Puck (Cheerful)</option>
                        <option value="Charon">Charon (Deep Vocal)</option>
                        <option value="Fenrir">Fenrir (Traditional)</option>
                      </select>
                    </div>

                    <button
                      onClick={playTtsAudio}
                      disabled={playingTts}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md transition-all shrink-0 cursor-pointer"
                    >
                      {playingTts ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Speaking...
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Listen (Gemini TTS)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Translation Metadata: Linguistics & Regional terminology */}
      {translationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Linguistic analysis */}
          {translationResult.linguisticNotes && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Linguistic and Script Analysis
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(translationResult.linguisticNotes, "linguistic")}
                    className={`p-1.5 rounded transition-all flex items-center gap-1 cursor-pointer ${
                      copiedId === "linguistic"
                        ? "bg-emerald-50 text-emerald-600 font-bold text-[10px] px-2"
                        : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    }`}
                    title="Copy Linguistic Notes"
                  >
                    {copiedId === "linguistic" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <Clipboard className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2">
                  {translationResult.linguisticNotes}
                </p>
              </div>
            </div>
          )}

          {/* Regional Terminology Detected */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Regional & Administrative Nuances Detected
            </h3>
            {translationResult.regionalTerminologyUsed && translationResult.regionalTerminologyUsed.length > 0 ? (
              <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
                {translationResult.regionalTerminologyUsed.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700 font-mono">{item.term}</span>
                      {item.equivalent && (
                        <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          Equiv: {item.equivalent}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{item.meaning}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No specific localized administrative or cultural terms were flagged in this sample. Standard vocabulary was applied.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Translation History Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4" id="translation-history-section">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-indigo-500" />
            <span>Recent Translation History (Last 5)</span>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {history.length} / 5 Saved
            </span>
          </h3>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-all cursor-pointer font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => selectHistoryItem(item)}
                className="group relative bg-slate-50 hover:bg-indigo-50/30 p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <div className="flex items-center gap-1 text-[10px]">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{item.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded uppercase text-[9px] font-bold">
                      {item.sourceLang.substring(0, 3)} &rarr; {item.targetLang.substring(0, 3)}
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded capitalize text-[9px] font-bold border border-indigo-100">
                      {item.contextType}
                    </span>
                  </div>
                </div>

                {/* Content preview */}
                <div className="space-y-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Original</span>
                    <p className="text-slate-600 line-clamp-2 leading-relaxed">
                      {item.sourceText}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400 block">Translation</span>
                    <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                      {item.translationResult.translatedText}
                    </p>
                  </div>
                </div>

                {/* Footer / Click to load */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 group-hover:text-indigo-600 transition-all">
                  <span className="flex items-center gap-0.5 font-bold">
                    <span>Revisit translation</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  
                  <button
                    onClick={(e) => deleteHistoryItem(item.id, e)}
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all md:opacity-0 md:group-hover:opacity-100"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <History className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No past translation sessions yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your successful translations will automatically be saved here</p>
          </div>
        )}
      </div>
    </div>
  );
}
