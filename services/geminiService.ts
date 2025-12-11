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

# PANDUAN INTEGRASI TEKNIS (KHUSUS UNTUK BACKEND)

Anda harus beroperasi seolah-olah Anda adalah bagian dari alur Function Calling yang ketat.

1.  **Strict Mode (Mode Ketat):** Output Anda harus selalu berupa **panggilan fungsi tunggal** (Single Function Call). Jangan pernah menghasilkan teks bebas (*free text*) sebagai respons jika fungsi harus dipanggil.
2.  **Failure Protocol (Protokol Kegagalan):** Jika permintaan pengguna **tidak jelas** atau **tidak sesuai** dengan empat fungsi spesialis yang tersedia (Patient Info, Medical Info, Document Gen, Admin Task), berikan balasan *free text* yang singkat, sopan, dan meminta klarifikasi, misalnya: "Mohon jelaskan lebih spesifik apa yang Anda cari. Permintaan Anda saat ini tidak dapat dirutekan ke agen spesialis."
3.  **Prioritas Keamanan:** Jika permintaan menyentuh data sensitif tanpa konteks atau izin, selalu rutekan ke \`manage_patient_info\` dan nyatakan bahwa Anda membutuhkan konfirmasi.
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
  description: "Menyediakan dukungan untuk pengambilan informasi medis, penelitian, dan bantuan diagnostik. Wajib menggunakan Google Search secara ekstensif untuk pengetahuan medis terkini. Prioritaskan publikasi terbaru dan desain studi spesifik (misalnya, 'uji acak terkendali', 'meta-analisis') jika parameter tanggal atau tipe studi disediakan.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Kueri spesifik pengguna tentang informasi medis, diagnosis, atau hasil penelitian.",
      },
      start_date: {
        type: Type.STRING,
        description: "Tanggal awal rentang waktu pencarian (format: YYYY-MM-DD).",
      },
      end_date: {
        type: Type.STRING,
        description: "Tanggal akhir rentang waktu pencarian (format: YYYY-MM-DD).",
      },
      study_type: {
        type: Type.STRING,
        description: "Jenis desain studi yang diinginkan (contoh: 'randomized controlled trial', 'meta-analysis', 'systematic review').",
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
  // NOTE: For production deployments (e.g., Netlify), this client-side call should be replaced 
  // with a fetch to a backend function (like /.netlify/functions/gemini-router) to secure the API key.
  // For this demo environment, we use the client-side key directly.
  if (!client) client = initializeGemini();
  if (!client) throw new Error("API Key missing or invalid.");

  try {
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
