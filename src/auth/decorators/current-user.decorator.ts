import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AUTH_USER_KEY } from '../guards/jwt-auth.guard';
import { AuthUser } from '../auth.service';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | unknown => {
    const user = ctx.switchToHttp().getRequest()[AUTH_USER_KEY];
    return data ? user?.[data] : user;
  },
);
