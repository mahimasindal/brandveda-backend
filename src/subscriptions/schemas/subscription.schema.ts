import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  stripeCustomerId: string;

  @Prop({ default: '' })
  stripeSubscriptionId: string;

  @Prop({ type: String, enum: ['starter', 'pro'], required: true })
  plan: 'starter' | 'pro';

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INCOMPLETE,
  })
  status: SubscriptionStatus;

  @Prop({ type: Date })
  currentPeriodStart: Date;

  @Prop({ type: Date })
  currentPeriodEnd: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
