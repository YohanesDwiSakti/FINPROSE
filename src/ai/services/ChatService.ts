import { SYSTEM_PROMPT } from '../prompts/systemPrompt';
import { askGemini } from '../../services/geminiService';
import { analyzeBase64Attachment } from './FileAnalyzer';
import { buildMemoryPrompt, loadConversationMemory, persistConversationTurn } from './MemoryService';
import { formatRetrievedContext, retrieveLegalContext } from './RetrievalService';
import { recommendLawyers } from './RecommendationService';

export type RusdiChatInput = {
  userId: string;
  conversationId: string;
  message: string;
  attachment?: { base64: string; mimeType: string; name: string };
};

export type RusdiChatResult = {
  reply: string;
  recommendations?: Awaited<ReturnType<typeof recommendLawyers>>;
  analysisSummary?: string;
};

export async function sendRusdiMessage(input: RusdiChatInput): Promise<RusdiChatResult> {
  const memory = await loadConversationMemory(input.conversationId);
  const retrieved = await retrieveLegalContext(input.message, 5);
  const recommendations = await recommendLawyers(input.message, 3);

  let attachmentSummary = '';
  if (input.attachment) {
    const analysis = await analyzeBase64Attachment({
      name: input.attachment.name,
      mimeType: input.attachment.mimeType,
      base64: input.attachment.base64,
      extraContext: input.message
    });
    attachmentSummary = `\n\nAnalisis Dokumen:\n${analysis.summary}\nIsu: ${analysis.legalIssues.join('; ')}\nKategori: ${analysis.suggestedCategories.join(', ')}`;
  }

  const prompt = `${SYSTEM_PROMPT}

Konteks Hukum (RAG):
${formatRetrievedContext(retrieved)}

Riwayat Percakapan:
${buildMemoryPrompt(memory)}

Rekomendasi Advokat Platform:
${recommendations.map(item => `- ${item.name} (${item.specialty})`).join('\n')}

Pertanyaan pengguna:
${input.message}${attachmentSummary}`;

  const reply = await askGemini(prompt, input.conversationId);

  await persistConversationTurn({
    userId: input.userId,
    conversationId: input.conversationId,
    userMessage: input.message,
    assistantMessage: reply,
    title: input.message.slice(0, 60)
  });

  return {
    reply,
    recommendations,
    analysisSummary: attachmentSummary || undefined
  };
}

export async function summarizeCase(caseDescription: string) {
  const retrieved = await retrieveLegalContext(caseDescription, 5);
  const prompt = `${SYSTEM_PROMPT}

Gunakan referensi berikut:
${formatRetrievedContext(retrieved)}

Buat analisis kasus terstruktur untuk:
${caseDescription}`;
  const conversationId = crypto.randomUUID();
  return askGemini(prompt, conversationId);
}
