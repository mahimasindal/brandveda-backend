import { IsString, MinLength, MaxLength } from 'class-validator';

export class TargetDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  targetAudience: string;
}
