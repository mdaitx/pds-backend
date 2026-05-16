import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import { SubscriptionService } from './subscription.service';
import { SubscriptionCheckoutDto, SubscriptionPortalDto } from './dto/subscription-checkout.dto';

/**
 * Assinatura: status, Stripe Checkout/Portal, webhook.
 * Apenas dono (OWNER) inicia pagamento; webhook é público (validação por assinatura Stripe).
 */
@ApiTags('Assinatura')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscription: SubscriptionService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  @Get('status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async getStatus(@CurrentUser() user: AuthUser) {
    const companyId = await this.companyAccess.resolveCompanyId(user);
    return this.subscription.getStatusForOwner(companyId);
  }

  @Post('checkout')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async createCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscriptionCheckoutDto,
  ) {
    const companyId = await this.companyAccess.resolveCompanyId(user);
    return this.subscription.createCheckoutSession({
      companyId,
      userEmail: user.email,
      planKey: dto.planKey,
      successPath: dto.successPath,
      cancelPath: dto.cancelPath,
    });
  }

  @Post('portal')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async createPortal(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscriptionPortalDto,
  ) {
    const companyId = await this.companyAccess.resolveCompanyId(user);
    return this.subscription.createBillingPortalSession(companyId, dto.returnPath);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    const signature = req.headers['stripe-signature'];
    const raw = req.rawBody;
    if (!raw) {
      throw new BadRequestException('rawBody ausente: inicie o Nest com { rawBody: true } em main.ts');
    }
    await this.subscription.processStripeWebhook(
      raw,
      typeof signature === 'string' ? signature : Array.isArray(signature) ? signature[0] : undefined,
    );
    return { received: true };
  }
}
