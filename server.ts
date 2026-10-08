import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import mammoth from "mammoth";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, limit, writeBatch } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up large JSON body limit for image/document uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize GoogleGenAI client lazy/safely
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ----------------- STATIC GLOSSARY DATA -----------------
const REGIONAL_GLOSSARY = [
  {
    id: "g1",
    termSomali: "Woreda / Degmo",
    termAmharic: "ወረዳ (Woreda)",
    termEnglish: "District",
    definition: "The third-level administrative division of Ethiopia, managed by a local council. In the Somali Region, often referred to interchangeably as Woreda or Degmo.",
    category: "Administration",
    example: "Woreda of Jigjiga / ወረዳ ጅጅጋ"
  },
  {
    id: "g2",
    termSomali: "Kebele",
    termAmharic: "ቀበሌ (Kebele)",
    termEnglish: "Ward / Neighborhood",
    definition: "The smallest administrative unit in Ethiopia, similar to a ward, neighborhood, or localized peasant association.",
    category: "Administration",
    example: "Kebele 04 administration"
  },
  {
    id: "g3",
    termSomali: "Xafiiska",
    termAmharic: "ቢሮ (Biro)",
    termEnglish: "Regional Bureau / Office",
    definition: "An executive office or ministry-level department of the regional government (e.g., Bureau of Health, Education).",
    category: "Government",
    example: "Xafiiska Waxbarashada Deegaanka Soomaalida (Somali Region Education Bureau)"
  },
  {
    id: "g4",
    termSomali: "Guurti",
    termAmharic: "ጉርቲ (Traditional Elder Council)",
    termEnglish: "Traditional Council of Elders",
    definition: "A highly influential clan-based system of elders responsible for local conflict resolution, customary law (Xeer), and peace-building in the Somali Region.",
    category: "Customary Law",
    example: "Guurtida gobolka ayaa dhex-dhexaadin samaysay (The regional elders mediated the dispute)."
  },
  {
    id: "g5",
    termSomali: "Xeer",
    termAmharic: "ሕግ (Customary Law)",
    termEnglish: "Customary Somali Law",
    definition: "The polycentric customary legal system of Somalia and the Somali Region, governing relationships, blood compensation (Diya/Mag), and resource management.",
    category: "Customary Law",
    example: "Dhaqanka Xeerka Soomaalida (Somali Customary Law tradition)"
  },
  {
    id: "g6",
    termSomali: "Bajaj",
    termAmharic: "ባጃጅ (Bajaj)",
    termEnglish: "Auto-rickshaw / Three-wheeler",
    definition: "The most common form of urban passenger transport in cities like Jigjiga, Dire Dawa, and Harar.",
    category: "Local Life",
    example: "Bajaj raac si aad suuqa u tagto (Take a Bajaj to go to the market)"
  },
  {
    id: "g7",
    termSomali: "Qaad / Khat",
    termAmharic: "ጫት (Chat)",
    termEnglish: "Khat / Qat Leaf",
    definition: "A stimulant leaf widely cultivated and consumed in Eastern Ethiopia and the Somali Region, playing a central role in daily social interactions, markets, and regional economy.",
    category: "Local Life",
    example: "Khat market in Babile"
  },
  {
    id: "g8",
    termSomali: "Deegaanka Soomaalida",
    termAmharic: "የሶማሊ ክልል (Somali Region)",
    termEnglish: "Somali Regional State",
    definition: "The official designation of the Somali Region of Ethiopia, established under the federal constitution, with Jigjiga as its capital.",
    category: "Administration",
    example: "Dawladda Deegaanka Soomaalida (Somali Regional State Government)"
  },
  {
    id: "g9",
    termSomali: "Shura",
    termAmharic: "ምክክር (Consultation)",
    termEnglish: "Consultative Council",
    definition: "An Arabic-derived term used locally to denote administrative or Islamic-based consultative assemblies discussing community affairs.",
    category: "Customary Law",
    example: "Gole Shura"
  },
  {
    id: "g10",
    termSomali: "Xawaalad",
    termAmharic: "ሐዋላ (Hawala)",
    termEnglish: "Money Transfer / Remittance",
    definition: "An informal or formal money transfer system widely used in the Somali Region to receive funds from the diaspora or other cities.",
    category: "Banking & Finance",
    example: "Xawaalad ayaan ka soo saaray biilka (I withdrew my allowance from the remittance office)."
  },
  {
    id: "g11",
    termSomali: "Ribada / Dulsaar",
    termAmharic: "ወለድ (Weled)",
    termEnglish: "Interest / Usury",
    definition: "Financial interest on loans or savings. In the Somali Region, Islamic finance concepts (interest-free banking) are highly preferred due to religious practices.",
    category: "Banking & Finance",
    example: "Bangiyada deegaanka badankood waxay bixiyaan adeegyo ribo-la'aan ah (Most regional banks offer interest-free services)."
  },
  {
    id: "g12",
    termSomali: "Mudarabah / Murabahah",
    termAmharic: "ከወለድ ነፃ ባንኪንግ (Interest-Free Banking)",
    termEnglish: "Islamic Finance Partnership / Markup Sale",
    definition: "Sharia-compliant financing contracts widely used by Shabelle Bank and other financial institutions in Jigjiga instead of conventional interest-bearing loans.",
    category: "Banking & Finance",
    example: "Heshiis Murabahah ah oo aan baanka la galnay (A Murabahah agreement we made with the bank)."
  },
  {
    id: "g13",
    termSomali: "Kala-sarifka Lacagaha",
    termAmharic: "የውጭ ምንዛሬ (Yewuch Minzare)",
    termEnglish: "Currency Exchange",
    definition: "The exchange of foreign currencies, especially US Dollars, Euro, or Djibouti Francs to Ethiopian Birr. Highly active in border trade hubs like Togochale.",
    category: "Banking & Finance",
    example: "Suuqa kala-sarifka lacagaha ee Togochale (The currency exchange market of Togochale)."
  },
  {
    id: "g14",
    termSomali: "Koonto / Xisaab Baanki",
    termAmharic: "የባንክ ሂሳብ (Bank Account)",
    termEnglish: "Bank Account",
    definition: "A standard bank account registry maintained at a commercial bank or regional microfinance institution (such as Shabelle Bank or Commercial Bank of Ethiopia).",
    category: "Banking & Finance",
    example: "Koonto cusub ayaan ka furtay baanka (I opened a new account at the bank)."
  }
];

