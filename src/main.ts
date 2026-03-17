/**
 * Ponto de entrada da API PDS (backend NestJS).
 *
 * Ordem de carregamento: dotenv primeiro (para DATABASE_URL do Prisma),
 * depois criação do app, pipes globais, CORS e subida do servidor.
 */
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

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
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true, // permite envio de cookies/credenciais
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend running at http://localhost:${port}`);
}
bootstrap();
