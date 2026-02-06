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
│   ├── auth/            # Autenticação (JWT, roles, /auth/me, recover-password)
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

## Autenticação (Supabase Auth)

- **Cadastro e login:** feitos no frontend com Supabase Auth (email/senha). O backend não armazena senha.
- **GET /auth/me** – retorna o usuário atual (JWT obrigatório). Cria registro em `users` no primeiro acesso.
- **POST /auth/register-profile** – define o perfil (role: OWNER, DRIVER, ADMIN) após o primeiro login.
- **POST /auth/recover-password** – envia e-mail de recuperação de senha (body: `{ "email": "..." }`).
- **Guards:** `JwtAuthGuard` (valida JWT do Supabase) e `RolesGuard` + `@Roles()` para autorização por perfil.

No Supabase Dashboard: ative o provedor **Email** em Authentication > Providers. A tabela `public.users` (perfis) foi criada via migração e ligada ao `auth.users`.

## Docker

Build e execução com Docker:

```bash
docker build -t pds-backend .
docker run -p 4000:4000 --env-file .env pds-backend
```

## Licença

Projeto privado.
