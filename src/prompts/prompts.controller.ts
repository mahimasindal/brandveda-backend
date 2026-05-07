import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('brands/:brandId/prompts')
@UseGuards(JwtAuthGuard)
export class PromptsController {
  constructor(private promptsService: PromptsService) {}

  @Get()
  findAll(
    @Param('brandId') brandId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.promptsService.findByBrand(
      brandId,
      (user._id as any).toString(),
    );
  }

  @Patch(':promptId')
  update(
    @Param('brandId') brandId: string,
    @Param('promptId') promptId: string,
    @Body() dto: UpdatePromptDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.promptsService.updateOne(
      promptId,
      brandId,
      (user._id as any).toString(),
      dto,
    );
  }
}
