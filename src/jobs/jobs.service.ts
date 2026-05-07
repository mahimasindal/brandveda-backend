import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalysisService } from '../analysis/analysis.service';
import { EmailService } from '../email/email.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private analysisService: AnalysisService,
    private emailService: EmailService,
    private dashboardService: DashboardService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ─── Analysis job processor ──────────────────────────────────────────────
  @Cron('* * * * *') // every minute
  async processPendingJobs() {
    try {
      await this.analysisService.processPendingJob();
    } catch (err) {
      this.logger.error('CRON job processor failed', (err as Error).message);
    }
  }

  // ─── Weekly digest — runs every hour, sends to users where it's Mon 9AM ──
  @Cron('0 * * * *') // top of every hour
  async sendWeeklyDigests() {
    const eligibleUsers = await this.userModel.find({
      plan: { $in: ['starter', 'pro'] },
    });

    for (const user of eligibleUsers) {
      if (!this.isMonday9AM(user.timezone ?? 'UTC')) continue;

      try {
        const digestData = await this.dashboardService.getDigestDataForUser(
          (user._id as any).toString(),
        );
        if (digestData.length === 0) continue;

        await this.emailService.sendWeeklyDigest(
          user.email,
          user.fullName,
          digestData as any,
        );
        this.logger.log(`Weekly digest sent to ${user.email}`);
      } catch (err) {
        this.logger.error(
          `Failed to send digest to ${user.email}`,
          (err as Error).message,
        );
      }
    }
  }

  // ─── Trial expiry — runs daily at midnight UTC ────────────────────────────
  @Cron('0 0 * * *') // midnight UTC daily
  async handleTrialExpiry() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find users whose trial ended in the last 24 hours
    const expiredUsers = await this.userModel.find({
      plan: 'trial',
      trialEndsAt: { $gte: yesterday, $lte: now },
    });

    for (const user of expiredUsers) {
      try {
        await this.emailService.sendTrialExpired(user.email, user.fullName);
        this.logger.log(`Trial expiry email sent to ${user.email}`);
      } catch (err) {
        this.logger.error(
          `Failed to send trial expiry email to ${user.email}`,
          (err as Error).message,
        );
      }
    }
  }

  // Returns true if current UTC time corresponds to Monday 9:00–9:59 AM in the given timezone
  private isMonday9AM(timezone: string): boolean {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        hour: 'numeric',
        hour12: false,
      }).formatToParts(now);

      const weekday = parts.find((p) => p.type === 'weekday')?.value;
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
      return weekday === 'Monday' && hour === 9;
    } catch {
      return false; // Invalid timezone — skip
    }
  }
}
