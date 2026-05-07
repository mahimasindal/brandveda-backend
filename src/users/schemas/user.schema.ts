import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ type: String, enum: ['trial', 'starter', 'pro', 'canceled'], default: 'trial' })
  plan: 'trial' | 'starter' | 'pro' | 'canceled';

  @Prop({ type: Date })
  trialEndsAt: Date;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ type: String, default: null })
  emailVerificationToken: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationTokenExpiresAt: Date | null;

  @Prop({
    type: {
      completed: { type: Boolean, default: false },
      currentStep: { type: Number, default: 0 },
      activeBrandId: { type: Types.ObjectId, ref: 'Brand', default: null },
    },
    default: () => ({ completed: false, currentStep: 0, activeBrandId: null }),
  })
  onboarding: {
    completed: boolean;
    currentStep: number;
    activeBrandId: Types.ObjectId | null;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
