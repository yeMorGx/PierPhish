# Beephish Lens

Dashboard Next.js para acompanhar campanhas Beephish, resultados individuais e eventos sincronizados no Supabase.

## Rodar

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

Preencha `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A chave publishable é a única chave usada no navegador. A `service_role` e os secrets da Beephish continuam somente no servidor (rotas API e Edge Function).

Sem `.env.local`, a aplicação abre em modo demonstração para validar o layout.

## Empresas e workspaces

A página `/empresas` administra as conexões BeePhish do workspace ativo. O cadastro permite editar nome, logo, informações, Client ID e status do cliente. Workspaces são criados e trocados pelo modal do workspace no menu do perfil, com ambientes internos de teste ou produção. Logos são escolhidos como arquivo local; não existe campo para link externo.

Para persistir essa área no Supabase:

1. Aplique `supabase/migrations/20260915000000_add_workspaces_and_companies.sql` no projeto.
2. Aplique `supabase/migrations/20260915010000_persist_primary_and_allow_admin_fallback.sql` no projeto.
3. Aplique `supabase/migrations/20260915020000_add_workspace_memberships.sql` para criar as associações entre usuários e workspaces.
4. Aplique `supabase/migrations/20260915021000_allow_workspace_members_to_view_data.sql` para liberar a leitura dos dados BeePhish aos membros ativos do workspace principal.
5. Aplique `supabase/migrations/20260915022000_harden_workspace_data_access_function.sql` para manter o helper de leitura como função invoker, seguindo o contexto RLS da sessão.
6. Defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente da aplicação. A rota de workspaces valida a sessão com a chave publishable e as políticas RLS; `SUPABASE_SERVICE_ROLE_KEY` é necessária no servidor para criar usuários pelo Supabase Auth e salvar a associação de workspace.
7. Defina `PIERPHISH_CREDENTIAL_KEY` com uma chave longa e estável. Ela protege os Client Secrets com criptografia server-side; o segredo em texto puro não é salvo no navegador, não é retornado pela API e não aparece depois de salvo.

Quando o Supabase não está configurado, a tela usa dados de demonstração no navegador para permitir validar o fluxo. Mesmo nesse modo, o Client Secret fica somente no estado da tela e não é persistido no localStorage.

Cada workspace criado localmente começa sem dados BeePhish. As telas de visão geral, risco, apresentação, status e detalhe de campanha só exibem os dados consolidados do workspace principal enquanto a conexão própria do novo ambiente ainda não foi cadastrada.

Na área `/usuarios`, um administrador pode criar o acesso já vinculado a um workspace. Os níveis são Proprietário, Administrador, Analista e Visualizador. Proprietários e administradores só conseguem gerenciar usuários dos workspaces que administram; os demais níveis ficam em modo de consulta.

O conector atual de sincronização ainda usa a credencial global configurada em `outputs/sync-beephish`. O armazenamento de Client ID/Client Secret por cliente já está preparado, mas a chamada BeePhish com credenciais individuais depende do contrato de autenticação e endpoint de troca da API BeePhish, que não foi informado.
