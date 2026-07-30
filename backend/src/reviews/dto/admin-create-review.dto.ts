import { IsBoolean, IsOptional } from 'class-validator';
import { CreateReviewDto } from './create-review.dto';

export class AdminCreateReviewDto extends CreateReviewDto {
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
