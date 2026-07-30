import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from './schemas/setting.schema';
import { UpdateSettingDto } from './dto/update-setting.dto';

const DEFAULT_AR_CONFIG = {
  enabled: true,
  showProductButton: true,
  aiModeEnabled: true,
  webxrEnabled: true,
  defaultPrompt: 'Phủ chất liệu sản phẩm lên giường, giữ nguyên bố cục và ánh sáng căn phòng.',
  guideTitle: 'Mẹo sử dụng',
  usageGuideText: [
    'Tải lên ảnh phòng ngủ có ánh sáng tốt',
    'Chọn màu lụa để xem trước sản phẩm',
    'AI sẽ tự động nhận diện và trải lụa lên giường',
    'Tải về hoặc sao chép ảnh để chia sẻ',
  ].join('\n'),
  retentionDays: 7,
  monthlyBudget: 0,
};

const DEFAULT_ASSISTANT_CONFIG = {
  chatbot: {
    enabled: true,
    greeting: 'Xin chào! Bạn cần tư vấn sản phẩm?',
    fallbackResponse: 'Cảm ơn bạn đã nhắn tin. Bạn có thể hỏi tôi về chất liệu, giá bán hoặc sản phẩm Silkmoon.',
    systemPrompt: 'Tư vấn ngắn gọn, chính xác và chỉ sử dụng thông tin sản phẩm Silkmoon.',
  },
  ar: DEFAULT_AR_CONFIG,
};

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>) {}

  async onModuleInit() {
    await this.settingModel.updateOne(
      { key: 'assistant_config' },
      {
        $setOnInsert: {
          key: 'assistant_config',
          value: DEFAULT_ASSISTANT_CONFIG,
          description: 'Cấu hình Chatbot và AR Studio',
        },
      },
      { upsert: true },
    ).exec();

    const setting = await this.settingModel.findOne({ key: 'assistant_config' }).lean().exec();
    const currentAr = setting?.value?.ar || {};
    const updates: Record<string, unknown> = {};
    Object.entries(DEFAULT_AR_CONFIG).forEach(([key, value]) => {
      if (key === 'usageGuideText') return;
      if (currentAr[key] === undefined) updates[`value.ar.${key}`] = value;
    });
    if (currentAr.usageGuideText === undefined) {
      updates['value.ar.usageGuideText'] = Array.isArray(currentAr.usageTips) && currentAr.usageTips.length
        ? currentAr.usageTips.join('\n')
        : DEFAULT_AR_CONFIG.usageGuideText;
    }
    if (Object.keys(updates).length) {
      await this.settingModel.updateOne(
        { key: 'assistant_config' },
        { $set: updates, $unset: { 'value.ar.usageTips': 1 } },
      ).exec();
    }
  }

  async findAll() {
    return this.settingModel.find().exec();
  }

  async findByKey(key: string) {
    return this.settingModel.findOne({ key }).exec();
  }

  async upsert(key: string, updateSettingDto: UpdateSettingDto) {
    return this.settingModel.findOneAndUpdate(
      { key },
      { $set: updateSettingDto },
      { returnDocument: 'after', upsert: true }
    ).exec();
  }
}
