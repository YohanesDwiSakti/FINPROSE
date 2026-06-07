import { buildPlatformDataset } from '../../data/platformSeed';
import { KnowledgeChunk, searchSimilar, upsertChunks } from './VectorStore';

const LEGAL_KNOWLEDGE: KnowledgeChunk[] = [
  { id: 'kb-1', category: 'Civil Lawyer', content: 'Wanprestasi diatur dalam KUH Perdata Pasal 1238-1253. Pihak yang tidak memenuhi prestasi dapat diminta ganti rugi dan pelaksanaan kontrak.', source: 'knowledge_base' },
  { id: 'kb-2', category: 'Labor Lawyer', content: 'PHK sepihak wajib dibuktikan adanya pelanggaran berat atau urgent reason sesuai UU Ketenagakerjaan. Pesangon dihitung berdasarkan masa kerja.', source: 'knowledge_base' },
  { id: 'kb-3', category: 'Family Lawyer', content: 'Perceraian dapat diajukan melalui gugatan atau permohonan di Pengadilan Agama/Biasa tergantung status perkawinan dan kesepakatan pihak.', source: 'knowledge_base' },
  { id: 'kb-4', category: 'Criminal Lawyer', content: 'Dalam perkara pidana, hak tersangka meliputi hak didampingi penasihat hukum, hak diam, dan hak mendapat pemeriksaan yang adil.', source: 'knowledge_base' },
  { id: 'kb-5', category: 'Cyber Crime Lawyer', content: 'UU ITE mengatur pencemaran nama baik elektronik, akses ilegal, dan manipulasi data. Bukti digital perlu diautentikasi.', source: 'knowledge_base' },
  { id: 'kb-6', category: 'Tax Lawyer', content: 'Restitusi pajak dan keberatan pajak memerlukan bukti administrasi lengkap dan memperhatikan batas waktu permohonan.', source: 'knowledge_base' },
  { id: 'kb-7', category: 'Corporate Lawyer', content: 'Pendirian PT memerlukan akta notaris, SK Kemenkumham, NPWP, dan kepatuhan UUPT terkait organ perseroan.', source: 'knowledge_base' },
  { id: 'kb-8', category: 'Immigration Lawyer', content: 'ITAS/ITAP diajukan melalui sponsor dan harus memenuhi persyaratan visa sesuai tujuan tinggal di Indonesia.', source: 'knowledge_base' }
];

let initialized = false;

function ensureIndex() {
  if (initialized) return;
  const dataset = buildPlatformDataset();
  const lawyerChunks: KnowledgeChunk[] = dataset.lawyerRecords.slice(0, 40).map(lawyer => ({
    id: `lawyer-${lawyer.id}`,
    category: lawyer.specialty,
    content: `${lawyer.name} spesialis ${lawyer.specialty}. Pengalaman ${lawyer.experience} tahun. Biaya konsultasi Rp ${lawyer.price.toLocaleString('id-ID')}. ${lawyer.description}`,
    source: 'lawyer_profile'
  }));
  upsertChunks([...LEGAL_KNOWLEDGE, ...lawyerChunks]);
  initialized = true;
}

export async function retrieveLegalContext(query: string, limit = 5): Promise<KnowledgeChunk[]> {
  ensureIndex();
  const dataset = buildPlatformDataset();
  const documentChunks: KnowledgeChunk[] = dataset.files
    ?.filter(file => file.extractedText)
    .slice(0, 20)
    .map(file => ({
      id: file.id,
      category: file.entityType,
      content: file.extractedText || file.originalName,
      source: 'document_chunk' as const
    })) || [];

  return searchSimilar(query, [...LEGAL_KNOWLEDGE, ...documentChunks], limit);
}

export function formatRetrievedContext(chunks: KnowledgeChunk[]) {
  if (!chunks.length) return 'Tidak ada referensi hukum spesifik yang ditemukan.';
  return chunks
    .map((chunk, index) => `[Referensi ${index + 1} - ${chunk.category}]\n${chunk.content}`)
    .join('\n\n');
}

export async function searchKnowledgeBaseRemote(query: string, supabaseRest?: (method: string, path: string, body?: unknown) => Promise<any>) {
  if (!supabaseRest) return retrieveLegalContext(query);
  try {
    const rows = await supabaseRest('POST', 'rpc/search_knowledge', { search_query: query, max_results: 5 });
    if (Array.isArray(rows) && rows.length) {
      return rows.map((row: any, index: number) => ({
        id: row.id || `remote-${index}`,
        category: row.category || 'Hukum',
        content: row.content || '',
        source: 'knowledge_base' as const
      }));
    }
  } catch {
    // fallback local
  }
  return retrieveLegalContext(query);
}
