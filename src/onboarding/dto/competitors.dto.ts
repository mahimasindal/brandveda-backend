import { IsArray, IsString, ArrayMinSize, ArrayMaxSize, MinLength } from 'class-validator';

export class CompetitorsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  competitors: string[];
}
