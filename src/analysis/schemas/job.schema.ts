import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnalysisJobDocument = AnalysisJob & Document;

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class AnalysisJob {
  @Prop({ type: Types.ObjectId, ref: 'AnalysisRun', required: true })
  analysisRunId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: true })
  brandId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: JobStatus, default: JobStatus.PENDING })
  status: JobStatus;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: 3 })
  maxAttempts: number;

  @Prop({ default: '' })
  lastError: string;

  @Prop({ type: Date, default: () => new Date() })
  processAfter: Date;
}

export const AnalysisJobSchema = SchemaFactory.createForClass(AnalysisJob);
