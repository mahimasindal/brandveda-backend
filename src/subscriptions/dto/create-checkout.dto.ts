import { IsIn, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @IsIn(['starter', 'pro'])
  plan: 'starter' | 'pro';

  @IsUrl({ require_protocol: true })
  successUrl: string;

  @IsUrl({ require_protocol: true })
  cancelUrl: string;
}
