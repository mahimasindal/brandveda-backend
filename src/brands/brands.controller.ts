import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('brands')
@UseGuards(JwtAuthGuard)
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.brandsService.findAllByUser((user._id as any).toString());
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.brandsService.findOneByUser(id, (user._id as any).toString());
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.brandsService.update(id, (user._id as any).toString(), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.brandsService.remove(id, (user._id as any).toString());
  }
}
