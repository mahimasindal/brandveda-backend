import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
    );
  }

  async getSubscription(userId: string) {
    return this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  }

  async createCheckoutSession(
    userId: string,
    plan: 'starter' | 'pro',
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const priceIdKey =
      plan === 'starter' ? 'STRIPE_STARTER_PRICE_ID' : 'STRIPE_PRO_PRICE_ID';
    const priceId = this.configService.get<string>(priceIdKey);
    if (!priceId) {
      throw new BadRequestException(`Price ID for ${plan} is not configured`);
    }

    // Get or create Stripe customer
    let customerId: string | undefined;
    const existing = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (existing?.stripeCustomerId) {
      customerId = existing.stripeCustomerId;
    } else {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, plan },
    });

    return { url: session.url! };
  }

  async createPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    const sub = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!sub?.stripeCustomerId) {
      throw new NotFoundException('No active subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    const webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(err as Error).message}`,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'starter' | 'pro';
    if (!userId || !plan) return;

    const stripeSub = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    await this.subscriptionModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSub.id,
          plan,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(
            (stripeSub.items.data[0]?.current_period_start ?? 0) * 1000,
          ),
          currentPeriodEnd: new Date(
            (stripeSub.items.data[0]?.current_period_end ?? 0) * 1000,
          ),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      },
      { upsert: true, new: true },
    );

    // Update user plan
    await this.updateUserPlan(userId, plan);
  }

  private async handleSubscriptionUpdated(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const sub = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSub.id,
    });
    if (!sub) return;

    const plan = this.getPlanFromPriceId(stripeSub);

    await this.subscriptionModel.updateOne(
      { _id: sub._id },
      {
        $set: {
          plan,
          status: stripeSub.status as SubscriptionStatus,
          currentPeriodStart: new Date(
            (stripeSub.items.data[0]?.current_period_start ?? 0) * 1000,
          ),
          currentPeriodEnd: new Date(
            (stripeSub.items.data[0]?.current_period_end ?? 0) * 1000,
          ),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      },
    );

    if (stripeSub.status === 'active') {
      await this.updateUserPlan(sub.userId.toString(), plan);
    }
  }

  private async handleSubscriptionDeleted(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const sub = await this.subscriptionModel.findOne({
      stripeSubscriptionId: stripeSub.id,
    });
    if (!sub) return;

    await this.subscriptionModel.updateOne(
      { _id: sub._id },
      { $set: { status: SubscriptionStatus.CANCELED } },
    );

    // Revert user to canceled plan (access blocked for new runs)
    await this.updateUserPlan(sub.userId.toString(), 'canceled' as any);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const sub = invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof sub === 'string' ? sub : (sub as Stripe.Subscription)?.id;
    if (!subscriptionId) return;

    await this.subscriptionModel.updateOne(
      { stripeSubscriptionId: subscriptionId },
      { $set: { status: SubscriptionStatus.PAST_DUE } },
    );
  }

  private getPlanFromPriceId(stripeSub: Stripe.Subscription): 'starter' | 'pro' {
    const priceId = stripeSub.items.data[0]?.price?.id;
    const proPriceId = this.configService.get<string>('STRIPE_PRO_PRICE_ID');
    return priceId === proPriceId ? 'pro' : 'starter';
  }

  private async updateUserPlan(
    userId: string,
    plan: 'starter' | 'pro' | 'canceled',
  ): Promise<void> {
    // We update directly via UsersService — plan is a top-level field
    const user = await this.usersService.findById(userId);
    if (!user) return;
    (user as any).plan = plan;
    await (user as any).save();
  }
}
