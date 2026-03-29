# Arquitetura do Backend PDS (NestJS + Clean Architecture)

Estrutura do projeto seguindo **Clean Architecture**, adaptada ao ecossistema NestJS com Prisma e Supabase.

## Princípios da Clean Architecture

1. **Independência de frameworks** – A lógica de negócio não depende do NestJS, Prisma ou Supabase.
2. **Testabilidade** – Casos de uso e entidades podem ser testados sem infraestrutura.
3. **Independência de UI** – A API HTTP pode ser trocada sem afetar o domínio.
4. **Independência de banco** – O Prisma pode ser substituído por outro ORM ou banco.

## Fluxo de Dependências

```
Presentation → Application → Domain
     ↓              ↓
Infrastructure ──────┘
```

- **Domain**: núcleo, sem dependências externas.
- **Application**: depende apenas do Domain.
- **Infrastructure**: implementa interfaces (portas) definidas no Domain/Application.
- **Presentation**: controllers, DTOs; depende da Application.

---

## Estrutura de Diretórios

```
src/
├── app.module.ts
├── main.ts
│
├── shared/                         # Recursos compartilhados entre módulos
│   └── domain/
│       └── auth-user.interface.ts  # Interface de usuário autenticado
│
├── common/                         # Filtros, pipes, decorators genéricos
│   └── filters/
│       └── http-exception.filter.ts
│
├── core/                           # Infraestrutura central
│   ├── prisma/
│   ├── supabase/
│   └── auth/
│
└── modules/                        # Módulos de domínio (features)
    ├── viagens/                    # Exemplo completo com Clean Architecture
    │   ├── domain/                 # Camada de Domínio
    │   │   └── ports/
    │   │       └── viagem.repository.port.ts
    │   ├── application/            # Camada de Aplicação (Use Cases)
    │   │   └── viagens.service.ts
    │   ├── infrastructure/        # Camada de Infraestrutura
    │   │   └── persistence/
    │   │       └── viagem.prisma.repository.ts
    │   ├── presentation/           # Camada de Apresentação
    │   │   ├── viagens.controller.ts
    │   │   └── dto/
    │   └── viagens.module.ts
    │
    ├── despesas/
    ├── empresas/
    ├── categorias-despesas/
    ├── veiculos/
    ├── motoristas/
    └── onboarding/
```

---

## Estrutura por Módulo (Clean Architecture)

Cada módulo de domínio segue a mesma estrutura em camadas:

```
modules/<nome>/
├── domain/                    # Núcleo – sem dependências externas
│   └── ports/
│       └── <entidade>.repository.port.ts   # Interface (porta)
│
├── application/               # Casos de uso – orquestra a lógica
│   └── <nome>.service.ts      # Depende da porta, não da implementação
│
├── infrastructure/            # Implementações concretas
│   └── persistence/
│       └── <entidade>.prisma.repository.ts
│
├── presentation/              # HTTP, DTOs, validação
│   ├── <nome>.controller.ts
│   └── dto/
│
└── <nome>.module.ts          # Wiring do NestJS
```

### Camadas

| Camada | Responsabilidade | Depende de |
|--------|------------------|------------|
| **Domain** | Entidades, interfaces (portas) | Nada |
| **Application** | Casos de uso, regras de negócio | Domain |
| **Infrastructure** | Prisma, Supabase, APIs externas | Application, Domain |
| **Presentation** | Controllers, DTOs, validação | Application |

---

## Padrão de Injeção de Dependência

O módulo usa **inversão de dependência**: o Service depende da interface (porta), não da implementação Prisma.

```typescript
// domain/ports/viagem.repository.port.ts
export interface IViagemRepository {
  findMany(user: AuthUser, status?: TripStatus): Promise<ViagemComRelacoes[]>;
  create(companyId: string, data: CriarViagemInput): Promise<ViagemComRelacoes>;
  // ...
}

// application/viagens.service.ts
@Injectable()
export class ViagensService {
  constructor(
    @Inject(VIAGEM_REPOSITORY)
    private readonly viagemRepository: IViagemRepository,
  ) {}
}

// viagens.module.ts
providers: [
  ViagensService,
  {
    provide: VIAGEM_REPOSITORY,
    useClass: ViagemPrismaRepository,
  },
],
```

---

## Módulo de Exemplo: Viagens

O módulo `viagens` está totalmente refatorado e serve de referência:

- **domain/ports/viagem.repository.port.ts**: interface `IViagemRepository` e tipos de entrada/saída.
- **application/viagens.service.ts**: casos de uso (findAll, create, update, remove) sem acesso direto ao Prisma.
- **infrastructure/persistence/viagem.prisma.repository.ts**: implementação com Prisma.
- **presentation/**: controller e DTOs.

---

## Migração dos Demais Módulos

Para migrar outros módulos (empresas, despesas, etc.) para Clean Architecture:

1. Criar `domain/ports/<entidade>.repository.port.ts` com a interface.
2. Criar `infrastructure/persistence/<entidade>.prisma.repository.ts` implementando a porta.
3. Refatorar o service para usar a porta em vez do `PrismaService` direto.
4. Mover controller e DTOs para `presentation/`.
5. Atualizar o módulo com os providers corretos.

---

## Configuração e Ordem de Imports

```typescript
// app.module.ts
imports: [
  PrismaModule,
  SupabaseModule,
  AuthModule,
  OnboardingModule,
  EmpresasModule,
  CategoriasDespesasModule,
  VeiculosModule,
  MotoristasModule,
  ViagensModule,
  DespesasModule,
],
```

---

## Resumo de Decisões

| Aspecto | Decisão |
|---------|---------|
| ORM | Prisma (tipos em `@prisma/client`) |
| Auth | Supabase Auth + JWT, guards em `core/auth` |
| DTOs | Por módulo em `presentation/dto/`, validação com `class-validator` |
| Repositórios | Interface (porta) no domain, implementação Prisma na infrastructure |
| AuthUser | Interface compartilhada em `shared/domain/auth-user.interface.ts` |
