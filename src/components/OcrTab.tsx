import React, { useState, useRef, useEffect } from "react";
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2, AlertCircle, CheckCircle, LayoutGrid, Clipboard, Volume2, Trash2, Play, RotateCcw, Plus, ChevronRight, Info, Check, X, Layers, FileDown, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { OcrData } from "../types";
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

const highlightAdministrativeTerms = (text: string) => {
  if (!text) return null;

  const termsSet = new Set<string>();
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
      return (
        <span
          key={index}
          className="relative group inline-block bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 px-1 py-0.5 rounded font-semibold transition-all duration-200 hover:bg-indigo-500/30 cursor-help"
        >
          {part}
          {/* Custom hover info tooltip */}
          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 scale-0 rounded-lg bg-slate-950 p-2 text-[10px] leading-normal text-slate-200 border border-slate-800 shadow-xl transition-all duration-150 group-hover:scale-100 font-sans font-normal normal-case text-center">
            <span className="font-bold text-indigo-400 block border-b border-slate-800 pb-1 mb-1">Administrative Term</span>
            <span className="text-slate-300">Official legal, registry, or administrative terminology.</span>
          </span>
        </span>
      );
    }

    return part;
  });
};

export interface QueueItem {
  id: string;
  name: string;
  image: string; // base64 representation or "sample"
  mimeType: string;
  docType?: "image" | "pdf" | "word";
  fileSize?: string;
  status: "idle" | "processing" | "success" | "error";
  progress: number;
  progressMessage: string;
  targetLang: string;
  contextType: string;
  result: OcrData | null;
  error: string | null;
}

type SupportedDocType = "image" | "pdf" | "word";

type DocInfo = 
  | { valid: true; docType: SupportedDocType; mimeType: string }
  | { valid: false; docType?: undefined; mimeType: string };

