import { Module } from '@nestjs/common';
import { ViagensController } from './viagens.controller';
import { ViagensService } from './viagens.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ViagensController],
  providers: [ViagensService],
  exports: [ViagensService],
})
export class ViagensModule {}
