import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type BlogCommentDocument = BlogComment & Document;
@Schema({ timestamps: true, collection: 'blogcomments' })
export class BlogComment {
  @Prop({ required: true }) postId: string;
  @Prop({ required: true }) authorName: string;
  @Prop() email?: string;
  @Prop({ required: true }) content: string;
  @Prop({ type: [String], default: [] }) images: string[];
  @Prop({ default: 'pending', enum: ['pending', 'approved', 'spam'] }) status: string;
}
export const BlogCommentSchema = SchemaFactory.createForClass(BlogComment);
