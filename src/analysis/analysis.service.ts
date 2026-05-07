import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AnalysisRun,
  AnalysisRunDocument,
  RunStatus,
  TriggerType,
} from './schemas/analysis-run.schema';
import {
  LlmResponse,
  LlmResponseDocument,
  LlmProvider,
} from './schemas/llm-response.schema';
import {
  AnalysisJob,
  AnalysisJobDocument,
  JobStatus,
} from './schemas/job.schema';
import { LlmService } from '../llm/llm.service';
import { BrandsService } from '../brands/brands.service';
import { PromptsService } from '../prompts/prompts.service';
import { UsersService } from '../users/users.service';
import { ScoringService } from '../scoring/scoring.service';
import { batchProcess } from '../common/utils/batch-process';

const PLAN_LIMITS: Record<string, { runsPerMonth: number; maxBrands: number }> =
  {
    trial: { runsPerMonth: 1, maxBrands: 1 },
    starter: { runsPerMonth: 4, maxBrands: 1 },
    pro: { runsPerMonth: 12, maxBrands: 3 },
  };

@Injectable()
export class AnalysisService {
  constructor(
    @InjectModel(AnalysisRun.name)
    private analysisRunModel: Model<AnalysisRunDocument>,
    @InjectModel(LlmResponse.name)
    private llmResponseModel: Model<LlmResponseDocument>,
    @InjectModel(AnalysisJob.name)
    private jobModel: Model<AnalysisJobDocument>,
    private llmService: LlmService,
    private brandsService: BrandsService,
    private promptsService: PromptsService,
    private usersService: UsersService,
    private scoringService: ScoringService,
  ) {}

  async createRun(
    brandId: string,
    userId: string,
    triggeredBy: TriggerType = TriggerType.MANUAL,
  ): Promise<AnalysisRunDocument> {
    await this.checkRunLimit(userId);

    // Verify brand belongs to user
    await this.brandsService.findOneByUser(brandId, userId);

    const run = await this.analysisRunModel.create({
      brandId: new Types.ObjectId(brandId),
      userId: new Types.ObjectId(userId),
      status: RunStatus.PENDING,
      triggeredBy,
    });

    await this.jobModel.create({
      analysisRunId: run._id,
      brandId: new Types.ObjectId(brandId),
      userId: new Types.ObjectId(userId),
      processAfter: new Date(),
    });

    return run;
  }

