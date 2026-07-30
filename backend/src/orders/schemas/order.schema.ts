import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

class OrderItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  spec: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0, min: 0 })
  costPriceSnapshot: number;

  @Prop()
  image: string;

  @Prop({ default: '' })
  colorId: string;

  @Prop({ default: '' })
  colorLabel: string;

  @Prop({ type: String, default: null })
  embroidery: string | null;

  @Prop({ default: '' })
  sizeId: string;

  @Prop({ default: '' })
  sizeLabel: string;

  @Prop({ type: [Object], default: [] })
  sizeMeasurements: Array<{ id?: string; label: string; value?: number | string; unit?: string }>;

  @Prop({ type: Object, default: null })
  customSize: { width?: number; length?: number; height?: number } | null;

  @Prop({ type: [Object], default: [] })
  customMeasurements: Array<{ id?: string; label: string; value?: number | string; unit?: string }>;

  @Prop({ default: false })
  isCustomSize: boolean;
}

@Schema({ timestamps: true })
export class Order {
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: '' })
  addressDetail: string;

  @Prop({ type: Number, default: null })
  provinceCode?: number | null;

  @Prop({ default: '' })
  provinceName: string;

  @Prop({ type: Number, default: null })
  wardCode?: number | null;

  @Prop({ default: '' })
  wardName: string;

  @Prop({ default: '' })
  note: string;

  @Prop({ required: true, enum: ['payos', 'cod'] })
  paymentMethod: string;

  @Prop({
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop({ type: Number, unique: true, sparse: true })
  payosOrderCode?: number;

  @Prop({ type: String, default: null })
  payosPaymentLinkId?: string | null;

  @Prop({ type: String, default: null })
  payosReference?: string | null;

  @Prop({
    enum: ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
  })
  orderStatus: string;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  discountAmount: number;

  @Prop({ required: true })
  total: number;

  @Prop({ type: String, default: null })
  promoCode: string | null;

  @Prop({ type: [Object], required: true })
  items: OrderItem[];

  @Prop({ default: false })
  hasEmbroidery: boolean;

  @Prop({ default: false })
  hasCustomSize: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ orderNumber: 'text', fullName: 'text', email: 'text', phone: 'text' });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ hasEmbroidery: 1, createdAt: -1 });
OrderSchema.index({ hasCustomSize: 1, createdAt: -1 });
