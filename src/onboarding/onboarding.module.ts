import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { UsersModule } from '../users/users.module';
import { BrandsModule } from '../brands/brands.module';
import { PromptsModule } from '../prompts/prompts.module';
import { AnalysisModule } from '../analysis/analysis.module';

@Module({
  imports: [UsersModule, BrandsModule, PromptsModule, AnalysisModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
