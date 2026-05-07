import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { PromptsModule } from './prompts/prompts.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AnalysisModule } from './analysis/analysis.module';
import { JobsModule } from './jobs/jobs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    BrandsModule,
    PromptsModule,
    OnboardingModule,
    AnalysisModule,
    JobsModule,
    DashboardModule,
    SubscriptionsModule,
    EmailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
