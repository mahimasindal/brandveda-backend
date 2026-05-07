import { IsString, MinLength, MaxLength } from 'class-validator';

export class CategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category: string;
}
