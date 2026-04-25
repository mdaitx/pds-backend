import { IsOptional, IsString } from 'class-validator';

export class SubscriptionCheckoutDto {
  @IsOptional()
  @IsString()
  successPath?: string;

  @IsOptional()
  @IsString()
  cancelPath?: string;
}

export class SubscriptionPortalDto {
  @IsOptional()
  @IsString()
  returnPath?: string;
}
