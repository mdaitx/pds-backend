/**
 * Ponto de entrada da API PDS (backend NestJS).
 *
 * Ordem de carregamento: dotenv primeiro (para DATABASE_URL do Prisma),
 * depois criação do app, pipes globais, CORS e subida do servidor.
 */
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RouteTimingInterceptor } from './common/interceptors/route-timing.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(compression());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RouteTimingInterceptor());

  // Validação global: remove campos não declarados nos DTOs (segurança) e
  // rejeita requisições com propriedades extras (evita injeção de dados).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove automaticamente propriedades não existentes no DTO
      forbidNonWhitelisted: true, // retorna 400 se vier campo extra
      transform: true, // converte query/body para os tipos do DTO (ex: string -> number)
    }),
  );

  // CORS: define quais origens podem chamar a API (evita requisições de outros domínios).
  // Em produção, defina CORS_ORIGIN com as URLs do frontend (ex: https://app.pds.com).
  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ??
    ['http://localhost:3000', 'http://localhost:3001'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true, // permite envio de cookies/credenciais
  });

  const isProd = process.env.NODE_ENV === 'production';
  const swaggerEnabled = !isProd || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('PDS API')
      .setDescription(
        'API REST do PDS. Rotas protegidas exigem `Authorization: Bearer <token JWT do Supabase>`.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token emitido pelo Supabase',
        },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT ?? 4001;
  await app.listen(port);
  console.log(`Backend running at http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(`Swagger UI: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
