import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { AdminCreateReviewDto } from './dto/admin-create-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('featured')
  findFeatured(@Query('limit') limit?: string) {
    return this.reviewsService.findFeatured(limit);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('product/:productId/summary')
  getProductSummary(@Param('productId') productId: string) {
    return this.reviewsService.getProductSummary(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin')
  createByAdmin(@Body() dto: AdminCreateReviewDto) {
    return this.reviewsService.createByAdmin(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Get()
  findAll(@Query() query: any) { return this.reviewsService.findAll(query); }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateReviewDto) { return this.reviewsService.update(id, data); }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN) @Delete(':id')
  remove(@Param('id') id: string) { return this.reviewsService.remove(id); }
}
