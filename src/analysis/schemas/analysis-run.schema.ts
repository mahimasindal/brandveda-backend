import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnalysisRunDocument = AnalysisRun & Document;

export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TriggerType {
  MANUAL = 'manual',
  CRON = 'cron',
}

@Schema({ timestamps: true })
export class AnalysisRun {
  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: RunStatus, default: RunStatus.PENDING })
  status: RunStatus;

  @Prop({ default: 0 })
  totalCalls: number;

  @Prop({ default: 0 })
  completedCalls: number;

  @Prop({ default: 0 })
  failedCalls: number;

  @Prop({ type: String, enum: TriggerType, default: TriggerType.MANUAL })
  triggeredBy: TriggerType;

  @Prop({ type: Date })
  completedAt: Date;
}

export const AnalysisRunSchema = SchemaFactory.createForClass(AnalysisRun);
