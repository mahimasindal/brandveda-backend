import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(
    email: string,
    passwordHash: string,
    fullName: string,
  ): Promise<UserDocument> {
    const existing = await this.userModel.findOne({
      email: email.toLowerCase(),
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    return this.userModel.create({ email, passwordHash, fullName, trialEndsAt });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ emailVerificationToken: token });
  }

  async setVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { emailVerificationToken: token, emailVerificationTokenExpiresAt: expiresAt } },
    );
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { emailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiresAt: null } },
    );
  }

  async updateOnboarding(
    userId: string,
    data: Partial<{
      completed: boolean;
      currentStep: number;
      activeBrandId: any;
    }>,
  ): Promise<void> {
    const update: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        update[`onboarding.${key}`] = value;
      }
    }
    await this.userModel.updateOne({ _id: userId }, { $set: update });
  }
}
