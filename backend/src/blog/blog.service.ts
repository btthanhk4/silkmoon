import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { BlogCategory, BlogCategoryDocument } from './schemas/blog-category.schema';
import { BlogComment, BlogCommentDocument } from './schemas/blog-comment.schema';
import { AdminCreateCommentDto, CreateBlogPostDto, UpdateBlogPostDto, CreateBlogCategoryDto, UpdateBlogCategoryDto, CreateCommentDto, UpdateCommentDto } from './dto/blog.dto';
@Injectable()
export class BlogService implements OnModuleInit {
  constructor(@InjectModel(BlogPost.name) private posts: Model<BlogPostDocument>, @InjectModel(BlogCategory.name) private categories: Model<BlogCategoryDocument>, @InjectModel(BlogComment.name) private comments: Model<BlogCommentDocument>) {}
  async onModuleInit() {
    const defaults = [
      { name: 'Bạn Có Biết', slug: 'ban-co-biet', description: 'Kiến thức hữu ích về giấc ngủ và chất liệu.' },
      { name: 'Sản Phẩm Silkmoon', slug: 'san-pham-silkmoon', description: 'Tin tức và hướng dẫn về sản phẩm Silkmoon.' },
      { name: 'Mẹo Hay', slug: 'meo-hay', description: 'Mẹo chăm sóc phòng ngủ và sản phẩm.' },
      { name: 'Không Gian Sống', slug: 'khong-gian-song', description: 'Cảm hứng thiết kế không gian sống.' },
      { name: 'Hướng Dẫn Chăm Sóc', slug: 'huong-dan-cham-soc', description: 'Hướng dẫn sử dụng, giặt và bảo quản sản phẩm Silkmoon.' },
    ];
    await this.categories.bulkWrite(defaults.map(item => ({ updateOne: { filter: { slug: item.slug }, update: { $setOnInsert: { ...item, isActive: true } }, upsert: true } })));
    const categoryDocs = await this.categories.find().lean();
    const categoryId = (slug: string) => categoryDocs.find(item => item.slug === slug)!._id.toString();
    const posts = [
      { title: 'Hướng Dẫn Unboxing Nệm Hybrid Silkmoon Từ A Đến Z', slug: 'huong-dan-unboxing-nem-hybrid-silkmoon', excerpt: 'Hướng dẫn chi tiết từng bước mở hộp và thiết lập nệm Hybrid Silkmoon đúng cách.', featuredImage: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=1600', categoryId: categoryId('san-pham-silkmoon'), layout: 'guide' },
      { title: 'Nệm 20 Triệu Không Đắt, Nệm 3 Triệu Mới Đắt?', slug: 'su-that-ve-nem-tot', excerpt: 'Phân tích minh bạch giá trị thực tế, cấu trúc và tuổi thọ của một chiếc nệm tốt.', featuredImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=1200', categoryId: categoryId('ban-co-biet'), layout: 'editorial' },
      { title: 'Dù Nóng Vẫn Ôm Gối Đắp Chăn Ngủ?', slug: 'ap-luc-cham-sau-khi-ngu', excerpt: 'Giải đáp cơ chế áp lực chạm sâu và lý do cơ thể thư giãn hơn khi ôm gối, đắp chăn.', featuredImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200', categoryId: categoryId('ban-co-biet'), layout: 'featured' },
      { title: 'Nệm Silkmoon Nest Hay Original?', slug: 'chon-nem-silkmoon-nest-hay-original', excerpt: 'Hướng dẫn chọn chính xác dòng nệm phù hợp với thói quen ngủ chỉ trong 45 giây.', featuredImage: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=1200', categoryId: categoryId('san-pham-silkmoon'), layout: 'guide' },
      { title: '7 Cách Chăm Sóc Chăn Ga Luôn Mềm Mại', slug: 'cach-cham-soc-chan-ga', excerpt: 'Những thói quen đơn giản giúp chăn ga giữ được độ mềm mại và bền màu lâu hơn.', featuredImage: 'https://images.unsplash.com/photo-1520699049698-acd2fce18736?auto=format&fit=crop&q=80&w=1200', categoryId: categoryId('huong-dan-cham-soc'), layout: 'guide' },
      { title: 'Thiết Kế Phòng Ngủ Tối Giản Và Bình Yên', slug: 'thiet-ke-phong-ngu-toi-gian', excerpt: 'Cách phối màu, ánh sáng và chất liệu để tạo nên một không gian nghỉ ngơi tĩnh tại.', featuredImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200', categoryId: categoryId('khong-gian-song'), layout: 'editorial' },
    ];
    await this.posts.bulkWrite(posts.map((post, index) => ({ updateOne: { filter: { slug: post.slug }, update: { $set: { ...post, author: 'Brand Silkmoon', status: 'published', publishedAt: new Date('2026-06-13'), content: `<h2>${index + 1}. Khám phá cùng Silkmoon</h2><p>${post.excerpt}</p><p>Silkmoon tổng hợp những kiến thức thực tế và hướng dẫn dễ áp dụng, giúp bạn chăm sóc giấc ngủ và không gian sống tốt hơn mỗi ngày.</p><h2>Điều bạn cần lưu ý</h2><ul><li>Lựa chọn phù hợp với nhu cầu cá nhân.</li><li>Ưu tiên chất liệu an toàn và bền vững.</li><li>Chăm sóc sản phẩm đúng hướng dẫn.</li></ul>` } }, upsert: true } })));
  }
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
    return this.posts.create(data);
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