// Memory-based user added glossary items (fallback only)
let userGlossaryFallback: any[] = [];

// Initialize Firestore DB
let db: any = null;

function getFirestoreDb() {
  if (!db) {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        const app = getApps().length === 0 ? initializeApp(config) : getApp();
        db = getFirestore(app, config.firestoreDatabaseId || "(default)");
        console.log("Firebase Web SDK successfully initialized in server with database ID:", config.firestoreDatabaseId || "(default)");
      } else {
        console.warn("WARNING: firebase-applet-config.json not found. Firestore features will run with fallback storage.");
      }
    } catch (err) {
      console.error("Failed to initialize Firebase Web SDK in server:", err);
    }
  }
  return db;
}

// Helper to safely clean and parse JSON response from Gemini
function safeJsonParse(rawText: string): any {
  let cleaned = rawText.trim();
  
  // Remove markdown codeblock wrapper if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/gm, "");
    cleaned = cleaned.replace(/```$/gm, "");
  }
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (error: any) {
    // Attempt secondary recovery: find the first '{' and last '}'
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const subStr = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(subStr);
      } catch (innerError: any) {
        throw new Error("Invalid JSON structure returned from AI: " + innerError.message);
      }
    }
    throw error;
  }
}

// Find terms from glossary present in user text to ground translations
async function getMatchingGlossaryTerms(text: string): Promise<any[]> {
  if (!text) return [];
  const normalizedText = text.toLowerCase();
  
  let dbGlossary: any[] = [];
  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await getDocs(collection(firestore, "glossary"));
      dbGlossary = snapshot.docs.map((doc: any) => doc.data());
    }
  } catch (err) {
    console.error("Error reading glossary for grounding:", err);
  }

  const allTerms = [...REGIONAL_GLOSSARY, ...dbGlossary, ...userGlossaryFallback];
  const matched: any[] = [];

  for (const term of allTerms) {
    const isSomaliMatch = term.termSomali && normalizedText.includes(term.termSomali.toLowerCase().split("/")[0].trim());
    const isAmharicMatch = term.termAmharic && term.termAmharic !== "N/A" && normalizedText.includes(term.termAmharic.split("(")[0].trim());
    const isEnglishMatch = term.termEnglish && normalizedText.includes(term.termEnglish.toLowerCase().split("/")[0].trim());

    if (isSomaliMatch || isAmharicMatch || isEnglishMatch) {
      matched.push(term);
    }
  }
  return matched;
}

// ----------------- API ROUTES -----------------

// 1. Get Glossary
app.get("/api/glossary", async (req, res) => {
  try {
    const firestore = getFirestoreDb();
    let dbGlossary: any[] = [];
    if (firestore) {
      const snapshot = await getDocs(collection(firestore, "glossary"));
      dbGlossary = snapshot.docs.map((doc: any) => doc.data());
    } else {
      dbGlossary = userGlossaryFallback;
    }
    res.json({
      status: "success",
      data: [...REGIONAL_GLOSSARY, ...dbGlossary]
    });
  } catch (err: any) {
    console.error("Error getting glossary from Firestore:", err);
    res.json({
      status: "success",
      data: [...REGIONAL_GLOSSARY, ...userGlossaryFallback]
    });
  }
});

// 2. Add custom item to Glossary
app.post("/api/glossary/add", async (req, res) => {
  const { termSomali, termAmharic, termEnglish, definition, category, example, createdBy } = req.body;
  if (!termSomali || !termEnglish || !definition) {
    return res.status(400).json({ error: "Somali term, English translation, and definition are required." });
  }

  const itemId = `user-${Date.now()}`;
  const newItem = {
    id: itemId,
    termSomali,
    termAmharic: termAmharic || "N/A",
    termEnglish,
    definition,
    category: category || "General",
    example: example || "",
    createdBy: createdBy || "anonymous",
    createdAt: new Date().toISOString()
  };

  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      await setDoc(doc(firestore, "glossary", itemId), newItem);
    } else {
      userGlossaryFallback.push(newItem);
    }
    res.json({
      status: "success",
      message: "Term added to regional glossary.",
      data: newItem
    });
  } catch (err: any) {
    console.error("Error saving glossary item to Firestore:", err);
    res.status(500).json({ error: "Failed to save term to database: " + err.message });
  }
});

// 2.5 Auth Sync and Users Management Routes
app.post("/api/users/sync", async (req, res) => {
  const { user } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: "User payload is required." });
  }

  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      const userRef = doc(firestore, "users", user.id);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        const newUser = {
          ...user,
          role: user.role || "user",
          createdAt: user.createdAt || new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        return res.json({ status: "success", user: newUser });
      } else {
        return res.json({ status: "success", user: userDoc.data() });
      }
    }
    res.json({ status: "success", user });
  } catch (err: any) {
    console.error("Error syncing user:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/update", async (req, res) => {
  const { userId, updates } = req.body;
  if (!userId || !updates) {
    return res.status(400).json({ error: "userId and updates are required." });
  }

  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      await updateDoc(doc(firestore, "users", userId), updates);
    }
    res.json({ status: "success" });
  } catch (err: any) {
    console.error("Error updating user preferences:", err);
    res.status(500).json({ error: err.message });
  }
});

// History Sync Routes
app.get("/api/history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      const q = query(
        collection(firestore, "users", userId, "history"),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const historyList = snapshot.docs.map((doc: any) => doc.data());
      return res.json({ status: "success", data: historyList });
    }
    res.json({ status: "success", data: [] });
  } catch (err: any) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/history/:userId/add", async (req, res) => {
  const { userId } = req.params;
  const { item } = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ error: "History item is required." });
  }

  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      await setDoc(doc(firestore, "users", userId, "history", item.id), item);
    }
    res.json({ status: "success" });
  } catch (err: any) {
    console.error("Error writing to history:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/history/:userId/:historyId", async (req, res) => {
  const { userId, historyId } = req.params;
  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      await deleteDoc(doc(firestore, "users", userId, "history", historyId));
    }
    res.json({ status: "success" });
  } catch (err: any) {
    console.error("Error deleting history item:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const firestore = getFirestoreDb();
    if (firestore) {
      const snapshot = await getDocs(collection(firestore, "users", userId, "history"));
      const batch = writeBatch(firestore);
      snapshot.docs.forEach((docSnap: any) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
    res.json({ status: "success" });
  } catch (err: any) {
    console.error("Error clearing user history:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Translate Text Route
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang, contextType, tone, refinementPrompt, previousTranslation } = req.body;

    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ error: "text, sourceLang, and targetLang are required." });
    }

    const ai = getAIClient();

    let promptContext = `Translate the input text from ${sourceLang} to ${targetLang}.`;
    if (refinementPrompt && previousTranslation) {
      promptContext = `You are refining an existing translation.
The original text is in ${sourceLang}: "${text}"
The previous translation in ${targetLang} is: "${previousTranslation}"
Your task is to REFINE this translation based on this feedback/instruction: "${refinementPrompt}"`;
    }

    // Ground translation with matching glossary definitions
    const matchedTerms = await getMatchingGlossaryTerms(text);
    let glossaryContext = "";
    if (matchedTerms.length > 0) {
      glossaryContext = `\nCRITICAL GLOSSARY REFERENCE: The input text contains terms from our localized administrative, cultural, and financial dictionary. You MUST translate these terms using the specific equivalents and definitions provided below:
` + matchedTerms.map(t => `- Somali: "${t.termSomali}", Amharic: "${t.termAmharic}", English: "${t.termEnglish}". Meaning: ${t.definition}`).join("\n");
    }

    // Construct prompt to guide Somali-Amharic-English translation with strict formatting
    const systemPrompt = `You are an elite, specialized linguistic translator and analyst expert in Amharic (Ethiopic script) and Somali (Latin script), as well as English.
You understand the regional nuances of the Somali Region of Ethiopia (often called the Ogaden or Deegaanka Soomaalida), including standard terminology vs local dialects (such as Maay Maay) and Ethiopian administrative units (Woreda, Kebele, Regional Bureau, etc.).

${promptContext}
${glossaryContext}

Context of use: ${contextType || "standard"}.
${contextType === "banking" ? "Use highly accurate banking, financial, transaction, and mobile money terms suitable for Eastern Africa and the Somali Region of Ethiopia (including Ethiopian Birr, Somali Shilling, EVC Plus, interest/riba, loans, transfers, savings, deposits)." : ""}
${contextType === "customs" ? "Use official customs duty, cross-border trade, tariff, taxation, import/export regulations, and transshipment terms used by border authorities and trading bureaus in the region (e.g., Tog Wajale border trade contexts, customs declarations/sheen, cargo manifest, tariffs, clearance, duties)." : ""}
Target output style/tone: ${tone || "standard"} (strictly adhere to standard/neutral, formal/respectful, casual/informal, or academic/literary based on this selected option).

Provide your response in raw JSON format matching this schema:
{
  "translatedText": "The actual translated text, maintaining formatting, paragraphs, and style where appropriate.",
  "pronunciation": "Phonetic pronunciation guide for the translated text (especially if translating to Amharic Ge'ez or Somali).",
  "linguisticNotes": "A concise paragraph explaining any unique structural aspects, morphologically rich components, script characteristics (Ethiopic/Latin), or potential dialect issues.",
  "regionalTerminologyUsed": [
    {
      "term": "Any specific administrative, cultural, or local term used or translated (e.g. Woreda, Kebele, Bajaj, Xafiiska, etc.)",
      "meaning": "What this term means in this specific regional context.",
      "equivalent": "The equivalent word in the other language."
    }
  ],
  "qualityAssessment": {
    "accuracyScore": 95,
    "naturalnessScore": 92,
    "clarityScore": 96,
    "critique": "A brief sentence explaining the translation's quality, nuances preserved, and lexical choices."
  },
  "alternatives": [
    {
      "tone": "Formal or Literary counterpart",
      "text": "Alternative translation text...",
      "description": "When to use this alternative."
    },
    {
      "tone": "Conversational or Everyday counterpart",
      "text": "Alternative translation text...",
      "description": "When to use this alternative."
    }
  ],
  "sentenceAlignments": [
    {
      "source": "A short fragment or sentence of the source text",
      "target": "The corresponding segment in the translated text",
      "explanation": "Brief grammatical alignment note."
    }
  ]
}

Ensure all scores are integers between 1 and 100. Make sure the alternatives use different tones/wordings from the primary translation. Provide exactly 2 or 3 sentences in sentenceAlignments for a paragraph.
DO NOT wrap your JSON in markdown code blocks. Return ONLY the raw valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: refinementPrompt ? `Refine the translation based on instruction: "${refinementPrompt}"` : `Translate this text: "${text}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: refinementPrompt ? 0.4 : 0.2
      }
    });

    const resultText = response.text || "{}";
    const data = safeJsonParse(resultText.trim());
    res.json({ status: "success", data });

  } catch (error: any) {
    console.error("Translation Error:", error);
    res.status(500).json({ error: error.message || "Failed to process translation." });
  }
});

// 4. Multimodal OCR & Document Translation Route (Images, PDFs, Word DOCX/DOC)
app.post("/api/ocr-translate", async (req, res) => {
  try {
    const { image, mimeType, targetLang, contextType, fileName } = req.body;

    if (!image || !mimeType || !targetLang) {
      return res.status(400).json({ error: "image/document data (base64 string), mimeType, and targetLang are required." });
    }

    // Extract the raw base64 string from data URL if needed
    let base64Data = image;
    if (image.includes("base64,")) {
      base64Data = image.split("base64,")[1];
    }

    const ai = getAIClient();
    const docName = fileName || "Document";

    // Determine document type
    const isWordDoc = 
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      mimeType.includes("word") ||
      (typeof fileName === "string" && (fileName.toLowerCase().endsWith(".docx") || fileName.toLowerCase().endsWith(".doc")));

    const isPdf = 
      mimeType === "application/pdf" ||
      (typeof fileName === "string" && fileName.toLowerCase().endsWith(".pdf"));

    if (isWordDoc) {
      // Extract text content from Word document using mammoth
      const buffer = Buffer.from(base64Data, "base64");
      let extractedDocText = "";

      try {
        const mammothResult = await mammoth.extractRawText({ buffer });
        extractedDocText = mammothResult.value ? mammothResult.value.trim() : "";
      } catch (docErr: any) {
        console.warn("Mammoth raw text extraction warning:", docErr);
      }

      // Fallback text extraction if mammoth failed or for legacy format
      if (!extractedDocText) {
        const rawString = buffer.toString("utf8");
        // Extract printable Unicode/ASCII blocks
        const cleaned = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ").replace(/\s+/g, " ").trim();
        if (cleaned.length > 20) {
          extractedDocText = cleaned;
        }
      }

      if (!extractedDocText) {
        return res.status(400).json({
          error: "Could not extract readable text from the uploaded Word file. Please verify the document contains text content or save as PDF."
        });
      }

      const wordPrompt = `You are a high-fidelity Document OCR, Parsing, and Translation System specialized in Ethiopic Script (Amharic) and Latin Script (Somali).
Analyze the extracted content of the Word document "${docName}".
1. Transcribe the entire text preserving paragraphs, structure, and administrative headers.
2. Translate the entire text into ${targetLang} (using ${contextType || "standard"} context).
3. Generate segment-by-segment comparisons matching original sentence/paragraph blocks to translated blocks.
4. Detect the dominant script and source language (Amharic Ge'ez vs Somali Latin).
5. Highlight administrative terms, legal terminology, or nuances.

Provide your response in raw JSON format matching this schema:
{
  "scriptDetected": "Ge'ez (Amharic) or Latin (Somali)",
  "originalTranscription": "The full exact text from the document, preserving paragraphs and formatting.",
  "translatedText": "The full translated text in ${targetLang}.",
  "layoutBlocks": [
    {
      "original": "A specific sentence or paragraph from the document",
      "translated": "The corresponding translation for that sentence or paragraph"
    }
  ],
  "clarityScore": 96,
  "regionalNuances": "Administrative terms, official designations, or regional terminology found in the document."
}

DO NOT wrap your JSON in markdown code blocks. Return ONLY the raw valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Document Name: ${docName}\nExtracted Document Content:\n\n${extractedDocText.substring(0, 40000)}\n\nPlease perform full linguistic transcription, translation to ${targetLang}, and segment alignment according to instructions.`
              }
            ]
          }
        ],
        config: {
          systemInstruction: wordPrompt,
          responseMimeType: "application/json",
          temperature: 0.15
        }
      });

      const resultText = response.text || "{}";
      const data = safeJsonParse(resultText.trim());
      return res.json({ status: "success", data });
    }

    // Handle PDF or Image files via Multimodal Gemini VLM
    const effectiveMimeType = isPdf ? "application/pdf" : mimeType;

    const systemPrompt = `You are a high-fidelity Document OCR and Translation System specialized in Ethiopic Script (Amharic) and Latin Script (Somali).
Analyze the provided ${isPdf ? "PDF document" : "document/image"}.
1. Perform high-accuracy OCR to extract ALL text, preserving line breaks, headings, and structural formatting. Amharic has 300+ similar characters, pay extremely close attention to subtle variations (e.g., ሀ vs ሃ, በ vs ቨ, ኀ vs ኃ). Somali uses Latin script, transcribe it accurately.
2. Translate the entire extracted text into ${targetLang} (using ${contextType || "standard"} context).
3. Extract segment-by-segment comparisons so the user can see original line/paragraph blocks mapped to translated line blocks.
4. Detect the dominant script and source language.

Provide your response in raw JSON format matching this schema:
{
  "scriptDetected": "Ge'ez (Amharic) or Latin (Somali)",
  "originalTranscription": "The full exact transcribed text from the document, preserving paragraphs and formatting.",
  "translatedText": "The full translated text.",
  "layoutBlocks": [
    {
      "original": "A specific sentence or line transcribed from the document",
      "translated": "The corresponding translation for that sentence or line"
    }
  ],
  "clarityScore": "A percentage (0-100) indicating the estimated legibility/clarity of the source document script.",
  "regionalNuances": "Any remarks on administrative terms, cultural items, or handwriting style found in the document."
}

DO NOT wrap your JSON in markdown code blocks. Return ONLY the raw valid JSON.`;

    const docPart = {
      inlineData: {
        mimeType: effectiveMimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: `Perform OCR transcription and translate the text to ${targetLang}. Identify all administrative terms and segment blocks accurately.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [docPart, textPart] },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.15
      }
    });

    const resultText = response.text || "{}";
    const data = safeJsonParse(resultText.trim());
    res.json({ status: "success", data });

  } catch (error: any) {
    console.error("OCR Translation Error:", error);
    res.status(500).json({ error: error.message || "Failed to perform OCR and translation." });
  }
});

