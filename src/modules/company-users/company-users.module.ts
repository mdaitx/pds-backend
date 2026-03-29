import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { AuthModule } from '../../core/auth/auth.module';
import { CompanyUsersController } from './company-users.controller';
import { CompanyUsersService } from './company-users.service';

@Module({
  imports: [PrismaModule, SupabaseModule, AuthModule],
  controllers: [CompanyUsersController],
  providers: [CompanyUsersService],
})
export class CompanyUsersModule {}
