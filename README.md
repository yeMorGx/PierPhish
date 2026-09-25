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

## Aikido Zen Firewall

O servidor Next.js usa saída `standalone`; `npm run build` copia o pacote do Aikido para esse artefato e `npm run dev`/`npm start` carregam `.env.local` antes de pré-carregar a instrumentação do firewall. Use Node.js 22.15 ou superior; o Aikido recomenda Node.js 24 ou superior.

Defina `AIKIDO_TOKEN` no `.env.local` e no ambiente de produção com o token criado no painel Aikido. `AIKIDO_BLOCK=false` mantém inicialmente o modo de detecção, sem bloquear requisições. Avalie os eventos em desenvolvimento ou staging antes de ativar bloqueios. Não exponha o token com prefixo `NEXT_PUBLIC_`.

O projeto usa Next.js 15.5.24. A lista de compatibilidade atual do Aikido declara Next.js 12, 13, 14 e 16, sem incluir a versão 15; portanto, valide a inicialização e a cobertura de rotas no ambiente de staging antes de produção.

## Empresas e workspaces

A página `/empresas` administra as conexões BeePhish do workspace ativo. O cadastro permite editar nome, logo, informações, Client ID e status do cliente. Workspaces são criados, trocados e administrados na página `/workspaces`, com ambientes internos de teste ou produção. A mesma página permite personalizar o ambiente e gerenciar as pessoas vinculadas a ele. Logos são escolhidos como arquivo local; não existe campo para link externo.

Para persistir essa área no Supabase:

1. Aplique `supabase/migrations/20260915000000_add_workspaces_and_companies.sql` no projeto.
2. Aplique `supabase/migrations/20260915010000_persist_primary_and_allow_admin_fallback.sql` no projeto.
3. Aplique `supabase/migrations/20260915020000_add_workspace_memberships.sql` para criar as associações entre usuários e workspaces.
4. Aplique `supabase/migrations/20260915021000_allow_workspace_members_to_view_data.sql` para liberar a leitura inicial dos dados BeePhish aos membros.
5. Aplique `supabase/migrations/20260915022000_harden_workspace_data_access_function.sql` para manter o helper de leitura como função invoker, seguindo o contexto RLS da sessão.
6. Aplique `supabase/migrations/20260915023000_scope_beephish_data_by_workspace.sql` para associar campanhas, resultados e eventos ao workspace/cliente correto e habilitar a leitura isolada por workspace.
7. Defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente da aplicação. A rota de workspaces valida a sessão com a chave publishable e as políticas RLS; `SUPABASE_SERVICE_ROLE_KEY` é necessária no servidor para criar usuários pelo Supabase Auth e salvar a associação de workspace.
8. Defina `PIERPHISH_CREDENTIAL_KEY` com uma chave longa e estável. Ela protege os Client Secrets com criptografia server-side; o segredo em texto puro não é salvo no navegador, não é retornado pela API e não aparece depois de salvo.

Quando o Supabase não está configurado, a tela usa dados de demonstração no navegador para permitir validar o fluxo. Mesmo nesse modo, o Client Secret fica somente no estado da tela e não é persistido no localStorage.

Cada workspace começa isolado. As telas de visão geral, risco, apresentação, status e detalhe de campanha consultam somente os dados sincronizados para o workspace ativo.

Na área `/usuarios`, um administrador pode criar o acesso já vinculado a um workspace. Os níveis são Proprietário, Administrador, Analista e Visualizador. Proprietários e administradores só conseguem gerenciar usuários dos workspaces que administram; os demais níveis ficam em modo de consulta.

## MFA obrigatório

Todo acesso autenticado precisa concluir MFA com um aplicativo TOTP. Usuários novos entram no fluxo `/mfa` depois de trocar a senha inicial; usuários existentes sem um fator verificado são encaminhados para o mesmo fluxo antes de acessar o painel. Sessões sem `aal2` também são rejeitadas pelas rotas API protegidas.

No Supabase Dashboard, habilite o fator **TOTP** em Authentication → Multi-Factor. Para aplicar a regra a outros clientes além deste site, configure também o nível global de garantia como **AAL2 obrigatório**. O usuário pode usar Google Authenticator, Microsoft Authenticator, 1Password ou outro aplicativo compatível.

