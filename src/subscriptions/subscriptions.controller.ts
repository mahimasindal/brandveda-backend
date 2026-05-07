import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreatePortalDto } from './dto/create-portal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getSubscription(@CurrentUser() user: UserDocument) {
    return this.subscriptionsService.getSubscription(
      (user._id as any).toString(),
    );
  }

  @Post('create-checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.subscriptionsService.createCheckoutSession(
      (user._id as any).toString(),
      dto.plan,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  createPortal(
    @Body() dto: CreatePortalDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.subscriptionsService.createPortalSession(
      (user._id as any).toString(),
      dto.returnUrl,
    );
  }

  // No JWT guard — verified by Stripe signature
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.subscriptionsService.handleWebhook(signature, req.rawBody!);
  }
}
