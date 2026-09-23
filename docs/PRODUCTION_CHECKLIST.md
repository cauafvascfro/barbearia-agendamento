# Checklist de produção

## Banco
- [ ] Criar um projeto Supabase exclusivo de produção.
- [ ] Confirmar a versão do PostgreSQL remoto e ajustar `supabase/config.toml` se necessário.
- [ ] Rodar `supabase db reset` localmente sem erros.
- [ ] Rodar `supabase db push --dry-run` antes do primeiro deploy.
- [ ] Aplicar migrations com `supabase db push` ou GitHub Actions.
- [ ] Não usar `--include-seed` em produção.
- [ ] Criar o usuário administrador manualmente em Authentication > Users.
- [ ] Revisar RLS e o Security Advisor.
- [ ] Revisar índices e o Performance Advisor após haver dados reais.

## Aplicação
- [ ] Usar Next.js 16.3.6 ou patch de segurança posterior compatível.
- [ ] `npm run typecheck` sem erros.
- [ ] `npm test` sem falhas.
- [ ] `npm run build` concluído.
- [ ] `npm run test:e2e` contra staging/preview.
- [ ] Confirmar que `/admin` redireciona para `/login` sem sessão.
- [ ] Confirmar que chaves `sb_secret_...` nunca aparecem em bundle/browser.

## Vercel
- [ ] Conectar o repositório GitHub.
- [ ] Adicionar variáveis Production e Preview separadamente.
- [ ] Fazer primeiro deploy Preview e executar E2E nele.
- [ ] Fazer merge em `main` somente após validação.
- [ ] Configurar domínio final.
- [ ] Atualizar `APP_URL` para o domínio final e redeployar.

## WhatsApp
- [ ] Manter `whatsapp_ativo=false` até templates e credenciais estarem válidos.
- [ ] Criar/aprovar templates `confirmacao_agendamento` e `lembrete_agendamento`.
- [ ] Definir `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e versão da Graph API.
- [ ] Testar falha do WhatsApp e confirmar que a reserva continua criada.

## Testes de aceite
- [ ] Agendar horário livre.
- [ ] Tentar duas reservas simultâneas para o mesmo horário: somente uma deve vencer.
- [ ] Tentar enviar horário desalinhado, como 08:17: deve falhar.
- [ ] Serviço de 60 min não deve atravessar almoço/fechamento.
- [ ] Bloqueio deve remover horário da disponibilidade.
- [ ] Cancelamento dentro do prazo deve liberar a agenda.
- [ ] Cancelamento fora do prazo deve ser rejeitado.
- [ ] Remarcação deve liberar o horário antigo e ocupar o novo.
- [ ] Serviço inativo não deve aparecer publicamente.
- [ ] Rate limit deve devolver HTTP 429 após abuso.
