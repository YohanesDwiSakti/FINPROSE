import { SYSTEM_PROMPT } from '../ai/prompts/systemPrompt';

export function buildSystemPrompt(lawyerContext?: string): string {
  if (!lawyerContext) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\nDAFTAR LAWYER YANG TERSEDIA:\n${lawyerContext}`;
}

export function formatCaseAnalysisPrompt(caseDescription: string): string {
  return `Tolong lakukan analisis kasus hukum berikut:\n\n${caseDescription}`;
}
