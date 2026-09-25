# Backup e recuperação

Este documento define o procedimento mínimo de proteção de dados para cada instalação comercial.

## Estratégia atual

Cada barbearia usa um projeto Supabase próprio. O repositório Git contém o código e as migrations; os dados operacionais ficam no banco da instalação.

No plano Free do Supabase, não dependa de backup diário gerenciado. A documentação oficial recomenda exportações regulares com a CLI. Antes de colocar uma instalação em operação contínua, defina quem executa o backup, onde ele será guardado e por quanto tempo.

## Backup lógico

Use uma máquina administrativa segura com Supabase CLI e Docker. Obtenha a connection string diretamente no painel do projeto e não salve a senha no repositório.

Crie uma pasta identificada pela instalação e pela data e exporte separadamente:

```bash
supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql --use-copy --data-only
```

Nunca versione esses arquivos no Git. Eles podem conter dados pessoais de clientes e informações operacionais.

## Frequência sugerida para o MVP

Enquanto a instalação estiver no plano Free, faça backup lógico pelo menos semanalmente e também imediatamente antes de migrations ou alterações estruturais importantes. Uma barbearia com volume maior deve adotar uma frequência compatível com a quantidade máxima de dados que aceita perder.

Em planos com backup gerenciado, consulte a política vigente no painel do Supabase. Backups diários e Point-in-Time Recovery dependem do plano/recursos contratados.

## Armazenamento

Mantenha pelo menos uma cópia fora do computador usado para administrar a aplicação. Proteja o local de armazenamento com controle de acesso e criptografia. Não envie dumps por canais públicos e não os deixe em pastas compartilhadas sem necessidade.

Defina retenção e descarte compatíveis com a operação e com as obrigações aplicáveis de proteção de dados.

## Antes de uma mudança de banco

1. Confirme que o CI está verde.
2. Gere um backup recente.
3. Registre a migration que será aplicada.
4. Evite mudanças destrutivas sem uma estratégia de reversão.
5. Após aplicar, valide login, agenda pública, criação de reserva e painel administrativo.

## Recuperação

Não restaure diretamente sobre produção apenas para testar um backup. Valide a recuperação primeiro em um ambiente isolado sempre que possível.

Em um incidente real:

1. Pause a agenda pública para reduzir novas gravações.
2. Determine o último ponto conhecido como íntegro.
3. Preserve o estado atual antes de qualquer tentativa de restauração, quando possível.
4. Escolha o backup anterior ao incidente.
5. Restaure seguindo o mecanismo adequado ao plano Supabase ou em um projeto de recuperação.
6. Verifique migrations, tabelas, funções, RLS e dados essenciais.
7. Execute os testes de aceite.
8. Somente então reabra a agenda pública.

Uma restauração gerenciada pode causar indisponibilidade. Planeje uma janela de manutenção.

## Validação mínima pós-recuperação

Confira a configuração da barbearia, serviços ativos, horários, clientes, agendamentos futuros, bloqueios, aberturas especiais e histórico de eventos. Confirme também que o administrador consegue autenticar e que um horário público válido aparece corretamente.

## O que não deve ser tratado como backup

O histórico do Git não substitui backup do banco. Migrations reconstroem a estrutura, mas não recuperam clientes e agendamentos. Variáveis da Vercel também não substituem os dados.

Se futuramente a aplicação passar a armazenar arquivos no Supabase Storage, crie uma estratégia separada: o backup do banco contém metadados, não necessariamente os objetos armazenados.

## Registro operacional

Para cada instalação mantenha, fora do repositório público, um registro com: responsável, projeto Supabase, projeto Vercel, domínio, data do último backup verificado e data do último teste de recuperação. Não registre senhas ou secret keys nesse documento.
