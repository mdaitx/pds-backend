# PDS Backend

API do projeto PDS, construída com **NestJS**, **Prisma** e **Supabase** (PostgreSQL, Auth e Storage).

## Requisitos

- Node.js 18+
- npm ou yarn
- Conta no [Supabase](https://supabase.com) (banco e API)

## Instalação

```bash
npm install
```

## Configuração

1. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

2. Edite o `.env` com os valores do seu projeto.

3. Gere o Prisma Client e rode as migrações:

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run start:dev` | Desenvolvimento (watch) |
| `npm run build` | Compila o projeto |
| `npm run start:prod` | Produção (após `build`) |

## Estrutura principal

```
pds-backend/
├── prisma/
│   └── schema.prisma    # Modelos e migrações
├── src/
│   ├── main.ts          # Bootstrap da aplicação
│   ├── app.module.ts
│   ├── prisma/          # Módulo e serviço Prisma
│   └── supabase/        # Módulo e serviço Supabase
├── .env.example
├── Dockerfile
└── railway.json         # Deploy Railway
```

## Tecnologias

- **NestJS** – framework Node.js
- **Prisma** – ORM e migrações (PostgreSQL)
- **Supabase** – banco (PostgreSQL), Auth e Storage
- **class-validator / class-transformer** – validação e transformação de DTOs

A API usa `ValidationPipe` global (whitelist, forbidNonWhitelisted, transform) e CORS configurável via `CORS_ORIGIN`.

## Docker

Build e execução com Docker:

```bash
docker build -t pds-backend .
docker run -p 4000:4000 --env-file .env pds-backend
```

## Licença

Projeto privado.
