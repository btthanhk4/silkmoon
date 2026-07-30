import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  CONTRIBUTOR = 'contributor',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop()
  addressDetail?: string;

  @Prop()
  provinceCode?: number;

  @Prop()
  provinceName?: string;

  @Prop()
  wardCode?: number;

  @Prop()
  wardName?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  // Existing accounts do not have this field and remain valid. New website
  // registrations explicitly set it to false until the OTP is confirmed.
  @Prop()
  emailVerified?: boolean;

  @Prop({ select: false })
  emailVerificationOtpHash?: string;

  @Prop({ select: false })
  emailVerificationExpiresAt?: Date;

  @Prop({ select: false })
  emailVerificationLastSentAt?: Date;

  @Prop({ select: false, default: 0 })
  emailVerificationAttempts?: number;

  @Prop({
    type: [{ productId: { type: String }, cartItemId: { type: String }, quantity: { type: Number }, colorId: { type: String }, colorLabel: { type: String }, sizeId: { type: String }, sizeLabel: { type: String }, sizeMeasurements: { type: [Object], default: [] }, customSize: { type: Object }, customMeasurements: { type: [Object], default: [] }, embroidery: { type: String } }],
    default: [],
  })
  cart: { productId: string; cartItemId?: string; quantity: number; colorId?: string; colorLabel?: string; sizeId?: string; sizeLabel?: string; sizeMeasurements?: any[]; customSize?: any; customMeasurements?: any[]; embroidery?: string }[];

  @Prop({ select: false })
  resetPasswordTokenHash?: string;

  @Prop({ select: false })
  resetPasswordExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 'text', fullName: 'text', phone: 'text' });
UserSchema.index({ role: 1, createdAt: -1 });
