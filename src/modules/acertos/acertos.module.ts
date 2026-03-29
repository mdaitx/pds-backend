import { Module } from '@nestjs/common';
import { AcertosController } from './acertos.controller';
import { AcertosService } from './acertos.service';
import { AuthModule } from '../../core/auth/auth.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [AcertosController],
  providers: [AcertosService],
  exports: [AcertosService],
})
export class AcertosModule {}