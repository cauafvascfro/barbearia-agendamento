# Barbearia Agendamento — kit de produção

Pacote preparado para converter o MVP discutido em uma base versionada de banco, segurança, testes e deploy.

## Conteúdo

- `supabase/migrations/` — schema, RLS, funções transacionais, notificações, rate limiting e auditoria.
- `supabase/seed.sql` — somente desenvolvimento/teste.
- `.env.example` — contrato de variáveis sem segredos reais.
- `.github/workflows/` — CI e deploy de migrations para produção.
- `vitest.config.ts` e teste unitário de intervalos.
- `playwright.config.ts` e smoke tests E2E.
- `docs/` — checklist e estratégia de ambientes.

## 1. Integrar ao projeto Next.js existente

Copie estas pastas/arquivos para a raiz do projeto de agendamento. Não substitua seu `package.json`; use `package.production-kit.json` como referência e instale:

```bash
npm install @supabase/ssr @supabase/supabase-js luxon zod
npm install -D @playwright/test @types/luxon vitest
npx playwright install chromium
```

Use Next.js **16.3.6 ou patch posterior compatível**, pois 16.3.6 é o Active LTS com o patch de segurança publicado em 22/09/2026.

Adicione ao `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  }
}
```

## 2. Desenvolvimento local

Instale a Supabase CLI e, na raiz:

```bash
supabase start
supabase db reset
```

A pasta já inclui `supabase/config.toml`. Se seu projeto remoto usa uma versão PostgreSQL diferente de 15, ajuste `db.major_version` para coincidir com o remoto.

Crie `.env.local` a partir de `.env.example`.

## 3. Primeiro vínculo com um projeto Supabase remoto

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Se você **já criou tabelas manualmente no projeto remoto**, não rode `db push` cegamente. Primeiro use `supabase db pull` para reconciliar o histórico e revise o diff.

A partir do momento em que migrations entrarem em uso, não altere o schema de produção diretamente pelo SQL/Table Editor.

## 4. Seed

Local:

```bash
supabase db reset
```

O reset aplica migrations e seed. Em produção, **não** use `supabase db push --include-seed`.

## 5. GitHub Actions para migrations

Cadastre secrets no repositório:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

`deploy-database.yml` roda apenas quando migrations/config mudam em `main`. Ele executa `db push --dry-run` e depois `db push`.

## 6. Vercel

Conecte o repositório ao Vercel e crie variáveis separadas para Preview e Production. O Vercel suporta escopos independentes; mantenha chaves de produção fora de Preview.

Variáveis obrigatórias no servidor:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
RATE_LIMIT_SALT
CRON_SECRET
APP_URL
```

WhatsApp é opcional até a integração ser ativada.

Depois de configurar as variáveis, faça um novo deploy.

## 7. Sequência de validação antes do go-live

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Em seguida execute manualmente os cenários de `docs/PRODUCTION_CHECKLIST.md`.

## 8. Observação sobre o código da aplicação

Este pacote contém a infraestrutura de produção e testes. Os arquivos de interface/API que montamos ao longo da conversa devem permanecer no projeto Next.js principal. Se o projeto ainda não existe em arquivos locais, use este kit como base de banco/deploy e adicione os módulos `app/`, `components/` e `lib/` já definidos na implementação.
