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
2. Mantenha `SUPABASE_SERVICE_ROLE_KEY` apenas no ambiente do servidor.
3. Defina `PIERPHISH_CREDENTIAL_KEY` com uma chave longa e estável. Ela protege os Client Secrets com criptografia server-side; o segredo em texto puro não é salvo no navegador, não é retornado pela API e não aparece depois de salvo.

Quando o Supabase não está configurado, a tela usa dados de demonstração no navegador para permitir validar o fluxo. Mesmo nesse modo, o Client Secret fica somente no estado da tela e não é persistido no localStorage.

O conector atual de sincronização ainda usa a credencial global configurada em `outputs/sync-beephish`. O armazenamento de Client ID/Client Secret por cliente já está preparado, mas a chamada BeePhish com credenciais individuais depende do contrato de autenticação e endpoint de troca da API BeePhish, que não foi informado.
