import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  DigestBrandData,
  weeklyDigestHtml,
  trialExpiredHtml,
  verificationEmailHtml,
} from './templates';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(
      this.configService.get<string>('RESEND_API_KEY') || '',
    );
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@brandveda.com';
  }

  async sendVerificationEmail(
    to: string,
    fullName: string,
    verificationUrl: string,
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Verify your Brand Veda email address',
        html: verificationEmailHtml(fullName, verificationUrl),
      });
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${to}`, err);
    }
  }

  async sendWeeklyDigest(
    to: string,
    fullName: string,
    brands: DigestBrandData[],
  ): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Your Weekly Brand Visibility Report — Brand Veda',
        html: weeklyDigestHtml(fullName, brands),
      });
    } catch (err) {
      this.logger.error(`Failed to send weekly digest to ${to}`, err);
    }
  }

  async sendTrialExpired(to: string, fullName: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Your Brand Veda trial has expired',
        html: trialExpiredHtml(fullName),
      });
    } catch (err) {
      this.logger.error(`Failed to send trial expiry email to ${to}`, err);
    }
  }
}
