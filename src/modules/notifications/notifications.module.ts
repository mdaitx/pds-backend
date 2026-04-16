import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { MailModule } from '../../core/mail/mail.module';
import { NotificationEventsService } from './notification-events.service';

/** Registrado uma vez no AppModule; expõe e-mails de evento (viagem/despesa/acerto) ao restante da API. */
@Global()
@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificationEventsService],
  exports: [NotificationEventsService],
})
export class NotificationsModule {}
