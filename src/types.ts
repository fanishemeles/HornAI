export interface GlossaryTerm {
  id: string;
  termSomali: string;
  termAmharic: string;
  termEnglish: string;
  definition: string;
  category: string;
  example?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface RegionalTerminology {
  term: string;
  meaning: string;
  equivalent?: string;
}

export interface TranslationData {
  translatedText: string;
  pronunciation?: string;
  linguisticNotes?: string;
  regionalTerminologyUsed?: RegionalTerminology[];
  qualityAssessment?: {
    accuracyScore: number;
    naturalnessScore: number;
    clarityScore: number;
    critique?: string;
  };
  alternatives?: {
    tone: string;
    text: string;
    description: string;
  }[];
  sentenceAlignments?: {
    source: string;
    target: string;
    explanation?: string;
  }[];
}

export interface LayoutBlock {
  original: string;
  translated: string;
}

export interface OcrData {
  scriptDetected: string;
  originalTranscription: string;
  translatedText: string;
  layoutBlocks: LayoutBlock[];
  clarityScore: string | number;
  regionalNuances?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  sourceLang: string;
  targetLang: string;
  contextType: string;
  sourceText: string;
  translationResult: TranslationData;
}

export interface UserPreferences {
  preferredSourceLang?: string;
  preferredTargetLang?: string;
  preferredTone?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
  role: "user" | "admin" | "guest";
  savedTranslations?: string[];
  preferences?: UserPreferences;
}