// 5. Text-To-Speech (TTS) API
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;

    if (!text) {
      return res.status(400).json({ error: "text is required for TTS." });
    }

    const ai = getAIClient();

    // Use gemini-3.1-flash-tts-preview model to perform text-to-speech
    // Let's configure single speaker speech.
    const selectedVoice = voiceName || "Zephyr"; // Zephyr, Kore, Puck, Charon, Fenrir

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say clearly and eloquently: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: "No audio generated by the TTS model." });
    }

    res.json({
      status: "success",
      audio: base64Audio,
      mimeType: "audio/pcm;rate=24000",
      voiceUsed: selectedVoice
    });

  } catch (error: any) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech." });
  }
});

// 6. Suggest/Extract Glossary Terms from Text
app.post("/api/glossary/suggest", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for suggesting glossary terms." });
    }

    const ai = getAIClient();

    const systemPrompt = `You are a professional administrative and regional linguist expert in Eastern Ethiopia (Somali Region, Ogaden).
Given an input text (which might be in Somali, Amharic, or English), identify 1 to 3 distinct regional terms, administrative designations, customary law words, or financial/banking words related to the region (such as Woreda, Kebele, EVC, Bajaj, Hawala, etc.).
For each term found, generate:
1. Somali Term (transcribed or standard form)
2. Amharic equivalent (in Ge'ez script, or "N/A" if there is no common equivalent)
3. English translation equivalent
4. Precise definition in the regional context
5. Category (must be one of: "Administration", "Government", "Customary Law", "Local Life", "Banking & Finance", "General")
6. A realistic example sentence using the term

Provide your response in raw JSON format matching this schema:
{
  "suggestions": [
    {
      "termSomali": "Somali word",
      "termAmharic": "Amharic word or N/A",
      "termEnglish": "English word",
      "definition": "Precise definition",
      "category": "One of the allowed categories",
      "example": "Example usage"
    }
  ]
}

If no specific regional terms are found, return an empty list of suggestions.
DO NOT wrap your JSON in markdown code blocks. Return ONLY the raw valid JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Suggest glossary terms from this text: "${text}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const resultText = response.text || "{}";
    const data = safeJsonParse(resultText.trim());
    res.json({ status: "success", data: data.suggestions || [] });

  } catch (error: any) {
    console.error("Glossary Suggest Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate glossary suggestions." });
  }
});

// ----------------- VITE MIDDLEWARE SETUP -----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
