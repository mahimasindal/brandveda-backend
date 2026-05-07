import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysisRun, AnalysisRunSchema } from './schemas/analysis-run.schema';
import { LlmResponse, LlmResponseSchema } from './schemas/llm-response.schema';
import { AnalysisJob, AnalysisJobSchema } from './schemas/job.schema';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { LlmModule } from '../llm/llm.module';
import { BrandsModule } from '../brands/brands.module';
import { PromptsModule } from '../prompts/prompts.module';
import { UsersModule } from '../users/users.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisRun.name, schema: AnalysisRunSchema },
      { name: LlmResponse.name, schema: LlmResponseSchema },
      { name: AnalysisJob.name, schema: AnalysisJobSchema },
    ]),
    LlmModule,
    BrandsModule,
    PromptsModule,
    UsersModule,
    ScoringModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
