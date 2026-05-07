import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  competitors?: string[];

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  targetAudience?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
