# Ambientes

## Desenvolvimento local

Use o Supabase local via CLI e um arquivo `.env.local`.

```bash
supabase start
supabase db reset
npm run dev
```

## Preview / staging

Use Preview para validar migrations e a aplicação antes da produção. Quando possível, mantenha um projeto Supabase separado do banco de produção e configure as variáveis no escopo **Preview** da Vercel.

## Produção

Cada instalação comercial deve possuir seu próprio projeto Supabase e sua configuração de produção na Vercel. Não compartilhe chaves privadas ou salts entre clientes.

## Variáveis necessárias

| Variável | Browser? | Finalidade |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave pública do Supabase |
| `SUPABASE_SECRET_KEY` | Não | Operações exclusivas do servidor |
| `RATE_LIMIT_SALT` | Não | Proteção do rate limit |
| `CRON_SECRET` | Não | Reserva para rotinas internas protegidas |
| `APP_URL` | Não | URL pública da instalação |

Nunca exponha `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SALT` ou `CRON_SECRET` no navegador ou com prefixo `NEXT_PUBLIC_`.

Alterações nas variáveis da Vercel devem ser seguidas por um novo deploy, especialmente quando afetarem variáveis públicas utilizadas durante o build.

## Regra para novas barbearias

A arquitetura atual usa **uma instalação por barbearia**. Para um novo cliente, crie recursos separados de produção em vez de reutilizar o banco de outra barbearia. Isso evita mistura de clientes, agendas e dados administrativos.
