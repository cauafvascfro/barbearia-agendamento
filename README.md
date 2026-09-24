# Barbearia Agendamento

Sistema web de agendamento para uma barbearia de um único profissional, construído com Next.js, TypeScript e Supabase.

## Funcionalidades

### Cliente
- Escolha de serviço, data e horário disponível
- Cadastro por nome + WhatsApp, sem conta
- Confirmação com link seguro por token
- Cancelamento e remarcação dentro da política configurada
- Estrutura opcional para confirmação e lembrete via WhatsApp Cloud API

### Proprietário
- Login protegido por Supabase Auth
- Dashboard com agenda e faturamento realizado
- Agenda diária
- Agendamento manual
- Bloqueio de horários
- Concluir, cancelar ou marcar falta
- Cadastro/edição/desativação de serviços
- Configuração de expediente e regras
- Lista de clientes e histórico

### Segurança e integridade
- RLS no Supabase
- RPCs sensíveis restritas ao backend
- Constraint PostgreSQL contra horários sobrepostos
- Rate limiting de reservas
- Auditoria administrativa
- Headers de segurança
- Tokens UUID para acesso do cliente

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase PostgreSQL + Auth + RLS
- Luxon
- Zod
- Vitest
- Playwright

## 1. Instalação

```bash
npm install
```

Crie `.env.local` com base em `.env.example`.

Variáveis essenciais:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
RATE_LIMIT_SALT
CRON_SECRET
APP_URL
```

WhatsApp é opcional:

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_GRAPH_API_VERSION
```

Nunca use `NEXT_PUBLIC_` em chaves privadas.

## 2. Banco local

Com Docker e Supabase CLI instalados:

```bash
supabase start
supabase db reset
```

O reset aplica as migrations e o `supabase/seed.sql`, que é apenas para desenvolvimento.

## 3. Rodar o projeto

```bash
npm run dev
```

Abra:

- `/agendar` — agendamento público
- `/login` — proprietário
- `/admin` — painel protegido

Para acessar o painel, crie manualmente o usuário proprietário em **Supabase > Authentication > Users**. Não habilite cadastro público de administradores.

## 4. Validação

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

O CI também reconstrói o banco local a partir das migrations.

## 5. Produção

Primeiro vincule um projeto Supabase:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Se o projeto remoto já possui tabelas criadas manualmente, reconcilie o histórico antes de aplicar migrations.

O workflow `.github/workflows/deploy-database.yml` está propositalmente em **execução manual**. Ative-o somente depois de cadastrar os secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

Depois conecte este repositório ao Vercel e configure as variáveis de ambiente separadamente para Preview e Production.

Consulte:

- `docs/ENVIRONMENTS.md`
- `docs/PRODUCTION_CHECKLIST.md`

## Estrutura principal

```text
app/
  admin/
  agendar/
  agendamento/[token]/
  api/
components/
lib/
supabase/
  migrations/
  seed.sql
tests/
```

## Observação

O faturamento mostrado no dashboard considera apenas agendamentos com status `CONCLUIDO`; reservas confirmadas, canceladas ou faltas não são tratadas como receita realizada.


<!-- Vercel deployment sync: 2026-09-24 -->
