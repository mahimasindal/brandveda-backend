import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AnalysisRun,
  AnalysisRunDocument,
  RunStatus,
} from '../analysis/schemas/analysis-run.schema';
import { Score, ScoreDocument, ScoreProvider } from '../scoring/schemas/score.schema';
import { BrandsService } from '../brands/brands.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(AnalysisRun.name)
    private analysisRunModel: Model<AnalysisRunDocument>,
    @InjectModel(Score.name) private scoreModel: Model<ScoreDocument>,
    private brandsService: BrandsService,
  ) {}

  async getDashboard(brandId: string, userId: string) {
    const brand = await this.brandsService.findOneByUser(brandId, userId);

    const latestRun = await this.analysisRunModel.findOne(
      {
        brandId: new Types.ObjectId(brandId),
        userId: new Types.ObjectId(userId),
        status: RunStatus.COMPLETED,
      },
      null,
      { sort: { createdAt: -1 } },
    );

    const scores: ScoreDocument[] = latestRun
      ? await this.scoreModel.find({ analysisRunId: latestRun._id })
      : [];

    return {
      brand,
      latestRun,
      scores,
    };
  }

  async getScoreHistory(brandId: string, userId: string) {
    await this.brandsService.findOneByUser(brandId, userId);

    const runs = await this.analysisRunModel
      .find(
        {
          brandId: new Types.ObjectId(brandId),
          userId: new Types.ObjectId(userId),
          status: RunStatus.COMPLETED,
        },
        null,
        { sort: { createdAt: -1 }, limit: 12 },
      );

    const history = await Promise.all(
      runs.map(async (run) => {
        const combinedScore = await this.scoreModel.findOne({
          analysisRunId: run._id,
          provider: ScoreProvider.COMBINED,
        });
        return {
          date: (run as any).createdAt,
          overallScore: combinedScore?.overallScore ?? null,
          visibilityScore: combinedScore?.visibilityScore ?? null,
          sentimentScore: combinedScore?.sentimentScore ?? null,
          shareOfVoiceScore: combinedScore?.shareOfVoiceScore ?? null,
        };
      }),
    );

    return history;
  }

  async getCompetitorSoV(brandId: string, userId: string) {
    const brand = await this.brandsService.findOneByUser(brandId, userId);

    const latestRun = await this.analysisRunModel.findOne(
      {
        brandId: new Types.ObjectId(brandId),
        userId: new Types.ObjectId(userId),
        status: RunStatus.COMPLETED,
      },
      null,
      { sort: { createdAt: -1 } },
    );

    if (!latestRun) return [];

    const combinedScore = await this.scoreModel.findOne({
      analysisRunId: latestRun._id,
      provider: ScoreProvider.COMBINED,
    });

    if (!combinedScore) return [];

    const brandEntry = {
      name: brand.name,
      shareOfVoice: combinedScore.shareOfVoiceScore,
      mentions: combinedScore.brandMentions,
    };

    const competitorEntries = combinedScore.competitorScores.map((cs) => ({
      name: cs.name,
      shareOfVoice: cs.shareOfVoice,
      mentions: cs.mentions,
    }));

    return [brandEntry, ...competitorEntries].sort(
      (a, b) => b.shareOfVoice - a.shareOfVoice,
    );
  }

  async getRunScores(runId: string, userId: string) {
    const run = await this.analysisRunModel.findOne({
      _id: new Types.ObjectId(runId),
      userId: new Types.ObjectId(userId),
    });
    if (!run) throw new NotFoundException('Analysis run not found');

    return this.scoreModel.find({ analysisRunId: run._id });
  }

  async getDigestDataForUser(userId: string) {
    const brands = await this.brandsService.findAllByUser(userId);

    const results = await Promise.all(
      brands.map(async (brand) => {
        const brandId = (brand._id as any).toString();

        const latestRun = await this.analysisRunModel.findOne(
          {
            brandId: new Types.ObjectId(brandId),
            userId: new Types.ObjectId(userId),
            status: RunStatus.COMPLETED,
          },
          null,
          { sort: { createdAt: -1 } },
        );
        if (!latestRun) return null;

        const score = await this.scoreModel.findOne({
          analysisRunId: latestRun._id,
          provider: ScoreProvider.COMBINED,
        });

        const previousRun = await this.analysisRunModel.findOne(
          {
            brandId: new Types.ObjectId(brandId),
            userId: new Types.ObjectId(userId),
            status: RunStatus.COMPLETED,
            _id: { $ne: latestRun._id },
          },
          null,
          { sort: { createdAt: -1 } },
        );
        let previousScore: ScoreDocument | null = null;
        if (previousRun) {
          previousScore = await this.scoreModel.findOne({
            analysisRunId: previousRun._id,
            provider: ScoreProvider.COMBINED,
          });
        }

        return {
          brandName: brand.name,
          overallScore: score?.overallScore ?? null,
          previousOverallScore: previousScore?.overallScore ?? null,
          scores: score
            ? {
                visibility: score.visibilityScore,
                position: score.positionScore,
                sentiment: score.sentimentScore,
                shareOfVoice: score.shareOfVoiceScore,
              }
            : null,
        };
      }),
    );

    return results.filter((r) => r !== null);
  }

}
