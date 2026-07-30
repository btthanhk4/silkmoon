import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { AdminCreateCommentDto, CreateBlogPostDto, UpdateBlogPostDto, CreateBlogCategoryDto, UpdateBlogCategoryDto, CreateCommentDto, UpdateCommentDto } from './dto/blog.dto';
const admin = [JwtAuthGuard, RolesGuard];
@Controller('blog')
export class BlogController {
  constructor(private service: BlogService) { }
  @Get('posts') posts() { return this.service.listPosts(); }
  @Get('posts/:id') post(@Param('id') id: string) { return this.service.getPost(id); }
  @Get('categories') categories() { return this.service.listCategories(); }
  @Get('comments/:postId') postComments(@Param('postId') postId: string) { return this.service.listApprovedComments(postId); }
  @Post('comments') comment(@Body() data: CreateCommentDto) { return this.service.createComment(data); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Get('admin/posts') adminPosts(@Query() query: any) { return this.service.listPosts(true, query); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Get('admin/categories') adminCategories(@Query() query: any) { return this.service.listCategories(query); }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Post('admin/posts') createPost(@Body() d: CreateBlogPostDto) { return this.service.createPost(d) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Patch('admin/posts/:id') updatePost(@Param('id') id: string, @Body() d: UpdateBlogPostDto) { return this.service.updatePost(id, d) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Delete('admin/posts/:id') deletePost(@Param('id') id: string) { return this.service.deletePost(id) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Post('admin/categories') createCategory(@Body() d: CreateBlogCategoryDto) { return this.service.createCategory(d) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Patch('admin/categories/:id') updateCategory(@Param('id') id: string, @Body() d: UpdateBlogCategoryDto) { return this.service.updateCategory(id, d) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Delete('admin/categories/:id') deleteCategory(@Param('id') id: string) { return this.service.deleteCategory(id) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Get('admin/comments') comments(@Query() query: any) { return this.service.listComments(query) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Post('admin/comments') createCommentByAdmin(@Body() d: AdminCreateCommentDto) { return this.service.createCommentByAdmin(d) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Patch('admin/comments/:id') updateComment(@Param('id') id: string, @Body() d: UpdateCommentDto) { return this.service.updateComment(id, d) }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Delete('admin/comments/:id') deleteComment(@Param('id') id: string) { return this.service.deleteComment(id) }
}
