import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdatePromptDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  text: string;
}
