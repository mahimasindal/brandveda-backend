import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LlmResponseDocument = LlmResponse & Document;

export enum LlmProvider {
  OPENAI = 'openai',
  PERPLEXITY = 'perplexity',
  GEMINI = 'gemini',
}

@Schema({ timestamps: true })
export class LlmResponse {
  @Prop({ type: Types.ObjectId, ref: 'AnalysisRun', required: true })
  analysisRunId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Prompt', required: true })
  promptId: Types.ObjectId;

  @Prop({ type: String, enum: LlmProvider, required: true })
  provider: LlmProvider;

  @Prop({ required: true })
  promptText: string;

  @Prop({ default: '' })
  responseText: string;

  @Prop({ default: false })
  brandMentioned: boolean;

  @Prop({ type: Number, default: null })
  mentionPosition: number | null;

  @Prop({
    type: [{ name: String, position: { type: Number, default: null } }],
    default: [],
  })
  competitorMentions: { name: string; position: number | null }[];

  @Prop({ type: Number, default: 0 })
  sentiment: number;

  @Prop({ default: 0 })
  processingTimeMs: number;

  @Prop({ default: '' })
  error: string;
}

export const LlmResponseSchema = SchemaFactory.createForClass(LlmResponse);