  async findRunsByBrand(
    brandId: string,
    userId: string,
  ): Promise<AnalysisRunDocument[]> {
    await this.brandsService.findOneByUser(brandId, userId);
    return this.analysisRunModel
      .find({
        brandId: new Types.ObjectId(brandId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 });
  }

  async findLatestRun(
    brandId: string,
    userId: string,
  ): Promise<AnalysisRunDocument> {
    await this.brandsService.findOneByUser(brandId, userId);
    const run = await this.analysisRunModel.findOne(
      {
        brandId: new Types.ObjectId(brandId),
        userId: new Types.ObjectId(userId),
      },
      null,
      { sort: { createdAt: -1 } },
    );
    if (!run) throw new NotFoundException('No analysis runs found for this brand');
    return run;
  }

  // Called by JobsService CRON — picks up one pending job and processes it
  async processPendingJob(): Promise<void> {
    const job = await this.jobModel.findOneAndUpdate(
      { status: JobStatus.PENDING, processAfter: { $lte: new Date() } },
      { $set: { status: JobStatus.PROCESSING }, $inc: { attempts: 1 } },
      { new: true },
    );

    if (!job) return;

    try {
      await this.processJob(job);
      await this.jobModel.updateOne(
        { _id: job._id },
        { $set: { status: JobStatus.COMPLETED } },
      );
    } catch (err) {
      const exhausted = job.attempts >= job.maxAttempts;
      await this.jobModel.updateOne(
        { _id: job._id },
        {
          $set: {
            status: exhausted ? JobStatus.FAILED : JobStatus.PENDING,
            lastError: (err as Error).message,
            ...(exhausted
              ? {}
              : { processAfter: new Date(Date.now() + 60_000) }),
          },
        },
      );
      if (exhausted) {
        await this.analysisRunModel.updateOne(
          { _id: job.analysisRunId },
          { $set: { status: RunStatus.FAILED } },
        );
      }
    }
  }

  private async processJob(job: AnalysisJobDocument): Promise<void> {
    await this.analysisRunModel.updateOne(
      { _id: job.analysisRunId },
      { $set: { status: RunStatus.RUNNING } },
    );

    const brandId = job.brandId.toString();
    const userId = job.userId.toString();

    const brand = await this.brandsService.findOneByUser(brandId, userId);
    const prompts = await this.promptsService.findByBrand(brandId, userId);

    const allProviders = [LlmProvider.OPENAI, LlmProvider.PERPLEXITY, LlmProvider.GEMINI];
    const enabledProviders = allProviders.filter((p) => this.llmService.isEnabled(p));

    // Update totalCalls to reflect only enabled providers
    await this.analysisRunModel.updateOne(
      { _id: job.analysisRunId },
      { $set: { totalCalls: enabledProviders.length * prompts.length } },
    );

    // Fire enabled providers in parallel; within each provider calls are rate-limited
    await Promise.all(
      enabledProviders.map((p) => this.runProvider(p, prompts, brand, job)),
    );

    await this.analysisRunModel.updateOne(
      { _id: job.analysisRunId },
      { $set: { status: RunStatus.COMPLETED, completedAt: new Date() } },
    );

    // Calculate and persist scores for this run
    await this.scoringService.calculateScores(
      job.analysisRunId.toString(),
      job.brandId.toString(),
      job.userId.toString(),
      brand.competitors,
    );
  }

  private async runProvider(
    provider: LlmProvider,
    prompts: any[],
    brand: any,
    job: AnalysisJobDocument,
  ): Promise<void> {
    const burstSize = this.llmService.getBurstSize(provider);

    await batchProcess(
      prompts,
      async (prompt) => {
        const start = Date.now();
        let responseText = '';
        let error = '';

        try {
          responseText = await this.llmService.call(provider, prompt.text);
        } catch (err) {
          error = (err as Error).message;
        }

        const processingTimeMs = Date.now() - start;
        const parsed =
          responseText && !error
            ? this.llmService.parseResponse(
                responseText,
                brand.name,
                brand.competitors,
              )
            : null;

        await this.llmResponseModel.create({
          analysisRunId: job.analysisRunId,
          brandId: job.brandId,
          userId: job.userId,
          promptId: prompt._id,
          provider,
          promptText: prompt.text,
          responseText,
          brandMentioned: parsed?.brandMentioned ?? false,
          mentionPosition: parsed?.mentionPosition ?? null,
          competitorMentions: parsed?.competitorMentions ?? [],
          sentiment: parsed?.sentiment ?? 0,
          processingTimeMs,
          error,
        });

        const field = error ? 'failedCalls' : 'completedCalls';
        await this.analysisRunModel.updateOne(
          { _id: job.analysisRunId },
          { $inc: { [field]: 1 } },
        );
      },
      burstSize,
      1000,
    );
  }

  private async checkRunLimit(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) return;

    const plan = user.plan ?? 'trial';

    // Block canceled plans
    if (plan === 'canceled') {
      throw new ForbiddenException(
        'Your subscription has been canceled. Please resubscribe to continue.',
      );
    }

    // Block expired trials
    if (plan === 'trial' && user.trialEndsAt && user.trialEndsAt < new Date()) {
      throw new ForbiddenException(
        'Your trial has expired. Please upgrade to continue.',
      );
    }

    const limit = PLAN_LIMITS[plan]?.runsPerMonth ?? 1;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const runsThisMonth = await this.analysisRunModel.countDocuments({
      userId: new Types.ObjectId(userId),
      createdAt: { $gte: startOfMonth },
    });

    if (runsThisMonth >= limit) {
      throw new ForbiddenException(
        `Monthly run limit reached (${limit} runs/month on ${plan} plan)`,
      );
    }
  }
}
