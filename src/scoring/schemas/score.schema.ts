import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScoreDocument = Score & Document;

export enum ScoreProvider {
  OPENAI = 'openai',
  PERPLEXITY = 'perplexity',
  GEMINI = 'gemini',
  COMBINED = 'combined',
}

@Schema({ timestamps: true })
export class Score {
  @Prop({ type: Types.ObjectId, ref: 'AnalysisRun', required: true })
  analysisRunId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ScoreProvider, required: true })
  provider: ScoreProvider;

  @Prop({ default: 0 })
  overallScore: number;

  @Prop({ default: 0 })
  visibilityScore: number;

  @Prop({ default: 0 })
  positionScore: number;

  @Prop({ default: 0 })
  sentimentScore: number;

  @Prop({ default: 0 })
  shareOfVoiceScore: number;

  @Prop({ default: 0 })
  totalResponses: number;

  @Prop({ default: 0 })
  brandMentions: number;

  @Prop({ type: Number, default: null })
  avgPosition: number | null;

  @Prop({
    type: [{ name: String, mentions: Number, shareOfVoice: Number }],
    default: [],
  })
  competitorScores: { name: string; mentions: number; shareOfVoice: number }[];
}

export const ScoreSchema = SchemaFactory.createForClass(Score);
