import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BrandsService } from '../brands/brands.service';
import { PromptsService } from '../prompts/prompts.service';
import { AnalysisService } from '../analysis/analysis.service';
import { TriggerType } from '../analysis/schemas/analysis-run.schema';
import type { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class OnboardingService {
  constructor(
    private usersService: UsersService,
    private brandsService: BrandsService,
    private promptsService: PromptsService,
    private analysisService: AnalysisService,
  ) {}

  async getStatus(userId: string) {
    const user = await this.getUser(userId);
    const { completed, currentStep, activeBrandId } = user.onboarding;
    return {
      completed,
      currentStep,
      brandId: activeBrandId?.toString() ?? null,
    };
  }

  async stepBrandInfo(
    userId: string,
    name: string,
    website?: string,
    description?: string,
  ) {
    const user = await this.getUser(userId);
    let brandId: string;

    if (user.onboarding.activeBrandId) {
      brandId = user.onboarding.activeBrandId.toString();
      await this.brandsService.update(brandId, userId, {
        name,
        website,
        description,
      });
    } else {
      const brand = await this.brandsService.create(userId, {
        name,
        website,
        description,
      });
      brandId = (brand._id as any).toString();
      await this.usersService.updateOnboarding(userId, {
        activeBrandId: brand._id,
      });
    }

    await this.usersService.updateOnboarding(userId, { currentStep: 1 });
    return { step: 1, brandId };
  }

  async stepCategory(userId: string, category: string) {
    const user = await this.getUser(userId);
    this.assertMinStep(user.onboarding.currentStep, 1);
    this.assertActiveBrand(user);

    await this.brandsService.update(
      user.onboarding.activeBrandId!.toString(),
      userId,
      { category },
    );
    await this.usersService.updateOnboarding(userId, { currentStep: 2 });
    return { step: 2 };
  }

  async stepCompetitors(userId: string, competitors: string[]) {
    const user = await this.getUser(userId);
    this.assertMinStep(user.onboarding.currentStep, 2);
    this.assertActiveBrand(user);

    await this.brandsService.update(
      user.onboarding.activeBrandId!.toString(),
      userId,
      { competitors },
    );
    await this.usersService.updateOnboarding(userId, { currentStep: 3 });
    return { step: 3 };
  }

  async stepTarget(userId: string, targetAudience: string) {
    const user = await this.getUser(userId);
    this.assertMinStep(user.onboarding.currentStep, 3);
    this.assertActiveBrand(user);

    await this.brandsService.update(
      user.onboarding.activeBrandId!.toString(),
      userId,
      { targetAudience },
    );
    await this.usersService.updateOnboarding(userId, { currentStep: 4 });
    return { step: 4 };
  }

  async stepConfirm(userId: string) {
    const user = await this.getUser(userId);

    // Idempotent: if already confirmed, return existing prompts
    if (user.onboarding.completed && user.onboarding.activeBrandId) {
      const brandId = user.onboarding.activeBrandId.toString();
      const existing = await this.promptsService.findByBrand(brandId, userId);
      if (existing.length > 0) {
        return { brandId, prompts: existing };
      }
    }

    this.assertMinStep(user.onboarding.currentStep, 4);
    this.assertActiveBrand(user);

    const brandId = user.onboarding.activeBrandId!.toString();
    const brand = await this.brandsService.findOneByUser(brandId, userId);

    if (
      !brand.category ||
      !brand.targetAudience ||
      brand.competitors.length === 0
    ) {
      throw new BadRequestException(
        'Brand setup is incomplete. Please complete all steps first.',
      );
    }

    const prompts = await this.promptsService.generateForBrand(
      brandId,
      userId,
      brand.name,
      brand.category,
      brand.competitors,
      brand.targetAudience,
    );

    // Kick off first analysis run
    const run = await this.analysisService.createRun(
      brandId,
      userId,
      TriggerType.MANUAL,
    );

    await this.usersService.updateOnboarding(userId, {
      currentStep: 5,
      completed: true,
    });

    return { brandId, prompts, analysisRunId: (run._id as any).toString() };
  }

  private async getUser(userId: string): Promise<UserDocument> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private assertMinStep(currentStep: number, required: number) {
    if (currentStep < required) {
      throw new BadRequestException(
        `Please complete step ${required} before proceeding.`,
      );
    }
  }

  private assertActiveBrand(user: UserDocument) {
    if (!user.onboarding.activeBrandId) {
      throw new BadRequestException(
        'Please complete step 1 (brand info) first.',
      );
    }
  }
}
