import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { MailModule } from '../../core/mail/mail.module';
import { NotificationEventsService } from './notification-events.service';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificationEventsService],
  exports: [NotificationEventsService],
})
export class NotificationsModule {}