A sincronização web usa `/api/sync-beephish`: ela lê as conexões ativas do workspace, descriptografa o Client Secret somente no servidor e chama a API Beephish com autenticação Basic (`Client ID:Client Secret`), conforme o esquema exibido no Swagger. `BEEPHISH_BASE_URL` pode ser definido no servidor; se omitido, usa `https://portal.beephish.com/api`. A credencial global `BEEPHISH_AUTHORIZATION` permanece apenas como fallback legado.

## Conector local GoPhish

A página `/gophish` pareia um computador Windows com o workspace ativo por um código de uso único, válido por 10 minutos. Aplique `supabase/migrations/20260924120000_add_gophish_local_connector.sql` e `supabase/migrations/20260924150000_add_gophish_campaign_dispatch.sql` antes de usar o pareamento e o envio. O servidor precisa de `SUPABASE_SERVICE_ROLE_KEY` para guardar hashes dos códigos e tokens; nenhum deles é armazenado em texto puro.

No computador que executa o GoPhish, use PowerShell 7 e copie `scripts/gophish-connector.ps1` para uma pasta local. Inicie o GoPhish com a interface administrativa acessível apenas em `127.0.0.1:3333`, execute `pwsh -NoProfile -File .\gophish-connector.ps1`, e informe a URL HTTPS do Piersec, o código da tela, o caminho de `admin.crt` e a chave API no prompt seguro do terminal. O conector fixa o certificado local informado, valida os endpoints antes de parear e protege a chave API e o token permanente com DPAPI no perfil Windows atual. Não abra a porta 3333 no firewall nem na internet.

O conector lê `GET /api/campaigns/`, `GET /api/campaigns/:id/summary`, `GET /api/groups/summary`, `GET /api/templates/`, `GET /api/pages/` e `GET /api/smtp/`. A resposta é desserializada por campos permitidos. Ao Piersec seguem nomes e IDs de ativos, datas, flags de captura de credenciais e contagens agregadas. E-mails, pessoas, IPs, resultados individuais, HTML dos modelos e páginas, conteúdo submetido, credenciais SMTP e senhas não são enviados ou guardados na nuvem.

Para criar uma campanha, um proprietário ou administrador prepara a prévia com grupos, modelo, página, perfil de envio, URL HTTPS e horário. Páginas que capturam credenciais ou senhas são bloqueadas. A prévia mostra a estimativa de destinatários e expira em cinco minutos. O envio só entra na fila depois que a pessoa marca a confirmação e digita o nome exato da campanha. O conector revalida os ativos e o total localmente antes de fazer a única chamada `POST /api/campaigns/`; se algo mudou, ele bloqueia o envio. A ordem expira se não for buscada em dez minutos. Uma resposta inconclusiva fica marcada para verificação manual e não é repetida automaticamente.

As confirmações, quem as pediu, os grupos, o total estimado, horários e o recibo ou erro são mantidos no histórico do workspace. A tela indica o conector como conectado enquanto recebe atualização a cada 30 segundos; após 90 segundos sem atualização, mostra que perdeu o sinal. Não abra a porta 3333 no firewall nem na internet.

Referências: [API de campanhas](https://docs.getgophish.com/api-documentation/campaigns) e [API de usuários e grupos](https://docs.getgophish.com/api-documentation/users-and-groups).

## Exemplos reais de e-mail

Na página `/campaigns/[id]`, usuários autorizados no workspace podem anexar um `.eml` ou `.msg` exportado do Gmail ou Outlook. O binário fica no bucket privado `campaign-email-samples`; a tabela guarda os metadados e a representação sanitizada usada na prévia. O conteúdo nunca é buscado na API Beephish.

Defina `MAX_EMAIL_SAMPLE_SIZE_MB` (padrão `10`) e `MAX_EMAIL_SAMPLE_STORAGE_MB` (padrão `100`) no servidor. A migration `supabase/migrations/20260921120000_add_campaign_email_samples.sql` cria a tabela, logs, bucket privado, índices e políticas RLS/Storage. A rota administrativa `POST /api/admin/email-samples/cleanup` remove arquivos órfãos do bucket.

Depois de configurar as variáveis do Supabase, aplique a migration no projeto remoto com `supabase db push` ou executando o arquivo no SQL Editor do Supabase. Sem essa etapa, a interface aparece, mas o upload não encontra a tabela/bucket.
