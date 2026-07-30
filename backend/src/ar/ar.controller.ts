import { Controller, Post, Body, Get, HttpException, HttpStatus, Query, Res, UseInterceptors, UploadedFile, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { ARService } from './ar.service';
import type { Response, Request } from 'express';
import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { SettingsService } from '../settings/settings.service';

@Controller('ar')
export class ARController {
  constructor(private readonly arService: ARService, private readonly settingsService: SettingsService) { }

  // ── Temporary: list models to find image generation support ──
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('list-models')
  async listModels() {
    return this.arService.listAvailableModels();
  }

  @Post('detect-bed')
  async detectBed(@Body() body: { image: string }) {
    if (!body.image) {
      throw new HttpException('Image data is required', HttpStatus.BAD_REQUEST);
    }
    try {
      const corners = await this.arService.detectBedCorners(body.image);
      return { success: true, corners };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to detect bed corners',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- VERSION 1 & 2 ARCHITECTURE SCAFFOLDING ---

  @Get('proxy-image')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(HttpStatus.BAD_REQUEST).send('URL is required');
    }
    try {
      const parsedUrl = new URL(url);
      const allowedDomains = ['res.cloudinary.com', 'images.unsplash.com'];
      if (!allowedDomains.includes(parsedUrl.hostname)) {
        return res.status(HttpStatus.FORBIDDEN).send('Domain not allowed for proxying');
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(buffer));
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Proxy error: ' + error.message);
    }
  }

  @Get('download-image')
  async downloadImage(@Query('url') url: string, @Query('filename') filename: string, @Res() res: Response) {
    if (!url) return res.status(HttpStatus.BAD_REQUEST).send('URL is required');
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'res.cloudinary.com') {
        return res.status(HttpStatus.FORBIDDEN).send('Image URL is not allowed');
      }
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) throw new Error('Failed to fetch image');
      const safeFilename = String(filename || 'Silkmoon_AR.jpg')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .slice(0, 100) || 'Silkmoon_AR.jpg';
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(buffer);
    } catch {
      return res.status(HttpStatus.BAD_GATEWAY).send('Unable to download image');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-usdz')
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'usdz');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        cb(null, `model-${Date.now()}-${Math.round(Math.random() * 1e9)}.usdz`);
      }
    })
  }))
  async uploadUsdz(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new HttpException('File upload failed', HttpStatus.BAD_REQUEST);
    }
    
    // Create the public URL
    const publicUrl = `/uploads/usdz/${file.filename}`;
    return { success: true, url: publicUrl };
  }

  @Get('latest-usdz')
  async getLatestUsdz() {
    const uploadPath = path.join(process.cwd(), 'uploads', 'usdz');
    if (!fs.existsSync(uploadPath)) return { success: false, message: 'No files' };
    const files = fs.readdirSync(uploadPath);
    if (files.length === 0) return { success: false, message: 'No files' };
    
    // Sort by modified time
    files.sort((a, b) => {
      return fs.statSync(path.join(uploadPath, b)).mtime.getTime() - fs.statSync(path.join(uploadPath, a)).mtime.getTime();
    });
    
    return {
      success: true,
      latest: `/uploads/usdz/${files[0]}`,
      size: fs.statSync(path.join(uploadPath, files[0])).size
    };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('upload')
  async uploadImage(@Body() body: { image: string; usage?: 'product' | 'ar' | 'review' | 'comment' }) {
    if (!body.image) throw new HttpException('Missing image data', HttpStatus.BAD_REQUEST);
    try {
      const isProductImage = body.usage === 'product';
      const folder = isProductImage
        ? 'silkmoon_products'
        : body.usage === 'comment'
          ? 'silkmoon_blog_comments'
          : body.usage === 'review'
            ? 'silkmoon_reviews'
            : 'silkmoon_ar';
      const url = await this.arService.uploadImageToCloudinary(
        body.image,
        folder,
        isProductImage,
      );
      const deliveryUrl = body.usage === 'review' || body.usage === 'comment'
        ? url.replace('/upload/', '/upload/f_auto,q_auto/')
        : url;
      return { success: true, url: deliveryUrl };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('auto-tryon')
  async autoTryOn(@Body() body: { roomImageUrl: string, productImageUrl?: string, prompt: string }) {
    if (!body.roomImageUrl) throw new HttpException('Missing room image URL', HttpStatus.BAD_REQUEST);

    try {
      // 1. Get Mask from Grounded SAM
      const maskUrl = await this.arService.autoSegmentBed(body.roomImageUrl);

      // 2. Inpaint using SDXL with the mask
      const resultImage = await this.arService.inpaintBed(
        body.roomImageUrl,
        maskUrl,
        body.prompt || 'silk fabric',
        body.productImageUrl
      );

      return {
        success: true,
        message: 'Auto Try-On completed successfully',
        resultImage: resultImage,
        maskImage: maskUrl // return mask just for debugging/frontend display if needed
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to complete auto try-on',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('inpaint')
  async inpaintBed(@Body() body: { imageUrl: string, maskUrl: string, prompt: string, productImageUrl?: string }) {
    if (!body.imageUrl || !body.maskUrl) throw new HttpException('Missing image or mask URL', HttpStatus.BAD_REQUEST);

    try {
      const resultImage = await this.arService.inpaintBed(body.imageUrl, body.maskUrl, body.prompt || 'silk fabric', body.productImageUrl);
      return {
        success: true,
        message: 'Inpainting completed successfully',
        resultImage: resultImage
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to inpaint bed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per IP
  @Post('generate-preview')
  async generatePreview(@Body() body: { imageUrl?: string; image?: string; color: string; fabricName?: string }) {
    if (!body.image && !body.imageUrl) {
      throw new HttpException('Image data or URL is required', HttpStatus.BAD_REQUEST);
    }
    try {
      let base64Input: string = body.image || '';
      if (body.imageUrl) {
        // Fetch from Cloudinary
        const response = await fetch(body.imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        base64Input = `data:image/jpeg;base64,${base64Data}`;
      }

      // Generate with Gemini
      const assistantConfig = await this.settingsService.findByKey('assistant_config');
      const resultBase64 = await this.arService.generateBedOverlay(
        base64Input,
        body.color || '#C9A882',
        body.fabricName || 'champagne silk',
        assistantConfig?.value?.ar?.defaultPrompt,
      );

      // Upload the result to Cloudinary to save bandwidth
      const resultUrl = await this.arService.uploadImageToCloudinary(resultBase64);

      return { success: true, image: resultUrl }; // Return Cloudinary URL
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.startsWith('QUOTA_EXCEEDED') || (error as any).code === 'QUOTA_EXCEEDED') {
        throw new HttpException(
          { success: false, error: 'quota_exceeded', message: 'Hệ thống tạo ảnh đang bận. Anh/chị vui lòng thử lại sau ít phút.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (errorMessage.startsWith('BILLING_REQUIRED')) {
        throw new HttpException(
          { success: false, error: 'service_unavailable', message: 'Tính năng tạo ảnh đang tạm thời chưa khả dụng. Anh/chị vui lòng thử lại sau.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (errorMessage.startsWith('API_KEY_INVALID')) {
        throw new HttpException(
          { success: false, error: 'service_unavailable', message: 'Dịch vụ tạo ảnh đang được bảo trì. Anh/chị vui lòng quay lại sau.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new HttpException(
        { success: false, error: 'generate_failed', message: 'Không thể tạo ảnh lúc này. Anh/chị vui lòng thử lại với ảnh khác hoặc quay lại sau.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
