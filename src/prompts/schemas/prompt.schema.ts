import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromptDocument = Prompt & Document;

export enum PromptStage {
  AWARENESS = 'awareness',
  CONSIDERATION = 'consideration',
  DECISION = 'decision',
}

@Schema({ timestamps: true })
export class Prompt {
  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: PromptStage, required: true })
  stage: PromptStage;

  @Prop({ required: true })
  index: number;

  @Prop({ required: true })
  text: string;

  @Prop({ default: false })
  isCustomized: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);
