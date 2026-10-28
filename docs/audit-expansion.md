# Auditoria operacional

Atualizado em 28/10/2026. Escopo pedido pelo usuário: ampliar o histórico de `/auditoria` para as operações disponíveis de usuários/workspaces, autenticação e campanhas.

## Eventos cobertos

| Área                  | O que aparece                                                                                                                                  | Fonte                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Usuários              | Convite criado/falhou, pessoa adicionada ao workspace, papel e exclusão das estatísticas alterados, redefinição enviada/falhou, conta excluída | Rotas administrativas, após confirmar o resultado                                         |
| Workspaces e conexões | Workspace criado/atualizado; cliente/conexão criada/atualizada                                                                                 | Rotas administrativas                                                                     |
| Autenticação          | Sessão iniciada, saída solicitada, senha alterada, MFA ativado/verificado/falhou e pedido de recuperação                                       | Aplicação e endpoints autenticados; pedido de recuperação não associa identidade          |
| Campanhas             | Prévia, confirmação/falha, resultado de execução, sincronização, marcação/desmarcação como teste                                               | Rotas da aplicação, conector e função autorizada no banco                                 |
| Ativos                | Operação de grupo, modelo, página, perfil ou resultados colocada na fila e resultado devolvido                                                 | Fila e retorno autenticado do conector                                                    |
| Histórico existente   | Solicitações de campanha e ativo sem evento detalhado correspondente                                                                           | Tabelas anteriores, como compatibilidade; duplicatas são suprimidas quando há evento novo |

Metadados são limitados a tipo e nome do recurso, papel, contagens agregadas, estado do e-mail, campos alterados, tipo/quantidade de ativo e resultado. Não entram HTML, corpo de mensagem, destinatários, e-mail informado na recuperação, senha, token, segredo de conexão, payload cifrado ou mensagem técnica bruta.

## Banco e acesso

Migrations versionadas:

- `supabase/migrations/20261028190000_add_pierphish_audit_events.sql`
- `supabase/migrations/20261028193000_make_pierphish_audit_events_immutable.sql`
- `supabase/migrations/20261028194500_block_audit_event_truncate.sql`
- `supabase/migrations/20261028200000_preserve_audit_events_after_deletion.sql`

A tabela `public.pierphish_audit_events` tem índices, limites de tamanho e RLS. Não há políticas nem grants para `public`, `anon` ou `authenticated`; gravações/leitura usam `service_role` no servidor depois de autorização da aplicação. Trigger ativo rejeita `UPDATE`, `DELETE` e `TRUNCATE`, inclusive para `service_role`; o app só insere ou faz upsert idempotente.

A primeira migration também adiciona os campos de marcação de teste a `beephish_campaigns` e a função `set_campaign_test_flag`. A função exige sessão AAL2, verifica a permissão do workspace e grava a marcação e o evento na mesma transação.

Aplicadas pelo SQL Editor no projeto `acwxnnqnfdzsggwzpetl`, após a pessoa usuária autenticar. Consultas posteriores confirmaram a tabela, RLS ligada, zero políticas, sem `SELECT` de `anon`/`authenticated`, escrita de `service_role`, permissão da função de marcação e o trigger ativo cobrindo `UPDATE`, `DELETE` e `TRUNCATE`. A última migration remove as FKs de ator/workspace para que a exclusão de uma conta não tente atualizar nem apague um evento imutável; os UUIDs permanecem como histórico. Nenhum evento de teste foi inserido.

**Histórico de migrations:** o ledger já existia e continha migrations anteriores, mas não as quatro aplicadas pelo SQL Editor. Após verificar o schema remoto, as versões `20261028190000`, `20261028193000`, `20261028194500` e `20261028200000` foram registradas em `supabase_migrations.schema_migrations`. Uma consulta confirmou as quatro linhas; isso evita que o CLI tente reaplicá-las. Nenhum job ativo em `cron.job` foi encontrado para a tabela de eventos. O trigger atual bloqueia exclusão; retenção automática futura precisa de um caminho de expurgo controlado, sem permitir edição dos eventos restantes.

A leitura da tela passa por `/api/audit`, que exige administrador do workspace e MFA. Admins do workspace veem eventos do workspace e eventos de autenticação apenas de pessoas com vínculo ativo nele. Admin global consulta eventos de autenticação globais; pedidos de recuperação sem identidade aparecem apenas no workspace principal. Eventos novos substituem a linha antiga de fila do mesmo recurso para evitar duplicação.

## Limites conhecidos

- Tentativas de login recusadas antes de existir sessão válida não são registradas: não há identidade/workspace verificado e não foi criada uma rota anônima de escrita.
- Pedido de recuperação registra que a solicitação chegou e se o fluxo avançou/falhou. Não grava endereço informado, resultado de busca da conta ou token.
- O servidor valida a sessão usada para registrar eventos. Sessão iniciada exige JWT recente; MFA concluído exige AAL2, e ativação também exige fator TOTP verificado; troca de senha exige atualização recente da conta. A saída é registrada como solicitada, não como prova de revogação da sessão.
- Falha de verificação MFA é reportada pela interface usando uma sessão AAL1; o servidor não recebe o código inválido e não pode provar por conta própria que houve falha. Não trate este evento como trilha antifraude inviolável.
- Esses sinais de autenticação não substituem webhook ou log nativo do provedor. Ações antes de sessão válida não entram.
- A tela usa somente pessoas ativas para associar eventos de autenticação ao workspace. Depois que alguém é removido, seus eventos deixam de aparecer para admins daquele workspace; admin global ainda pode consultá-los.
- O produto não tem fluxo de remoção de MFA; não há evento correspondente habilitado. Validações de formulário anteriores à criação de uma operação também não viram evento. A tela não registra cada leitura/visualização.
- Se a auditoria falhar depois de uma operação concluída, a operação mantém a resposta original; o servidor registra somente o nome da ação no log técnico, sem corpo ou segredo.
- O projeto está pronto no banco, mas a aplicação só começará a mostrar novos eventos após publicar e fazer deploy deste código.

## Validação e continuação

- `pnpm lint` aprovado (TypeScript); Prettier em TS/TSX/Markdown e `git diff --check` aprovados. Migrations SQL revisadas manualmente e schema/ledger conferidos no projeto autenticado.
- Consultas no SQL Editor leram apenas catálogo e privilégios. Nenhum evento, destinatário ou credencial foi consultado ou inserido; nenhuma campanha/e-mail foi enviado.
- O conector Supabase desta sessão negou acesso aos advisories; a verificação de catálogo e do ledger foi feita pelo navegador autenticado. `supabase db advisors` ainda precisa ser executado por alguém com essa permissão.
- Próximo passo: publicar/deploy; então, com uma conta controlada, executar operações reais permitidas, abrir `/auditoria` e conferir atribuição, escopo, detalhes e estados. Conferir a persistência nos logs do servidor sem registrar dados de destinatários. Criar um expurgo controlado antes de configurar retenção; o trigger atual rejeita exclusões.
