import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { BrandInfoDto } from './dto/brand-info.dto';
import { CategoryDto } from './dto/category.dto';
import { CompetitorsDto } from './dto/competitors.dto';
import { TargetDto } from './dto/target.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get('status')
  getStatus(@CurrentUser() user: UserDocument) {
    return this.onboardingService.getStatus((user._id as any).toString());
  }

  @Post('step/brand-info')
  @HttpCode(HttpStatus.OK)
  stepBrandInfo(@Body() dto: BrandInfoDto, @CurrentUser() user: UserDocument) {
    return this.onboardingService.stepBrandInfo(
      (user._id as any).toString(),
      dto.name,
      dto.website,
      dto.description,
    );
  }

  @Post('step/category')
  @HttpCode(HttpStatus.OK)
  stepCategory(@Body() dto: CategoryDto, @CurrentUser() user: UserDocument) {
    return this.onboardingService.stepCategory(
      (user._id as any).toString(),
      dto.category,
    );
  }

  @Post('step/competitors')
  @HttpCode(HttpStatus.OK)
  stepCompetitors(
    @Body() dto: CompetitorsDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.onboardingService.stepCompetitors(
      (user._id as any).toString(),
      dto.competitors,
    );
  }

  @Post('step/target')
  @HttpCode(HttpStatus.OK)
  stepTarget(@Body() dto: TargetDto, @CurrentUser() user: UserDocument) {
    return this.onboardingService.stepTarget(
      (user._id as any).toString(),
      dto.targetAudience,
    );
  }

  @Post('step/confirm')
  @HttpCode(HttpStatus.OK)
  stepConfirm(@CurrentUser() user: UserDocument) {
    return this.onboardingService.stepConfirm((user._id as any).toString());
  }
}
