# Ambientes

## Desenvolvimento local
Use o Supabase local via CLI e `.env.local`.

```bash
supabase start
supabase db reset
npm run dev
```

## Preview / staging
Recomendado para validar migrations e a aplicação antes da produção. Use um projeto Supabase separado quando possível. No Vercel, configure valores no escopo **Preview**.

## Produção
Use outro projeto Supabase e as variáveis de escopo **Production** do Vercel. Não compartilhe `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `RATE_LIMIT_SALT` ou credenciais do WhatsApp entre ambientes.

## Variáveis

| Variável | Browser? | Ambiente |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | todos |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sim | todos |
| `SUPABASE_SECRET_KEY` | Não | servidor |
| `RATE_LIMIT_SALT` | Não | servidor |
| `CRON_SECRET` | Não | servidor |
| `APP_URL` | Não | todos |
| `WHATSAPP_ACCESS_TOKEN` | Não | produção/staging |
| `WHATSAPP_PHONE_NUMBER_ID` | Não | produção/staging |
| `WHATSAPP_GRAPH_API_VERSION` | Não | produção/staging |

No Vercel, alterações em variáveis exigem um novo deploy para serem refletidas de forma consistente, especialmente as `NEXT_PUBLIC_*`, que entram no bundle durante o build.
