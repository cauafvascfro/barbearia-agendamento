# Checklist de implantação comercial

Use este checklist para cada nova instalação antes de entregar o sistema ao proprietário.

## 1. Banco e segurança

- [ ] Criar um projeto Supabase exclusivo para a barbearia.
- [ ] Executar o banco local com `supabase db reset` sem erros.
- [ ] Validar as migrations com `supabase db push --dry-run`.
- [ ] Aplicar todas as migrations em produção sem incluir o seed de desenvolvimento.
- [ ] Criar manualmente somente o usuário administrador autorizado.
- [ ] Manter cadastro público de usuários desabilitado; clientes não precisam de conta.
- [ ] Revisar RLS e o Security Advisor.
- [ ] Não compartilhar banco, chaves privadas ou credenciais entre barbearias.

## 2. Aplicação e deploy

- [ ] Instalar dependências e executar `npm run typecheck`.
- [ ] Executar `npm test`.
- [ ] Executar `npm run build`.
- [ ] Executar os testes E2E.
- [ ] Conectar o repositório correto à Vercel.
- [ ] Configurar as variáveis de ambiente da instalação.
- [ ] Confirmar que `/admin` sem sessão redireciona para `/login`.
- [ ] Configurar o domínio final, quando houver.
- [ ] Atualizar `APP_URL` para o endereço final e realizar novo deploy.

## 3. Configuração pelo painel

- [ ] Informar nome, telefone e endereço da barbearia.
- [ ] Cadastrar serviços, preços e durações.
- [ ] Configurar expediente semanal ou aberturas especiais.
- [ ] Revisar antecedência mínima e máxima.
- [ ] Revisar política de cancelamento.
- [ ] Confirmar no dashboard se a agenda pública está online.

## 4. Testes de aceite

- [ ] Criar um agendamento público em horário livre.
- [ ] Confirmar que o agendamento aparece na agenda administrativa.
- [ ] Concluir o atendimento e conferir dashboard, cliente e relatório.
- [ ] Cancelar um teste e confirmar a liberação do horário.
- [ ] Remarcar um teste e confirmar a troca do horário.
- [ ] Criar um bloqueio e confirmar que o período deixa de ser oferecido.
- [ ] Confirmar que um serviço inativo não aparece publicamente.
- [ ] Pausar a agenda pública e confirmar que a página deixa de oferecer reservas.
- [ ] Confirmar que a API também rejeita novas reservas enquanto a agenda pública está pausada.
- [ ] Confirmar que o proprietário ainda consegue criar agendamentos manuais com a agenda pública pausada.
- [ ] Tentar duas reservas concorrentes no mesmo horário; somente uma pode ser criada.
- [ ] Confirmar que um serviço longo não atravessa almoço ou fechamento.

## 5. Entrega e operação

- [ ] Reativar a agenda pública depois da homologação.
- [ ] Entregar URL pública e acesso administrativo ao proprietário por canais adequados.
- [ ] Registrar qual repositório, projeto Supabase e projeto Vercel pertencem à instalação.
- [ ] Registrar domínio e responsável administrativo.
- [ ] Definir um procedimento de backup e recuperação antes do uso contínuo.
- [ ] Guardar segredos somente nos gerenciadores de ambiente; nunca no repositório.

A instalação só deve ser considerada pronta para divulgação depois que os testes de aceite essenciais forem concluídos.
