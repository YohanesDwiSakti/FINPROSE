export type FileAnalysisResult = {
  summary: string;
  legalIssues: string[];
  suggestedCategories: string[];
  suggestedSpecializations: string[];
  extractedText: string;
  confidence: number;
};

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Criminal Lawyer': ['pidana', 'penipuan', 'penganiayaan', 'polisi', 'tersangka'],
  'Civil Lawyer': ['kontrak', 'wanprestasi', 'ganti rugi', 'perdata', 'hutang'],
  'Family Lawyer': ['cerai', 'harta gono', 'anak', 'nikah', 'perceraian'],
  'Labor Lawyer': ['phk', 'pesangon', 'karyawan', 'upah', 'kerja'],
  'Tax Lawyer': ['pajak', 'restitusi', 'faktur', 'npwp', 'pph'],
  'Corporate Lawyer': ['pt', 'direksi', 'akta', 'korporasi', 'bisnis'],
  'Cyber Crime Lawyer': ['ite', 'pencemaran', 'akun', 'digital', 'phishing'],
  'Intellectual Property Lawyer': ['haki', 'merek', 'hak cipta', 'paten'],
  'Land Dispute Lawyer': ['tanah', 'sertifikat', 'sengketa lahan', 'properti'],
  'Immigration Lawyer': ['visa', 'itas', 'imigrasi', 'deportasi', 'wna']
};

export function validateUploadedFile(file: File, maxSizeMb = 20) {
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`Ukuran file maksimal ${maxSizeMb}MB.`);
  }
  if (!ALLOWED_MIME.has(file.type) && !file.name.match(/\.(pdf|docx|doc|png|jpg|jpeg|txt|xlsx|pptx)$/i)) {
    throw new Error('Format file tidak didukung. Gunakan PDF, DOCX, DOC, PNG, JPG, TXT, XLSX, atau PPTX.');
  }
}

async function readTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
    return file.text();
  }
  if (file.type.startsWith('image/')) {
    return `Dokumen gambar legal: ${file.name}. Berisi bukti visual/scan dokumen yang perlu ditinjau advokat.`;
  }
  return `Dokumen ${file.name} (${file.type || 'unknown'}) berisi materi hukum yang memerlukan review profesional.`;
}

function detectCategories(text: string) {
  const lower = text.toLowerCase();
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => lower.includes(keyword)))
    .map(([category]) => category);
}

export async function analyzeLegalFile(file: File, extraContext = ''): Promise<FileAnalysisResult> {
  validateUploadedFile(file);
  const extractedText = `${await readTextFromFile(file)}\n${extraContext}`.trim();
  const suggestedCategories = detectCategories(extractedText);
  const legalIssues = suggestedCategories.length
    ? suggestedCategories.map(category => `Isu teridentifikasi pada ranah ${category}.`)
    : ['Perlu klarifikasi lebih lanjut terhadap fakta dan dokumen pendukung.'];

  return {
    summary: `Rusdi mengidentifikasi dokumen "${file.name}" sebagai materi legal dengan fokus ${suggestedCategories[0] || 'konsultasi umum'}.`,
    legalIssues,
    suggestedCategories: suggestedCategories.length ? suggestedCategories : ['Civil Lawyer'],
    suggestedSpecializations: suggestedCategories.length ? suggestedCategories : ['Civil Lawyer'],
    extractedText,
    confidence: suggestedCategories.length ? 0.86 : 0.62
  };
}

export async function analyzeBase64Attachment(payload: {
  name: string;
  mimeType: string;
  base64: string;
  extraContext?: string;
}) {
  const blob = await fetch(`data:${payload.mimeType};base64,${payload.base64}`).then(res => res.blob());
  const file = new File([blob], payload.name, { type: payload.mimeType });
  return analyzeLegalFile(file, payload.extraContext || '');
}
