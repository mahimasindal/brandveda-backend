import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('analysis')
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private analysisService: AnalysisService) {}

  @Post('run/:brandId')
  @HttpCode(HttpStatus.CREATED)
  createRun(
    @Param('brandId') brandId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisService.createRun(
      brandId,
      (user._id as any).toString(),
    );
  }

  @Get('runs/:brandId')
  findRuns(
    @Param('brandId') brandId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisService.findRunsByBrand(
      brandId,
      (user._id as any).toString(),
    );
  }

  @Get('runs/:brandId/latest')
  findLatest(
    @Param('brandId') brandId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisService.findLatestRun(
      brandId,
      (user._id as any).toString(),
    );
  }
}
