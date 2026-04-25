import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RouteTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RouteTimingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        if (elapsedMs >= 250) {
          this.logger.warn(`${request.method} ${request.originalUrl} ${elapsedMs.toFixed(1)}ms`);
          return;
        }
        this.logger.debug(`${request.method} ${request.originalUrl} ${elapsedMs.toFixed(1)}ms`);
      }),
    );
  }
}
