import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  authorName: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: false })
  isVerified: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Index for fast lookup by productId
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ authorName: 'text', comment: 'text' });
ReviewSchema.index({ isVerified: 1, createdAt: -1 });
