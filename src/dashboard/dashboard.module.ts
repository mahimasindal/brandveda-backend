import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AnalysisRun,
  AnalysisRunSchema,
} from '../analysis/schemas/analysis-run.schema';
import { Score, ScoreSchema } from '../scoring/schemas/score.schema';
import { BrandsModule } from '../brands/brands.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisRun.name, schema: AnalysisRunSchema },
      { name: Score.name, schema: ScoreSchema },
    ]),
    BrandsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
