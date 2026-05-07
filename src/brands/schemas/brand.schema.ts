import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BrandDocument = Brand & Document;

@Schema({ timestamps: true })
export class Brand {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ type: [String], default: [] })
  competitors: string[];

  @Prop({ default: '' })
  targetAudience: string;

  @Prop({ trim: true, default: '' })
  website: string;

  @Prop({ trim: true, default: '' })
  description: string;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
