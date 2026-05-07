import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async signup(email: string, password: string, fullName: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create(email, passwordHash, fullName);
    await this.sendVerificationEmail(user);
    return { message: 'Account created. Please check your email to verify your account.' };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Block login if email not verified (only for accounts created after verification was introduced)
    if (user.emailVerified === false) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }
    return this.generateTokens(user);
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification link.');
    }
    if (
      user.emailVerificationTokenExpiresAt &&
      user.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('This verification link has expired. Please request a new one.');
    }
    await this.usersService.markEmailVerified((user._id as any).toString());
    return { message: 'Email verified successfully. You can now sign in.' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Always return success to avoid user enumeration
    if (!user || user.emailVerified !== false) {
      return { message: 'If that email exists and is unverified, a new link has been sent.' };
    }
    await this.sendVerificationEmail(user);
    return { message: 'If that email exists and is unverified, a new link has been sent.' };
  }

  private async sendVerificationEmail(user: UserDocument) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.usersService.setVerificationToken(
      (user._id as any).toString(),
      token,
      expiresAt,
    );
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    await this.emailService.sendVerificationEmail(user.email, user.fullName, verificationUrl);
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const stored = await this.refreshTokenModel.findOne({
      jti: payload.jti,
      isRevoked: false,
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Rotate: revoke old, issue new
    await this.refreshTokenModel.updateOne(
      { _id: stored._id },
      { isRevoked: true },
    );

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    try {
      const payload: any = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.refreshTokenModel.updateOne(
        { jti: payload.jti },
        { isRevoked: true },
      );
    } catch {
      // If token is invalid we still return success (idempotent logout)
    }
  }

  private async generateTokens(user: UserDocument) {
    const userId = (user._id as any).toString();
    const jti = crypto.randomUUID();

    const accessToken = this.jwtService.sign(
      { sub: userId, type: 'access' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        )) as any,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, jti, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        )) as any,
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({ userId: user._id, jti, expiresAt });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
        onboarding: user.onboarding,
      },
    };
  }
}
