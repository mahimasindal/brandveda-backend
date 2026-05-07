import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsService } from './jobs.service';
import { AnalysisModule } from '../analysis/analysis.module';
import { EmailModule } from '../email/email.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AnalysisModule,
    EmailModule,
    DashboardModule,
  ],
  providers: [JobsService],
})
export class JobsModule {}
