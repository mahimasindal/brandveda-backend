import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get(':brandId')
  getDashboard(
    @Param('brandId') brandId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.dashboardService.getDashboard(
      brandId,
      (user._id as any).toString(),
    );
  }

  @Get(':brandId/history')
  getHistory(
    @Param('brandId') brandId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.dashboardService.getScoreHistory(
      brandId,
      (user._id as any).toString(),
    );
  }

  @Get(':brandId/competitors')
  getCompetitors(
    @Param('brandId') brandId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.dashboardService.getCompetitorSoV(
      brandId,
      (user._id as any).toString(),
    );
  }
}
