import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Score, ScoreDocument, ScoreProvider } from './schemas/score.schema';
import {
  LlmResponse,
  LlmResponseDocument,
  LlmProvider,
} from '../analysis/schemas/llm-response.schema';

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

interface ProviderScoreData {
  visibilityScore: number;
  positionScore: number;
  sentimentScore: number;
  shareOfVoiceScore: number;
  overallScore: number;
  totalResponses: number;
  brandMentions: number;
  avgPosition: number | null;
  competitorScores: { name: string; mentions: number; shareOfVoice: number }[];
}

@Injectable()
export class ScoringService {
  constructor(
    @InjectModel(Score.name) private scoreModel: Model<ScoreDocument>,
    @InjectModel(LlmResponse.name)
    private llmResponseModel: Model<LlmResponseDocument>,
  ) {}

  async calculateScores(
    analysisRunId: string,
    brandId: string,
    userId: string,
    competitors: string[],
  ): Promise<void> {
    const providers = [
      LlmProvider.OPENAI,
      LlmProvider.PERPLEXITY,
      LlmProvider.GEMINI,
    ];

    const providerScoreData: ProviderScoreData[] = [];

    for (const provider of providers) {
      const data = await this.computeProviderScore(analysisRunId, provider);
      providerScoreData.push(data);

      await this.scoreModel.create({
        analysisRunId: new Types.ObjectId(analysisRunId),
        brandId: new Types.ObjectId(brandId),
        userId: new Types.ObjectId(userId),
        provider: provider as unknown as ScoreProvider,
        ...data,
      });
    }

    const combined = this.computeCombinedScore(providerScoreData, competitors);
    await this.scoreModel.create({
      analysisRunId: new Types.ObjectId(analysisRunId),
      brandId: new Types.ObjectId(brandId),
      userId: new Types.ObjectId(userId),
      provider: ScoreProvider.COMBINED,
      ...combined,
    });
  }

  private async computeProviderScore(
    analysisRunId: string,
    provider: LlmProvider,
  ): Promise<ProviderScoreData> {
    const responses = await this.llmResponseModel.find({
      analysisRunId: new Types.ObjectId(analysisRunId),
      provider,
      error: '',
    });

    const totalResponses = responses.length;
    if (totalResponses === 0) return this.zeroScore();

    const mentionedResponses = responses.filter((r) => r.brandMentioned);
    const brandMentions = mentionedResponses.length;

    // Position: average ordinal rank for responses where brand was mentioned
    const positions = mentionedResponses
      .map((r) => r.mentionPosition)
      .filter((p): p is number => p !== null);
    const avgPosition =
      positions.length > 0
        ? positions.reduce((a, b) => a + b, 0) / positions.length
        : null;

    // Sentiment: average sentiment where brand was mentioned
    const sentiments = mentionedResponses.map((r) => r.sentiment);
    const avgSentiment =
      sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;

    // Competitor mentions: count responses where each competitor was detected
    const competitorMentionMap: Record<string, number> = {};
    for (const response of responses) {
      for (const cm of response.competitorMentions) {
        if (cm.position !== null) {
          competitorMentionMap[cm.name] =
            (competitorMentionMap[cm.name] ?? 0) + 1;
        }
      }
    }
    const totalCompetitorMentions = Object.values(
      competitorMentionMap,
    ).reduce((a, b) => a + b, 0);
    const totalMentions = brandMentions + totalCompetitorMentions;

    // Scores
    const visibilityScore = round((brandMentions / totalResponses) * 100);
    // Position: position 1 = 100 pts, each step down = -15 pts, min 0
    const positionScore =
      avgPosition !== null
        ? round(Math.max(0, 100 - (avgPosition - 1) * 15))
        : 0;
    // Sentiment: convert -1..1 to 0..100
    const sentimentScore = round(((avgSentiment + 1) / 2) * 100);
    const shareOfVoiceScore =
      totalMentions > 0
        ? round((brandMentions / totalMentions) * 100)
        : 0;
    const overallScore = round(
      visibilityScore * 0.4 +
        positionScore * 0.3 +
        sentimentScore * 0.2 +
        shareOfVoiceScore * 0.1,
    );

    const competitorScores = Object.entries(competitorMentionMap).map(
      ([name, mentions]) => ({
        name,
        mentions,
        shareOfVoice:
          totalMentions > 0 ? round((mentions / totalMentions) * 100) : 0,
      }),
    );

    return {
      visibilityScore,
      positionScore,
      sentimentScore,
      shareOfVoiceScore,
      overallScore,
      totalResponses,
      brandMentions,
      avgPosition: avgPosition !== null ? round(avgPosition) : null,
      competitorScores,
    };
  }

  private computeCombinedScore(
    providerScores: ProviderScoreData[],
    competitors: string[],
  ): ProviderScoreData {
    const totalBrandMentions = providerScores.reduce(
      (sum, s) => sum + s.brandMentions,
      0,
    );

    // Aggregate competitor mentions across all providers
    const competitorMentionMap: Record<string, number> = {};
    for (const comp of competitors) {
      competitorMentionMap[comp] = 0;
    }
    for (const s of providerScores) {
      for (const cs of s.competitorScores) {
        competitorMentionMap[cs.name] =
          (competitorMentionMap[cs.name] ?? 0) + cs.mentions;
      }
    }

    const totalCompetitorMentions = Object.values(
      competitorMentionMap,
    ).reduce((a, b) => a + b, 0);
    const totalMentions = totalBrandMentions + totalCompetitorMentions;

    const combinedSoV =
      totalMentions > 0
        ? round((totalBrandMentions / totalMentions) * 100)
        : 0;

    const competitorScores = Object.entries(competitorMentionMap).map(
      ([name, mentions]) => ({
        name,
        mentions,
        shareOfVoice:
          totalMentions > 0 ? round((mentions / totalMentions) * 100) : 0,
      }),
    );

    const avg = (key: keyof ProviderScoreData) =>
      round(
        providerScores.reduce((sum, s) => sum + (s[key] as number), 0) /
          providerScores.length,
      );

    const visibilityScore = avg('visibilityScore');
    const positionScore = avg('positionScore');
    const sentimentScore = avg('sentimentScore');
    const overallScore = round(
      visibilityScore * 0.4 +
        positionScore * 0.3 +
        sentimentScore * 0.2 +
        combinedSoV * 0.1,
    );

    return {
      visibilityScore,
      positionScore,
      sentimentScore,
      shareOfVoiceScore: combinedSoV,
      overallScore,
      totalResponses: providerScores.reduce(
        (sum, s) => sum + s.totalResponses,
        0,
      ),
      brandMentions: totalBrandMentions,
      avgPosition: null,
      competitorScores,
    };
  }

  private zeroScore(): ProviderScoreData {
    return {
      visibilityScore: 0,
      positionScore: 0,
      sentimentScore: 50, // neutral — no data, not negative
      shareOfVoiceScore: 0,
      overallScore: 0,
      totalResponses: 0,
      brandMentions: 0,
      avgPosition: null,
      competitorScores: [],
    };
  }
}
