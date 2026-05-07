import { IsUrl } from 'class-validator';

export class CreatePortalDto {
  @IsUrl({ require_protocol: true })
  returnUrl: string;
}
