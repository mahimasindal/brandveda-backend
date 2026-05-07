import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class BrandInfoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
