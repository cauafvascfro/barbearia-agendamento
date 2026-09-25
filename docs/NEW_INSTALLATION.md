# Nova instalação comercial

Este roteiro serve para implantar o sistema para uma nova barbearia sem reutilizar dados ou credenciais de outra instalação.

## Modelo adotado

Cada cliente comercial recebe uma instalação isolada:

- um projeto Supabase próprio;
- uma configuração/deploy de produção próprio na Vercel;
- credenciais administrativas próprias;
- domínio ou URL própria;
- dados, backups e ciclo de manutenção independentes.

O código-base pode continuar vindo deste repositório. A separação ocorre na infraestrutura e nos dados.

## Fase 1 — identificar a instalação

Antes de criar recursos, registre internamente:

- nome comercial da barbearia;
- responsável pela instalação;
- domínio desejado, se houver;
- e-mail que será usado pelo administrador;
- data prevista para homologação e entrega.

Não registre senha do administrador ou secret keys nesse documento.

## Fase 2 — Supabase

1. Crie um projeto exclusivo para a barbearia, preferencialmente na região adequada à operação.
2. Guarde a senha do banco em um gerenciador de segredos.
3. Vincule temporariamente a CLI ao novo projeto.
4. Execute `supabase db push --dry-run`.
5. Revise o resultado e aplique `supabase db push`.
6. Não aplique o seed de desenvolvimento em produção.
7. Crie somente o administrador autorizado em Authentication.
8. Mantenha cadastro público de usuários desabilitado.
9. Revise Security Advisor e RLS.

## Fase 3 — Vercel

Crie um projeto/deploy destinado à nova instalação e associe as variáveis descritas em `docs/ENVIRONMENTS.md`. Nunca copie uma secret key de outro cliente.

Configure `APP_URL` com o endereço definitivo da instalação e faça novo deploy após a alteração.

## Fase 4 — configuração sem código

Entre em `/admin/configuracoes` e configure identidade e contato, regras de agendamento e expediente. Depois cadastre os serviços em `/admin/servicos`.

A identidade comercial, preços, durações e horários devem ser definidos pelo painel. Uma nova barbearia não deve exigir edição de componentes React para essas informações.

## Fase 5 — homologação

Mantenha a agenda pública pausada durante a preparação quando necessário. Execute o checklist em `docs/PRODUCTION_CHECKLIST.md`, incluindo uma reserva pública real de teste, operação administrativa e validação dos relatórios.

Antes da entrega, execute e registre o primeiro backup conforme `docs/BACKUP_RECOVERY.md`.

## Fase 6 — entrega

Entregue ao proprietário:

- URL pública de agendamento;
- URL de login administrativo;
- usuário administrativo;
- orientação para troca/guarda segura da senha;
- orientação sobre pausar e reabrir a agenda pública.

Não entregue acesso ao Supabase, Vercel ou GitHub por padrão. Esses acessos são de infraestrutura e devem seguir o modelo de suporte/posse acordado com o cliente.

## Registro técnico interno

Mantenha um inventário privado por instalação contendo apenas referências operacionais, sem segredos:

| Campo | Exemplo |
|---|---|
| Cliente | Barbearia Exemplo |
| Repositório/base | barbearia-agendamento |
| Supabase project ref | referência do projeto |
| Vercel project | nome/ID do projeto |
| Domínio | domínio público |
| Administrador | e-mail do responsável |
| Última migration | versão aplicada |
| Último backup validado | data |
| Última homologação | data |
| Status | preparação / homologação / produção / suspensa |

## Atualizações futuras

Antes de atualizar várias instalações, valide a nova versão em ambiente de teste. Aplique migrations compatíveis antes do código que depende delas e faça a atualização cliente a cliente, confirmando a saúde da instalação após cada deploy.

Enquanto a arquitetura permanecer uma instalação por barbearia, não introduza `barbearia_id` ou compartilhamento de tabelas apenas para simular multitenancy. Uma migração para SaaS multiempresa deve ser tratada como evolução arquitetural própria.
