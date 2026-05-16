import { SubscriptionPlanKey } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SubscriptionCheckoutDto {
  @IsOptional()
  @IsEnum(SubscriptionPlanKey)
  planKey?: SubscriptionPlanKey;

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
