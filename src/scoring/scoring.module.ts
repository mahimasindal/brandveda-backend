import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Score, ScoreSchema } from './schemas/score.schema';
import {
  LlmResponse,
  LlmResponseSchema,
} from '../analysis/schemas/llm-response.schema';
import { ScoringService } from './scoring.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Score.name, schema: ScoreSchema },
      { name: LlmResponse.name, schema: LlmResponseSchema },
    ]),
  ],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
