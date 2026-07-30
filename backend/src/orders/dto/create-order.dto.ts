import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsIn,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  colorId?: string;

  @IsOptional()
  @IsString()
  colorLabel?: string;

  @IsOptional()
  @IsString()
  sizeId?: string;

  @IsOptional()
  @IsString()
  sizeLabel?: string;

  @IsOptional()
  @IsArray()
  sizeMeasurements?: Array<{ id?: string; label: string; value?: number; unit?: string }>;

  @IsOptional()
  customSize?: { width?: number; length?: number; height?: number };

  @IsOptional()
  @IsArray()
  customMeasurements?: Array<{ id?: string; label: string; value?: number; unit?: string }>;

  @IsOptional()
  @IsString()
  embroidery?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  addressDetail?: string;

  @IsOptional()
  @IsInt()
  provinceCode?: number;

  @IsOptional()
  @IsString()
  provinceName?: string;

  @IsOptional()
  @IsInt()
  wardCode?: number;

  @IsOptional()
  @IsString()
  wardName?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsIn(['payos', 'cod'])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  promoCode?: string | null;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
