import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async findByProduct(productId: string) {
    return this.reviewModel
      .find({ productId, isVerified: true })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getProductSummary(productId: string) {
    const rows = await this.reviewModel.aggregate([
      { $match: { productId, isVerified: true } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return {
      average: rows[0]?.average || 0,
      count: rows[0]?.count || 0,
    };
  }

  async findFeatured(limitValue?: string) {
    const limit = Math.min(12, Math.max(1, parseInt(limitValue || '6', 10) || 6));
    return this.reviewModel
      .find({ isVerified: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async create(dto: CreateReviewDto) {
    const review = await this.reviewModel.create(dto);
    return review;
  }
  async findAll(query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const filter: any = {};
    if (query.search?.trim()) filter.$text = { $search: query.search.trim() };
    if (query.isVerified !== undefined) filter.isVerified = query.isVerified === 'true';
    const [items, total] = await Promise.all([this.reviewModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), this.reviewModel.countDocuments(filter)]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
  async update(id: string, data: UpdateReviewDto) {
    const update = {
      ...data,
      ...(data.authorName !== undefined ? { authorName: data.authorName.trim() } : {}),
      ...(data.comment !== undefined ? { comment: data.comment.trim() } : {}),
    };
    return this.reviewModel.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true }).lean();
  }
  async remove(id: string) { return this.reviewModel.findByIdAndDelete(id).lean(); }
}
