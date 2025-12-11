import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { AgentType } from "../types";

// --- 1. System Instruction ---
const SYSTEM_INSTRUCTION = `
# PERAN DAN INSTRUKSI KOORDINATOR SISTEM RUMAH SAKIT

Anda adalah KOORDINATOR SISTEM RUMAH SAKIT. Peran utama Anda adalah menganalisis setiap input pengguna, menentukan niat (*intent*) pengguna, dan secara cerdas merutekannya ke sub-agen spesialis yang paling tepat melalui pemanggilan fungsi (Function Calling).

Anda tidak boleh menjawab pertanyaan sendiri. Tugas Anda HANYA melakukan perutean.

**ATURAN PERUTEAN KETAT (Prioritas Teratas):**

1.  **Jika niat pengguna terkait detail pasien, janji temu, pendaftaran, atau informasi biaya (*billing*):**
    * **Panggil Fungsi:** \`manage_patient_info\`
2.  **Jika niat pengguna terkait diagnosis, dukungan klinis, atau penelitian medis:**
    * **Panggil Fungsi:** \`assist_medical_info\`
3.  **Jika niat pengguna adalah membuat dokumen, laporan, formulir administratif/keuangan, atau ringkasan pasien:**
    * **Panggil Fungsi:** \`generate_document\`
4.  **Jika niat pengguna adalah pertanyaan umum administrasi, kebijakan operasional, atau mencari data inventaris non-klinis:**
    * **Panggil Fungsi:** \`handle_admin_task\`

**KELUARAN WAJIB:**
Pastikan keputusan perutean tunggal, akurat, dan langsung mengarah pada pemanggilan fungsi yang dipilih.
`;

// --- 2. Tool Definitions ---

const managePatientInfoTool: FunctionDeclaration = {
  name: AgentType.PATIENT,
  description: "Mengelola pertanyaan terkait pasien, janji temu, dan proses pendaftaran. Dilarang keras menggunakan Google Search untuk data pasien sensitif (PHI/PII), tetapi diizinkan untuk informasi kesehatan umum.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Permintaan lengkap pengguna terkait janji temu, pendaftaran, atau detail pasien.",
      },
    },
    required: ["query"],
  },
};

const assistMedicalInfoTool: FunctionDeclaration = {
  name: AgentType.MEDICAL,
  description: "Menyediakan dukungan untuk pengambilan informasi medis, penelitian, dan bantuan diagnostik. Wajib menggunakan Google Search secara ekstensif untuk pengetahuan medis terkini.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Kueri spesifik pengguna tentang informasi medis, diagnosis, atau hasil penelitian.",
      },
    },
    required: ["query"],
  },
};

const generateDocumentTool: FunctionDeclaration = {
  name: AgentType.DOCUMENT,
  description: "Membuat dan memformat dokumen terstruktur seperti ringkasan pasien, laporan internal, atau formulir dalam format yang diminta (simulasi PDF/DOCX).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      document_type: {
        type: Type.STRING,
        description: "Jenis dokumen yang akan dibuat (cth: 'DischargeSummary', 'ConsentForm', 'InternalReport').",
      },
      content_details: {
        type: Type.STRING,
        description: "Isi utama atau data yang diperlukan untuk pembuatan dokumen.",
      },
    },
    required: ["document_type", "content_details"],
  },
};

const handleAdminTaskTool: FunctionDeclaration = {
  name: AgentType.ADMIN,
  description: "Membantu dengan pertanyaan administrasi umum, kebijakan operasional, dan pencarian prosedur rumah sakit.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Pertanyaan pengguna terkait administrasi, kebijakan, atau prosedur non-klinis.",
      },
    },
    required: ["query"],
  },
};

const tools: Tool[] = [
  {
    functionDeclarations: [
      managePatientInfoTool,
      assistMedicalInfoTool,
      generateDocumentTool,
      handleAdminTaskTool,
    ],
  },
];

// --- 3. Service Logic ---

let client: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return client;
};

export interface GeminiResponse {
  text?: string;
  functionCalls?: Array<{ name: string; args: any; id?: string }>;
}

export const sendMessageToCoordinator = async (message: string): Promise<GeminiResponse> => {
  if (!client) client = initializeGemini();
  if (!client) throw new Error("API Key missing or invalid.");

  try {
    // We use generateContent with the full context each time for this stateless demo,
    // or we could use chat. For routing, a single turn usually suffices if we pass the system instruction.
    // However, keeping context is better. For this specific 'Router' task, single shot is often safer to force routing behavior.
    
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: tools,
        temperature: 0, // Low temperature for deterministic routing
      }
    });

    const response: GeminiResponse = {};

    // Check for function calls
    const candidates = result.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        const functionCalls = parts.filter(p => p.functionCall).map(p => ({
            name: p.functionCall!.name,
            args: p.functionCall!.args,
            id: 'call_' + Math.random().toString(36).substr(2, 9)
        }));

        const textParts = parts.filter(p => p.text).map(p => p.text).join(' ');

        if (functionCalls.length > 0) {
            response.functionCalls = functionCalls;
        }
        if (textParts) {
            response.text = textParts;
        }
    }

    return response;

  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    throw error;
  }
};