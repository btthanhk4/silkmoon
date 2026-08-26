import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { BlogCategory, BlogCategoryDocument } from './schemas/blog-category.schema';
import { BlogComment, BlogCommentDocument } from './schemas/blog-comment.schema';
import { AdminCreateCommentDto, CreateBlogPostDto, UpdateBlogPostDto, CreateBlogCategoryDto, UpdateBlogCategoryDto, CreateCommentDto, UpdateCommentDto } from './dto/blog.dto';
@Injectable()
export class BlogService {
  constructor(@InjectModel(BlogPost.name) private posts: Model<BlogPostDocument>, @InjectModel(BlogCategory.name) private categories: Model<BlogCategoryDocument>, @InjectModel(BlogComment.name) private comments: Model<BlogCommentDocument>) {}
  async listPosts(admin = false, query: { page?: string; limit?: string; search?: string; status?: string } = {}) {
    const pageNum = Math.max(1, parseInt(query.page || '1', 10));
    const limitNum = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (pageNum - 1) * limitNum;
    const filter: any = admin ? {} : { status: 'published' };
    if (query.search?.trim()) filter.$text = { $search: query.search.trim() };
    if (admin && query.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      this.posts.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      this.posts.countDocuments(filter),
    ]);
    return { items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }
  async getPost(id: string) {
    if (/^[a-f\d]{24}$/i.test(id)) {
      return this.posts.findById(id).lean();
    }
    return this.posts.findOne({ slug: id }).lean();
  }

  async createPost(data: CreateBlogPostDto) {
    const baseSlug = data.slug.trim();
    let suffix = 1;

    // The slug is generated from the title in the admin form. Reusing a title
    // must not surface MongoDB's duplicate-key error as a generic HTTP 500.
    while (suffix <= 1000) {
      const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
      try {
        return await this.posts.create({ ...data, slug });
      } catch (error) {
        if ((error as { code?: number })?.code !== 11000) throw error;
        suffix += 1;
      }
    }

    throw new Error('Không thể tạo đường dẫn duy nhất cho bài viết.');
  }

  async updatePost(id: string, data: UpdateBlogPostDto) {
    return this.posts.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean();
  }

  async deletePost(id: string) {
    return this.posts.findByIdAndDelete(id).lean();
  }

  async listCategories(query: any = {}) {
    if (!query.page && !query.limit && !query.search && query.isActive === undefined) return this.categories.find().sort({ name: 1 }).lean();
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '15', 10));
    const filter: any = {};
    if (query.search?.trim()) filter.$text = { $search: query.search.trim() };
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    const [items, total] = await Promise.all([this.categories.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(), this.categories.countDocuments(filter)]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createCategory(data: CreateBlogCategoryDto) {
    return this.categories.create(data);
  }

  async updateCategory(id: string, data: UpdateBlogCategoryDto) {
    return this.categories.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean();
  }

  async deleteCategory(id: string) {
    return this.categories.findByIdAndDelete(id).lean();
  }

  async listComments(query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const filter: any = {};
    if (query.search?.trim()) filter.$text = { $search: query.search.trim() };
    if (query.status) filter.status = query.status;
    const [items, total] = await Promise.all([this.comments.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), this.comments.countDocuments(filter)]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async listApprovedComments(postId: string) {
    return this.comments.find({ postId, status: 'approved' }).sort({ createdAt: -1 }).lean();
  }

  async createComment(data: CreateCommentDto) {
    return this.comments.create({ ...data, authorName: data.authorName.trim(), content: data.content.trim(), status: 'pending' });
  }

  async createCommentByAdmin(data: AdminCreateCommentDto) {
    return this.comments.create({ ...data, authorName: data.authorName.trim(), content: data.content.trim(), status: data.status || 'approved' });
  }

  async updateComment(id: string, data: UpdateCommentDto) {
    return this.comments.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean();
  }

  async deleteComment(id: string) {
    return this.comments.findByIdAndDelete(id).lean();
  }
}
