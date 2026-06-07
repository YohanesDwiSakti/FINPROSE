import { buildPlatformDataset } from '../../data/platformSeed';
import { retrieveLegalContext } from './RetrievalService';

export type LawyerRecommendationResult = {
  lawyerId: string;
  name: string;
  specialty: string;
  rating: number;
  price: number;
  image: string;
  reason: string;
  matchScore: number;
};

export async function recommendLawyers(problemDescription: string, limit = 5): Promise<LawyerRecommendationResult[]> {
  const dataset = buildPlatformDataset();
  const context = await retrieveLegalContext(problemDescription, 3);
  const keywords = `${problemDescription} ${context.map(item => item.category).join(' ')}`.toLowerCase();

  return dataset.lawyerRecords
    .map(lawyer => {
      let score = lawyer.rating * 12 + lawyer.experience * 2 + lawyer.successRate * 0.25;
      const specialtyLower = lawyer.specialty.toLowerCase();
      if (keywords.includes(specialtyLower)) score += 35;
      context.forEach((item) => {
        if (keywords.includes(item.category.toLowerCase()) && specialtyLower.includes(item.category.toLowerCase())) {
          score += 15;
        }
      });
      if (lawyer.languages.some(lang => keywords.includes(lang.toLowerCase()))) score += 5;
      if (lawyer.isOnline) score += 10;
      if (lawyer.reviewCount > 20) score += 4;
      return {
        lawyerId: lawyer.id,
        name: lawyer.name,
        specialty: lawyer.specialty,
        rating: lawyer.rating,
        price: lawyer.price,
        image: lawyer.image,
        reason: `Cocok untuk kasus ${lawyer.specialty.toLowerCase()} dengan pengalaman ${lawyer.experience} tahun dan success rate ${lawyer.successRate}%.`,
        matchScore: score
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export function formatRecommendationsForPrompt(items: LawyerRecommendationResult[]) {
  return items
    .map((item, index) => `${index + 1}. ${item.name} (${item.specialty}) - Rating ${item.rating} - Rp ${item.price.toLocaleString('id-ID')} - ${item.reason}`)
    .join('\n');
}
