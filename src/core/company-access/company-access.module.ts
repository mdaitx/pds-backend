import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyAccessService } from './company-access.service';
import { DriverAuthService } from '../driver-auth/driver-auth.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CompanyAccessService, DriverAuthService],
  exports: [CompanyAccessService, DriverAuthService],
})
export class CompanyAccessModule {}