const getDocumentInfo = (file: File): DocInfo => {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff|heic|svg)$/i.test(name)) {
    return {
      valid: true,
      docType: "image",
      mimeType: type || "image/jpeg",
    };
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return {
      valid: true,
      docType: "pdf",
      mimeType: "application/pdf",
    };
  }

  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return {
      valid: true,
      docType: "word",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  if (type === "application/msword" || name.endsWith(".doc")) {
    return {
      valid: true,
      docType: "word",
      mimeType: "application/msword",
    };
  }

  return {
    valid: false,
    mimeType: type,
  };
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Base64 pre-defined mock scans for user convenience if they don't have a document handy
const SAMPLE_DOCS = [
  {
    name: "Jigjiga Kebele Receipt (Amharic)",
    lang: "Amharic",
    target: "Somali",
    desc: "A local administrative fee receipt printed in Jigjiga Kebele 03.",
    transcription: "ጅጅጋ ከተማ አስተዳደር ቀበሌ 03 ጽሕፈት ቤት\nየክፍያ ደረሰኝ ቁጥር: 98421\nቀን: 24/10/2018\nየክፍያ ዓይነት: የቤት ግብር እና የቆሻሻ ማጽጃ አገልግሎት\nጠቅላላ ክፍያ: 450 ብር (አራት መቶ ሃምሳ ብር)",
    translation: "Xafiiska Maamulka Magaalada Jigjiga Kebele 03\nWarqadda Aqoonsiga Lacag-bixinta Lr: 98421\nTaariikhda: 24/10/2018\nNooca Lacag-bixinta: Cashuurta Guriga iyo Adeegga Nadiifinta Qashinka\nLacagta Guud: 450 Birr (Afar boqol iyo konton Birr)",
    blocks: [
      { original: "ጅጅጋ ከተማ አስተዳደር ቀበሌ 03 ጽሕፈት ቤት", translated: "Xafiiska Maamulka Magaalada Jigjiga Kebele 03" },
      { original: "የክፍያ ደረሰኝ ቁጥር: 98421", translated: "Warqadda Aqoonsiga Lacag-bixinta Lr: 98421" },
      { original: "ቀን: 24/10/2018", translated: "Taariikhda: 24/10/2018" },
      { original: "የክፍያ ዓይነት: የቤት ግብር እና የቆሻሻ ማጽጃ አገልግሎት", translated: "Nooca Lacag-bixinta: Cashuurta Guriga iyo Adeegga Nadiifinta Qashinka" },
      { original: "ጠቅላላ ክፍያ: 450 ብር (አራት መቶ ሃምሳ ብር)", translated: "Lacagta Guud: 450 Birr (Afar boqol iyo konton Birr)" }
    ],
    script: "Ge'ez (Amharic)",
    clarity: 92,
    nuance: "Uses traditional Kebele administrative formatting. The currency unit 'ብር' (Birr) is translated literally."
  },
  {
    name: "Ogaden Woreda Announcement (Somali)",
    lang: "Somali",
    target: "Amharic",
    desc: "An official public advisory bulletin in Standard Somali from a Woreda Bureau.",
    transcription: "War-saxaafadeed ku saabsan horumarka beeraha ee Degmada.\nXafiiska Horumarinta Beeraha ee Gobolka wuxuu ogaysiinayaa dhammaan beeralayda in gargaarka abuurka cusub uu ka bilaaban doono xarunta Woreda Isniinta soo socota.\nFadlan la xiriir guddiga deegaanka.",
    translation: "የወረዳው ግብርና ልማት መግለጫ።\nየክልሉ ግብርና ልማት ቢሮ ለሁሉም አርሶ አደሮች አዲሱ የዘር እርዳታ በሚቀጥለው ሰኞ በወረዳው ማዕከል እንደሚጀምር ያሳውቃል።\nእባክዎን የአካባቢውን ኮሚቴ ያነጋግሩ።",
    blocks: [
      { original: "War-saxaafadeed ku saabsan horumarka beeraha ee Degmada.", translated: "የወረዳው ግብርና ልማት መግለጫ።" },
      { original: "Xafiiska Horumarinta Beeraha ee Gobolka wuxuu ogaysiinayaa dhammaan beeralayda in gargaarka abuurka cusub uu ka bilaaban doono xarunta Woreda Isniinta soo socota.", translated: "የክልሉ ግብርና ልማት ቢሮ ለሁሉም አርሶ አደሮች አዲሱ የዘር እርዳታ በሚቀጥለው ሰኞ በወረዳው ማዕከል እንደሚጀምር ያሳውቃልረ።" },
      { original: "Fadlan la xiriir guddiga deegaanka.", translated: "እባክዎን የአካባቢውን ኮሚቴ ያነጋግሩ።" }
    ],
    script: "Latin (Somali)",
    clarity: 95,
    nuance: "Standard administrative terminology. 'Xafiiska' corresponds to 'ቢሮ' (Bureau). 'Degmada' corresponds to 'ወረዳው' (Woreda)."
  }
];

export default function OcrTab() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Zoom and rotation states for captured documents
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom & rotation when changing the inspected document
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [activeId]);
  
  // Default values for newly added items
  const [defaultTargetLang, setDefaultTargetLang] = useState("Somali");
  const [defaultContextType, setDefaultContextType] = useState("administrative");
  const [globalError, setGlobalError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playing state for synthesized voice
  const [playingTts, setPlayingTts] = useState<number | null>(null);

  // Copy with Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (textToCopy: string, id: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  const exportOcrToPdf = (item: QueueItem) => {
    if (!item.result) return;
    const { result } = item;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2); // 170mm

    // Draw top brand bar (crimson/rose theme for OCR)
    doc.setFillColor(225, 29, 72); 
    doc.rect(margin, 15, contentWidth, 2.5, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Multimodal Document OCR & Translation Report", margin, 27);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Official administrative OCR output generated via HornAI OCR VLM Engine - File: ${item.name}`, margin, 32);

    // Separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, 36, margin + contentWidth, 36);

    let y = 43;

    // Metadata Panel
    doc.setFillColor(250, 250, 250); // slate-50
    doc.rect(margin, y, contentWidth, 24, "F");
    
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 24, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    
    // Column 1
    doc.text("REPORT DATE", margin + 6, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const reportDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(reportDateStr, margin + 6, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("PROCESSING ENGINE", margin + 6, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72); // Rose/Crimson
    doc.text("HornAI OCR & Translation VLM", margin + 6, y + 21);

    // Column 2
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("SCRIPT DETECTED", margin + 62, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(result.scriptDetected || "Auto-detected", margin + 62, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CLARITY SCORE", margin + 62, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${result.clarityScore}%`, margin + 62, y + 21);

    // Column 3
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TARGET LANGUAGE", margin + 115, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(item.targetLang, margin + 115, y + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CONTEXT TYPE", margin + 115, y + 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(item.contextType.toUpperCase(), margin + 115, y + 21);

    y += 34;

    const checkOverflow = (neededHeight: number) => {
      if (y + neededHeight > 270) {
        doc.addPage();
        // Add header banner on new page
        doc.setFillColor(225, 29, 72);
        doc.rect(margin, 15, contentWidth, 1.5, "F");
        y = 25;
      }
    };

    // Helper to draw a content section block
    const drawContentBox = (title: string, textContent: string, isResult: boolean = false) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitLines = doc.splitTextToSize(textContent, contentWidth - 12);
      const lineHeightMm = 10 * 0.352778 * 1.35;
      const boxHeight = (splitLines.length * lineHeightMm) + 16;
      
      checkOverflow(boxHeight + 10);

      // Draw box background
      doc.setFillColor(isResult ? 255 : 248, isResult ? 244 : 250, isResult ? 245 : 252); // Tint of rose or light gray
      doc.rect(margin, y, contentWidth, boxHeight, "F");

      // Draw left color edge
      doc.setFillColor(isResult ? 225 : 100, isResult ? 29 : 116, isResult ? 72 : 139); 
      doc.rect(margin, y, 1.5, boxHeight, "F");

      // Header label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(isResult ? 225 : 100, isResult ? 29 : 116, isResult ? 72 : 139);
      doc.text(title.toUpperCase(), margin + 6, y + 6);

      // Paragraph content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      
      doc.text(splitLines, margin + 6, y + 12);

      y += boxHeight + 8;
    };

    // Full transcription
    if (result.originalTranscription) {
      drawContentBox("1. Full Document Transcription (Original)", result.originalTranscription, false);
    }

    // Full translation
    if (result.translatedText) {
      drawContentBox(`2. Full Translated Text (${item.targetLang})`, result.translatedText, true);
    }

    // Segment by Segment layout blocks
    if (result.layoutBlocks && result.layoutBlocks.length > 0) {
      checkOverflow(25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("3. SEGMENT-BY-SEGMENT ALIGNED BLOCKS", margin, y);
      y += 5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;

      result.layoutBlocks.forEach((block, idx) => {
        const origLines = doc.splitTextToSize(block.original, (contentWidth / 2) - 8);
        const transLines = doc.splitTextToSize(block.translated, (contentWidth / 2) - 8);

        const lineHeightMm = 9 * 0.352778 * 1.3;
        const blockHeight = Math.max(origLines.length, transLines.length) * lineHeightMm + 10;

        checkOverflow(blockHeight + 5);

        // Draw outer block card
        doc.setFillColor(252, 253, 254);
        doc.rect(margin, y, contentWidth, blockHeight, "F");

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, contentWidth, blockHeight, "S");

        // Vertical divider
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + (contentWidth / 2), y, margin + (contentWidth / 2), y + blockHeight);

        // Left: Original
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Segment ${idx + 1} - Original`, margin + 4, y + 5.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(origLines, margin + 4, y + 10.5);

        // Right: Translated
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(225, 29, 72);
        doc.text(`Segment ${idx + 1} - Translated`, margin + (contentWidth / 2) + 4, y + 5.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(transLines, margin + (contentWidth / 2) + 4, y + 10.5);

        y += blockHeight + 3;
      });
    }

    if (result.regionalNuances) {
      checkOverflow(25);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("4. REGIONAL NUANCES & DIALECTICAL REMARKS", margin, y);
      y += 5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;

      const nuanceLines = doc.splitTextToSize(result.regionalNuances, contentWidth);
      const lineHeightMm = 9 * 0.352778 * 1.35;
      const nuancesHeight = nuanceLines.length * lineHeightMm;

      checkOverflow(nuancesHeight + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(nuanceLines, margin, y);
      y += nuancesHeight + 8;
    }

    // Footers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin, 280, margin + contentWidth, 280);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("HornAI OCR • Multimodal Document Translation Alignment Report", margin, 284);
      doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth, 284, { align: "right" });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const safeFilename = `OCR_Report_${item.name.replace(/\.[^/.]+$/, "")}_${timestamp}.pdf`;
    doc.save(safeFilename);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const addFilesToQueue = (files: FileList) => {
    const newItems: QueueItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docInfo = getDocumentInfo(file);

      if (!docInfo.valid) {
        setGlobalError("Unsupported file type. Please upload images (PNG, JPG, WEBP), PDF documents (.pdf), or Word files (.docx, .doc).");
        continue;
      }

      const id = "doc-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      
      const itemPlaceholder: QueueItem = {
        id,
        name: file.name,
        image: "", // Will load asynchronously
        mimeType: docInfo.mimeType,
        docType: docInfo.docType,
        fileSize: formatFileSize(file.size),
        status: "idle",
        progress: 0,
        progressMessage: "Queued",
        targetLang: defaultTargetLang,
        contextType: defaultContextType,
        result: null,
        error: null
      };
      
      newItems.push(itemPlaceholder);

      // Read file asynchronously as base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setQueue(prev => prev.map(q => q.id === id ? { ...q, image: base64 } : q));
      };
      reader.readAsDataURL(file);
    }

    if (newItems.length > 0) {
      setQueue(prev => [...prev, ...newItems]);
      // Set the first new item as active if there wasn't an active item
      setActiveId(prev => prev || newItems[0].id);
      setGlobalError("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQueue(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (activeId === id) {
        setActiveId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const clearQueue = () => {
    if (window.confirm("Are you sure you want to clear all documents from the queue?")) {
      setQueue([]);
      setActiveId(null);
      setGlobalError("");
      setIsProcessingQueue(false);
    }
  };

  const updateItemState = (id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const runOcrOnItem = async (item: QueueItem) => {
    updateItemState(item.id, {
      status: "processing",
      progress: 5,
      progressMessage: "Initializing..."
    });

    let currentProgress = 5;
    const progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.floor(Math.random() * 8) + 3;
        if (currentProgress > 90) currentProgress = 90;
        
        let msg = "Processing...";
        if (currentProgress < 25) msg = "Reading characters...";
        else if (currentProgress < 55) msg = "Detecting script...";
        else if (currentProgress < 85) msg = "Translating text blocks...";
        else msg = "Formatting layout...";

        updateItemState(item.id, {
          progress: currentProgress,
          progressMessage: msg
        });
      }
    }, 450);

    try {
      let resultData: OcrData;

      if (item.image === "sample") {
        // Handle sample offline/locally to prevent passing non-base64 "sample" to multimodal endpoint
        const matchedSample = SAMPLE_DOCS.find(s => s.name === item.name) || SAMPLE_DOCS[0];
        
        // Add a short delay to make the scan feel realistic
        await new Promise(resolve => setTimeout(resolve, 1200));

        let finalResult: OcrData = {
          scriptDetected: matchedSample.script,
          originalTranscription: matchedSample.transcription,
          translatedText: matchedSample.translation,
          layoutBlocks: matchedSample.blocks,
          clarityScore: matchedSample.clarity,
          regionalNuances: matchedSample.nuance
        };

        // If the user changed the target language from the default of the sample, perform a text translation
        if (item.targetLang !== matchedSample.target) {
          updateItemState(item.id, { progressMessage: "Translating to custom language..." });

          // Translate layout blocks
          const translatedBlocks = await Promise.all(
            matchedSample.blocks.map(async (block) => {
              try {
                const res = await fetch("/api/translate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    text: block.original,
                    sourceLang: matchedSample.lang,
                    targetLang: item.targetLang,
                    contextType: item.contextType
                  })
                });
                const r = await res.json();
                if (r.status === "success" && r.data) {
                  return {
                    original: block.original,
                    translated: r.data.translatedText
                  };
                }
              } catch (e) {
                console.error("Failed to translate block", e);
              }
              return { original: block.original, translated: block.translated };
            })
          );

          // Translate full text
          let translatedText = matchedSample.translation;
          try {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: matchedSample.transcription,
                sourceLang: matchedSample.lang,
                targetLang: item.targetLang,
                contextType: item.contextType
              })
            });
            const r = await res.json();
            if (r.status === "success" && r.data) {
              translatedText = r.data.translatedText;
            }
          } catch (e) {
            console.error(e);
          }

          finalResult = {
            ...finalResult,
            translatedText,
            layoutBlocks: translatedBlocks
          };
        }

        resultData = finalResult;
      } else {
        const response = await fetch("/api/ocr-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: item.image,
            mimeType: item.mimeType,
            fileName: item.name,
            targetLang: item.targetLang,
            contextType: item.contextType
          })
        });

        const result = await response.json();
        if (result.status === "success") {
          resultData = result.data;
        } else {
          throw new Error(result.error || "OCR processing failed");
        }
      }

      clearInterval(progressInterval);
      updateItemState(item.id, {
        status: "success",
        progress: 100,
        progressMessage: "Completed",
        result: resultData,
        error: null
      });
    } catch (err: any) {
      clearInterval(progressInterval);
      updateItemState(item.id, {
        status: "error",
        progress: 100,
        progressMessage: "Failed",
        error: err.message || "Network error occurred"
      });
    }

    // Trigger next recursive step on the updated queue
    setQueue(prev => {
      setTimeout(() => {
        processQueueSequentially(prev);
      }, 50);
      return prev;
    });
  };

  const processQueueSequentially = async (currentQueueState?: QueueItem[]) => {
    const activeQueue = currentQueueState || queue;
    const nextItem = activeQueue.find(item => item.status === "idle" || item.status === "error");
    
    if (!nextItem) {
      setIsProcessingQueue(false);
      return;
    }

    setIsProcessingQueue(true);
    setActiveId(nextItem.id);

    if (!nextItem.image) {
      let attempts = 0;
      const checkData = setInterval(async () => {
        const updatedQueue = await new Promise<QueueItem[]>(resolve => {
          setQueue(prev => {
            resolve(prev);
            return prev;
          });
        });
        const currentItem = updatedQueue.find(item => item.id === nextItem.id);
        attempts++;
        if (currentItem?.image || attempts > 10) {
          clearInterval(checkData);
          if (currentItem?.image) {
            runOcrOnItem(currentItem);
          } else {
            updateItemState(nextItem.id, {
              status: "error",
              progress: 100,
              progressMessage: "Failed to read image",
              error: "Failed to read local image data."
            });
            setQueue(prev => {
              setTimeout(() => processQueueSequentially(prev), 50);
              return prev;
            });
          }
        }
      }, 100);
      return;
    }

    runOcrOnItem(nextItem);
  };

  const processSingleItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = queue.find(q => q.id === id);
    if (item) {
      setIsProcessingQueue(true);
      runOcrOnItem(item);
    }
  };

  const loadSampleDoc = (sample: typeof SAMPLE_DOCS[0]) => {
    const sampleId = "sample-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const newItem: QueueItem = {
      id: sampleId,
      name: sample.name,
      image: "sample",
      mimeType: "image/png",
      status: "success",
      progress: 100,
      progressMessage: "Completed",
      targetLang: sample.target,
      contextType: "administrative",
      result: {
        scriptDetected: sample.script,
        originalTranscription: sample.transcription,
        translatedText: sample.translation,
        layoutBlocks: sample.blocks,
        clarityScore: sample.clarity,
        regionalNuances: sample.nuance
      },
      error: null
    };

    setQueue(prev => [newItem, ...prev]);
    setActiveId(sampleId);
    setGlobalError("");
  };

  const playOcrTts = async (text: string, index: number) => {
    setPlayingTts(index);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceName: "Zephyr"
        })
      });

      const result = await response.json();
      if (result.status === "success" && result.audio) {
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
          channelData[i] = int16Array[i] / 32768.0;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          setPlayingTts(null);
        };
        source.start(0);
      } else {
        setPlayingTts(null);
      }
    } catch (err) {
      console.error(err);
      setPlayingTts(null);
    }
  };

  // Calculate queue progress
  const totalItems = queue.length;
  const completedItems = queue.filter(item => item.status === "success").length;
  const failedItems = queue.filter(item => item.status === "error").length;
  const processingItems = queue.filter(item => item.status === "processing").length;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const activeItem = queue.find(item => item.id === activeId);

  return (
    <div className="space-y-6 animate-fade-in" id="ocr-tab-root">
      <div>
        <h2 className="text-xl font-semibold text-slate-850 tracking-tight flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" />
          Multimodal Document OCR & Translator
        </h2>
        <p className="text-sm text-slate-500">
          Upload or drag-and-drop multiple scanned images, PDF documents, or Word files (.docx, .doc) containing Amharic or Somali text. HornAI scans, extracts text, and translates side-by-side.
        </p>
      </div>

      {globalError && (
        <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {globalError}
        </div>
      )}

      {/* Main interactive OCR work area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document Queue and Uploaders Column */}
        <div className="lg:col-span-5 space-y-4">
          
          {queue.length === 0 ? (
            /* EMPTY QUEUE STATE - SHOW BIG DROPZONE & QUICK TEMPLATES */
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Upload Documents</span>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-50/20"
                      : "border-slate-200 hover:border-indigo-500/50 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    className="hidden"
                  />
                  <div className="relative inline-flex items-center justify-center p-3.5 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                    <Upload className="w-7 h-7" />
                    <Plus className="w-3.5 h-3.5 absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 border-2 border-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-1">Drag & Drop Documents (Images, PDF, Word)</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal mb-3">
                    Select receipts, announcements, PDF documents, or Word files (.docx, .doc) at once for batch processing.
                  </p>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/60 text-slate-600">Images (PNG/JPG)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">PDF Documents</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Word (.docx, .doc)</span>
                  </div>
                </div>

                {/* Global Defaults when empty */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Language</label>
                    <select
                      value={defaultTargetLang}
                      onChange={(e) => setDefaultTargetLang(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none"
                    >
                      <option value="Somali">Somali (Soomaali)</option>
                      <option value="Amharic">Amharic (አማርኛ)</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Translation Context</label>
                    <select
                      value={defaultContextType}
                      onChange={(e) => setDefaultContextType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none"
                    >
                      <option value="administrative">Administrative</option>
                      <option value="legal">Legal & Deeds</option>
                      <option value="medical">Medical / Health</option>
                      <option value="commercial">Commercial / Receipts</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sample Document selectors for fast trials */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-2.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Quick Test Templates
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {SAMPLE_DOCS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadSampleDoc(sample)}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-500 rounded-xl text-left transition-all shadow-xs flex items-start gap-2.5 group"
                    >
                      <FileText className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-800 transition-colors block">
                          {sample.name}
                        </span>
                        <span className="text-[10px] text-slate-400 leading-normal block">
                          {sample.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* POPULATED BATCH QUEUE CONTAINER */
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
              
              {/* Queue Header Summary */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4.5 h-4.5 text-indigo-600" />
                    <span>Documents Queue</span>
                    <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {completedItems}/{totalItems} Done
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click any document to inspect</p>
                </div>
                
                <button
                  onClick={clearQueue}
                  className="text-xs text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-all font-medium cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>

              {/* Overall Progress Tracker */}
              {totalItems > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-600">Overall Progress</span>
                    <span className="font-bold text-indigo-600">{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>{processingItems > 0 ? "Analyzing queue..." : "Queue Idle"}</span>
                    <span>
                      {failedItems > 0 && <span className="text-rose-500 font-medium mr-2">{failedItems} Failed</span>}
                      {completedItems} Completed
                    </span>
                  </div>
                </div>
              )}

              {/* Batch Settings for newly queued items */}
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Default Target</label>
                  <select
                    value={defaultTargetLang}
                    onChange={(e) => {
                      setDefaultTargetLang(e.target.value);
                      // Update idle items target as well for user convenience
                      setQueue(prev => prev.map(q => q.status === "idle" ? { ...q, targetLang: e.target.value } : q));
                    }}
                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-[11px] text-slate-700 font-semibold focus:outline-none"
                  >
                    <option value="Somali">Somali (Soomaali)</option>
                    <option value="Amharic">Amharic (አማርኛ)</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Default Context</label>
                  <select
                    value={defaultContextType}
                    onChange={(e) => {
                      setDefaultContextType(e.target.value);
                      // Update idle items context as well
                      setQueue(prev => prev.map(q => q.status === "idle" ? { ...q, contextType: e.target.value } : q));
                    }}
                    className="w-full bg-white border border-slate-200 px-2 py-1 rounded text-[11px] text-slate-700 font-semibold focus:outline-none"
                  >
                    <option value="administrative">Administrative</option>
                    <option value="legal">Legal & Deeds</option>
                    <option value="medical">Medical / Health</option>
                    <option value="commercial">Commercial / Receipts</option>
                  </select>
                </div>
              </div>

              {/* Main Process Queue Call to Action */}
              <div className="pt-1">
                {isProcessingQueue ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-indigo-50 text-indigo-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-indigo-150"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Processing Batch Queue...</span>
                  </button>
                ) : (
                  <button
                    onClick={() => processQueueSequentially()}
                    disabled={queue.filter(q => q.status === "idle" || q.status === "error").length === 0}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-150 disabled:text-slate-400 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Batch Processing ({queue.filter(q => q.status === "idle" || q.status === "error").length} remaining)</span>
                  </button>
                )}
              </div>

              {/* Queue Scroll List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {queue.map((item) => {
                  const isActive = item.id === activeId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-indigo-50/40 border-indigo-300 shadow-xs"
                          : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      {/* Left: Thumbnail Preview */}
                      <div className="relative w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center border border-slate-300/60">
                        {item.image === "sample" ? (
                          <div className="bg-indigo-50 w-full h-full flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                          </div>
                        ) : item.docType === "pdf" ? (
                          <div className="bg-rose-50 w-full h-full flex flex-col items-center justify-center text-rose-600">
                            <FileText className="w-4 h-4" />
                            <span className="text-[7px] font-extrabold uppercase mt-0.5 leading-none">PDF</span>
                          </div>
                        ) : item.docType === "word" ? (
                          <div className="bg-blue-50 w-full h-full flex flex-col items-center justify-center text-blue-600">
                            <FileText className="w-4 h-4" />
                            <span className="text-[7px] font-extrabold uppercase mt-0.5 leading-none">DOC</span>
                          </div>
                        ) : item.image ? (
                          <img
                            src={item.image}
                            alt="document crop"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        )}

                        {/* Status Overlay Badge */}
                        {item.status === "success" && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-600 bg-white rounded-full p-0.5 shadow-xs" />
                          </div>
                        )}
                        {item.status === "error" && (
                          <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-rose-600 bg-white rounded-full p-0.5 shadow-xs" />
                          </div>
                        )}
                        {item.status === "processing" && (
                          <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Middle: Name and Progress Bar */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-700 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.fileSize && (
                              <span className="text-[9px] text-slate-400 font-medium">{item.fileSize}</span>
                            )}
                            <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-200/50 px-1 py-0.2 rounded">
                              {item.targetLang.substring(0, 3)}
                            </span>
                          </div>
                        </div>

                        {/* Progress and status message */}
                        {item.status === "processing" ? (
                          <div className="space-y-0.5">
                            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                            </div>
                            <p className="text-[9px] font-semibold text-indigo-600 flex justify-between">
                              <span>{item.progressMessage}</span>
                              <span>{item.progress}%</span>
                            </p>
                          </div>
                        ) : item.status === "success" ? (
                          <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>Successfully Translated</span>
                          </p>
                        ) : item.status === "error" ? (
                          <p className="text-[9px] font-bold text-rose-500 truncate" title={item.error || "OCR failed"}>
                            Error: {item.error || "Failed"}
                          </p>
                        ) : (
                          <p className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                            <span>Ready in Queue •</span>
                            <span className="capitalize">{item.contextType}</span>
                          </p>
                        )}
                      </div>

                      {/* Right: Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.status !== "processing" && (
                          <>
                            {(item.status === "idle" || item.status === "error") && (
                              <button
                                onClick={(e) => processSingleItem(item.id, e)}
                                disabled={isProcessingQueue}
                                className="p-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 rounded transition-all disabled:opacity-50 cursor-pointer"
                                title="Process document"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                            )}
                            {item.status === "success" && (
                              <button
                                onClick={(e) => processSingleItem(item.id, e)}
                                disabled={isProcessingQueue}
                                className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 rounded transition-all cursor-pointer"
                                title="Re-process scan"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => removeItem(item.id, e)}
                              className="p-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-500 rounded transition-all cursor-pointer"
                              title="Remove from queue"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inline dropzone for adding more files when queue is active */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/15"
                    : "border-slate-200 hover:border-indigo-400/60 bg-slate-50/30"
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600">Drag/Drop more files (Images, PDF, Word) or click to add</span>
                </div>
              </div>

              {/* Sample docs loader button to inject more samples */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Try pre-loaded samples:</span>
                <div className="flex gap-1.5">
                  {SAMPLE_DOCS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadSampleDoc(sample)}
                      className="text-[10px] bg-indigo-50/60 hover:bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold border border-indigo-100/60 cursor-pointer"
                    >
                      {idx === 0 ? "Amharic Rec" : "Somali Announce"}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Detailed Document Inspection Column */}
        <div className="lg:col-span-7 space-y-4">
          {!activeItem ? (
            /* BLANK STATE */
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
              <div className="bg-slate-50 p-4 rounded-full border border-slate-100 text-slate-350">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No Document Selected</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-normal">
                Drag and drop your document images onto the left column or choose a sample to start the character coordinates alignment scan.
              </p>
            </div>
          ) : (
            /* ACTIVE ITEM INSPECTION CONTAINER */
            <div className="space-y-4 animate-fade-in">
              
              {/* Active Document Metadata Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Currently Inspecting</span>
                  <h3 className="text-sm font-bold text-slate-800 truncate" title={activeItem.name}>
                    {activeItem.name}
                  </h3>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                    activeItem.status === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : activeItem.status === "processing"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse"
                      : activeItem.status === "error"
                      ? "bg-rose-50 text-rose-700 border-rose-100"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {activeItem.status}
                  </span>
                </div>
              </div>

              {/* Idle state configuration for selected item */}
              {activeItem.status === "idle" && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex flex-col items-center text-center space-y-3 py-4">
                    <div className="relative w-full max-w-sm aspect-[4/3] bg-slate-950/[0.02] border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center group/preview shadow-inner">
                      {activeItem.docType === "pdf" ? (
                        <div className="text-center p-6 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3 shadow-xs">
                            <FileText className="w-8 h-8" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 block mb-0.5 truncate max-w-xs">{activeItem.name}</span>
                          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block mb-1">Adobe PDF Document</span>
                          <span className="text-[10px] text-slate-400 block">{activeItem.fileSize || "PDF"} • Multimodal OCR Ready</span>
                        </div>
                      ) : activeItem.docType === "word" ? (
                        <div className="text-center p-6 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                            <FileText className="w-8 h-8" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 block mb-0.5 truncate max-w-xs">{activeItem.name}</span>
                          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block mb-1">Microsoft Word Document</span>
                          <span className="text-[10px] text-slate-400 block">{activeItem.fileSize || "Word"} • Text Parsing & Translation Ready</span>
                        </div>
                      ) : activeItem.image ? (
                        activeItem.image === "sample" ? (
                          <div className="text-center p-4">
                            <ImageIcon className="w-12 h-12 text-indigo-400/50 mx-auto mb-2 animate-pulse" />
                            <span className="text-xs font-bold text-indigo-700 block">Pre-loaded Template Scan</span>
                            <span className="text-[10px] text-slate-400">Ready for processing</span>
                          </div>
                        ) : (
                          <img
                            src={activeItem.image}
                            alt="preview"
                            style={{
                              transform: `rotate(${rotation}deg) scale(${zoom})`,
                              transition: "transform 0.2s ease-in-out"
                            }}
                            className="max-h-full max-w-full object-contain p-3 origin-center"
                            referrerPolicy="no-referrer"
                          />
                        )
                      ) : (
                        <ImageIcon className="w-12 h-12 text-slate-300 animate-pulse" />
                      )}

                      {/* Floating Image Control Bar */}
                      {activeItem.docType !== "pdf" && activeItem.docType !== "word" && activeItem.image && activeItem.image !== "sample" && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-3 shadow-lg transition-all z-10">
                          <button
                            type="button"
                            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Zoom Out (-25%)"
                          >
                            <ZoomOut className="w-4 h-4" />
                          </button>
                          
                          <span className="text-[10px] text-slate-300 font-mono min-w-[32px] text-center font-bold">
                            {Math.round(zoom * 100)}%
                          </span>

                          <button
                            type="button"
                            onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Zoom In (+25%)"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>

                          <div className="w-[1px] h-4 bg-slate-800" />

                          <button
                            type="button"
                            onClick={() => setRotation(prev => (prev - 90) % 360)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Rotate Left (-90°)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setRotation(prev => (prev + 90) % 360)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Rotate Right (+90°)"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>

                          <div className="w-[1px] h-4 bg-slate-800" />

                          <button
                            type="button"
                            onClick={() => { setZoom(1); setRotation(0); }}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 px-2 py-0.5 hover:bg-slate-800 rounded cursor-pointer transition-colors"
                            title="Reset Adjustments"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm">
                      This document is ready in the queue. You can configure individual target translation settings for it below before running the scan.
                    </p>
                  </div>

                  {/* Individual Config selectors */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Language</label>
                      <select
                        value={activeItem.targetLang}
                        onChange={(e) => updateItemState(activeItem.id, { targetLang: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none"
                      >
                        <option value="Somali">Somali (Soomaali)</option>
                        <option value="Amharic">Amharic (አማርኛ)</option>
                        <option value="English">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Context Type</label>
                      <select
                        value={activeItem.contextType}
                        onChange={(e) => updateItemState(activeItem.id, { contextType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none"
                      >
                        <option value="administrative">Administrative</option>
                        <option value="legal">Legal & Deeds</option>
                        <option value="medical">Medical / Health</option>
                        <option value="commercial">Commercial / Receipts</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => processSingleItem(activeItem.id)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run Scan & Translate on This File</span>
                  </button>
                </div>
              )}

              {/* Processing scanning screen */}
              {activeItem.status === "processing" && (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                  <div className="relative w-28 h-28 border border-slate-200 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                    {activeItem.docType === "pdf" ? (
                      <div className="bg-rose-50 w-full h-full flex flex-col items-center justify-center p-2 text-rose-600">
                        <FileText className="w-10 h-10" />
                        <span className="text-[9px] font-extrabold uppercase mt-1">PDF DOC</span>
                      </div>
                    ) : activeItem.docType === "word" ? (
                      <div className="bg-blue-50 w-full h-full flex flex-col items-center justify-center p-2 text-blue-600">
                        <FileText className="w-10 h-10" />
                        <span className="text-[9px] font-extrabold uppercase mt-1">WORD DOC</span>
                      </div>
                    ) : activeItem.image && activeItem.image !== "sample" ? (
                      <img
                        src={activeItem.image}
                        alt="processing"
                        className="w-full h-full object-cover opacity-60"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-indigo-200" />
                    )}
                    {/* Laser Scanner animation effect */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500 animate-pulse" />
                  </div>
                  
                  <div className="space-y-1.5 max-w-sm">
                    <p className="text-xs font-bold text-slate-700">Gemini Character Alignment Active</p>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Mapping layout coordinate blocks, analyzing dialectic nuances, and formulating side-by-side linguistic matching.
                    </p>
                  </div>

                  {/* Progress message and bar */}
                  <div className="w-full max-w-xs space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>{activeItem.progressMessage}</span>
                      <span>{activeItem.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${activeItem.progress}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Failure Error Screen */}
              {activeItem.status === "error" && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="p-4 bg-rose-50 text-rose-800 border border-rose-105 rounded-xl flex gap-3 text-xs">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                    <div>
                      <p className="font-bold">Multimodal OCR Processing Error</p>
                      <p className="mt-1 leading-relaxed text-rose-700/90">{activeItem.error || "An error occurred while analyzing the document image. Please ensure the crop is clear and high resolution."}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Language</label>
                      <select
                        value={activeItem.targetLang}
                        onChange={(e) => updateItemState(activeItem.id, { targetLang: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-slate-700 font-semibold focus:outline-none"
                      >
                        <option value="Somali">Somali (Soomaali)</option>
                        <option value="Amharic">Amharic (አማርኛ)</option>
                        <option value="English">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Context Type</label>
                      <select
                        value={activeItem.contextType}
                        onChange={(e) => updateItemState(activeItem.id, { contextType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold focus:outline-none"
                      >
                        <option value="administrative">Administrative</option>
                        <option value="legal">Legal & Deeds</option>
                        <option value="medical">Medical / Health</option>
                        <option value="commercial">Commercial / Receipts</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => processSingleItem(activeItem.id)}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Scanning Document</span>
                  </button>
                </div>
              )}

              {/* SUCCESS RESULTS DISPLAY */}
              {activeItem.status === "success" && activeItem.result && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Results Overview Metrics */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 border-r border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Script Detected</span>
                      <span className="text-xs font-bold text-slate-700">{activeItem.result.scriptDetected}</span>
                    </div>
                    <div className="p-2 border-r border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Clarity Score</span>
                      <span className="text-xs font-bold text-indigo-700 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                        {activeItem.result.clarityScore}%
                      </span>
                    </div>
                    <div className="p-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-0.5">Aligned Segments</span>
                      <span className="text-xs font-bold text-slate-700">{activeItem.result.layoutBlocks?.length || 0} Blocks</span>
                    </div>
                  </div>

                  {/* Document Actions Bar */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pl-1">
                      <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
                      Linguistic Core Export Actions
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => exportOcrToPdf(activeItem)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-xs cursor-pointer"
                        title="Download OCR and Translation as PDF"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Download PDF Report</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeItem.result?.translatedText || "", "full-translation")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
                          copiedId === "full-translation"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                        }`}
                        title="Copy complete translated text to clipboard"
                      >
                        {copiedId === "full-translation" ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Copied Entire Translation!</span>
                          </>
                        ) : (
                          <>
                            <Clipboard className="w-4 h-4 text-slate-400" />
                            <span>Copy Entire Translation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Document Image Crop Preview (Expandable) */}
                  {activeItem.image && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Visual Source</span>
                      <div className="relative w-full max-w-sm mx-auto aspect-[4/3] max-h-[220px] bg-slate-950/[0.02] rounded-xl border border-slate-150 overflow-hidden flex items-center justify-center group/preview-success">
                        {activeItem.docType === "pdf" ? (
                          <div className="py-4 text-center px-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                              <FileText className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">{activeItem.name}</span>
                            <span className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider block">Adobe PDF Document • OCR Analyzed</span>
                          </div>
                        ) : activeItem.docType === "word" ? (
                          <div className="py-4 text-center px-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                              <FileText className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">{activeItem.name}</span>
                            <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">Word Document (.docx / .doc) • Analyzed</span>
                          </div>
                        ) : activeItem.image === "sample" ? (
                          <div className="py-4 text-center">
                            <ImageIcon className="w-10 h-10 text-indigo-400/50 mx-auto mb-1 animate-pulse" />
                            <span className="text-[10px] font-bold text-indigo-700 block">Pre-loaded Template Scans</span>
                            <span className="text-[9px] text-slate-400">Scan alignments completed</span>
                          </div>
                        ) : (
                          <img
                            src={activeItem.image}
                            alt="document crop preview"
                            style={{
                              transform: `rotate(${rotation}deg) scale(${zoom})`,
                              transition: "transform 0.2s ease-in-out"
                            }}
                            className="max-h-full max-w-full object-contain p-2 origin-center"
                            referrerPolicy="no-referrer"
                          />
                        )}

                        {/* Floating Image Control Bar */}
                        {activeItem.docType !== "pdf" && activeItem.docType !== "word" && activeItem.image && activeItem.image !== "sample" && (
                          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/50 flex items-center gap-2.5 shadow-md z-10">
                            <button
                              type="button"
                              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Zoom Out (-25%)"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            
                            <span className="text-[9px] text-slate-300 font-mono min-w-[28px] text-center font-bold">
                              {Math.round(zoom * 100)}%
                            </span>

                            <button
                              type="button"
                              onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Zoom In (+25%)"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-[1px] h-3.5 bg-slate-800" />

                            <button
                              type="button"
                              onClick={() => setRotation(prev => (prev - 90) % 360)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Rotate Left (-90°)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setRotation(prev => (prev + 90) % 360)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Rotate Right (+90°)"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-[1px] h-3.5 bg-slate-800" />

                            <button
                              type="button"
                              onClick={() => { setZoom(1); setRotation(0); }}
                              className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 hover:bg-slate-800 rounded cursor-pointer transition-colors"
                              title="Reset Adjustments"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Full Text Side-by-Side Outputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Full Text */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
                      <div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Transcription (Original)</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeItem.result?.originalTranscription || "", "full-orig")}
                            className={`p-1.5 rounded transition-all flex items-center gap-1 cursor-pointer ${
                              copiedId === "full-orig"
                                ? "bg-emerald-50 text-emerald-600 font-bold text-[10px]"
                                : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            }`}
                            title="Copy Original Transcription"
                          >
                            {copiedId === "full-orig" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <Clipboard className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-serif whitespace-pre-wrap select-all">
                          {activeItem.result.originalTranscription}
                        </p>
                      </div>
                    </div>

                    {/* Translated Full Text */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[160px]">
                      <div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                            <span>Full Translated Document ({activeItem.targetLang})</span>
                            <span className="text-[9px] lowercase normal-case bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full font-medium">
                              Hover highlighted terms for details
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(activeItem.result?.translatedText || "", "full-trans")}
                            className={`p-1.5 rounded transition-all flex items-center gap-1 cursor-pointer ${
                              copiedId === "full-trans"
                                ? "bg-emerald-50 text-emerald-600 font-bold text-[10px]"
                                : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            }`}
                            title="Copy Full Translated Document"
                          >
                            {copiedId === "full-trans" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <Clipboard className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap select-all">
                          {highlightAdministrativeTerms(activeItem.result.translatedText)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segment-by-segment visual mapper */}
                  {activeItem.result.layoutBlocks && activeItem.result.layoutBlocks.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                      <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                        <LayoutGrid className="w-4 h-4 text-indigo-600" />
                        Interactive Block Alignment
                      </span>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {activeItem.result.layoutBlocks.map((block, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-lg border border-slate-100 transition-all text-xs animate-fade-in"
                          >
                            {/* Original Source Column */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-semibold text-slate-400 block uppercase">Original Transcription:</span>
                              <p className="text-slate-700 leading-relaxed font-serif text-sm">{block.original}</p>
                            </div>

                            {/* Translated Target Column */}
                            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200/50 pt-2.5 md:pt-0 md:pl-3 flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] font-semibold text-indigo-600 block uppercase">Translated Segment ({activeItem.targetLang}):</span>
                                <div className="text-slate-800 font-medium leading-relaxed">{highlightAdministrativeTerms(block.translated)}</div>
                              </div>

                              <div className="flex justify-end gap-2 mt-2 pt-1.5">
                                <button
                                  onClick={() => playOcrTts(block.translated, idx)}
                                  disabled={playingTts === idx}
                                  className="text-[10px] text-indigo-700 hover:text-indigo-800 flex items-center gap-0.5 disabled:text-slate-400 font-semibold cursor-pointer"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  {playingTts === idx ? "Listening..." : "Speak"}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(block.translated, "block-" + idx)}
                                  className={`text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                                    copiedId === "block-" + idx
                                      ? "text-emerald-600"
                                      : "text-slate-400 hover:text-slate-600"
                                  }`}
                                >
                                  {copiedId === "block-" + idx ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <span>Copy</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Regional nuances remarks */}
                  {activeItem.result.regionalNuances && (
                    <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-indigo-800 uppercase block tracking-wider text-[10px]">OCR & Dialect Notes:</span>
                      <p className="leading-relaxed">{activeItem.result.regionalNuances}</p>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
