# Change log e passagem de contexto

Este arquivo registra o estado do projeto para continuar o trabalho em outro computador ou sessão.

## Regra para próximas alterações

**Sempre que uma tarefa alterar o repositório, atualize este arquivo na mesma tarefa.** Acrescente uma entrada datada em `Histórico`, descrevendo o que mudou, validações executadas, commit/push/deploy quando aplicável e o que continua pendente. Não apague entradas antigas para substituir pelo estado novo. No início de uma sessão em outro computador, leia este arquivo e confira o estado real do Git antes de continuar.

Não inclua neste arquivo chaves, tokens, senhas, códigos de pareamento ativos, endereços de destinatários ou outros segredos. Diferencie claramente código pronto, configuração aplicada em produção e validação ainda não feita.

## Estado do projeto — atualizado em 28/09/2026

### Objetivo do produto

Criar e acompanhar campanhas de conscientização pelo PierSec. A pessoa usuária deve conduzir o trabalho pela interface PierSec; Portainer é assunto de infraestrutura. A interface não deve revelar o nome do fornecedor do motor de campanhas. Dados operacionais e histórico ficam no Supabase.

### O que já existe no repositório

- Integração entre o PierSec hospedado na Vercel e um conector/serviço de campanhas em Docker, gerenciado pelo Portainer.
- O conector inicia conexões HTTPS de saída para o PierSec e conversa com o serviço pela rede Docker privada. O Compose não publica portas do serviço nem do conector.
- A chave administrativa e o certificado são montados como segredos no host Docker. A chave privada do conector fica em volume persistente; o navegador não recebe a chave administrativa.
- Pareamento do conector pela área de conexão, consulta de estado e sincronização de campanhas, grupos e estatísticas agregadas.
- Área de campanhas separada da conexão, com administração de grupos, modelos de e-mail, páginas e perfis de envio, além do fluxo de criação de campanha.
- Criação passa por prévia, revisão explícita, aceite da autorização e confirmação deslizante. O servidor ainda valida o nome da campanha contra a prévia antes de criar um comando de uso único para a fila; o resultado fica no histórico. Não repetir automaticamente uma operação cujo resultado seja inconclusivo.
- As páginas são configuradas sem captura de credenciais/senhas. O fluxo documentado também bloqueia formulários, entradas e scripts de captura.
- Conteúdo operacional e listas de destinatários são cifrados para o conector antes de irem para a fila do Supabase e apagados quando o resultado chega ou a ordem expira. O histórico guarda solicitante, horário, seleção, contagem e resultado.
- A tela de campanhas mostra contagens agregadas e permite pedir atividade individual sob demanda. A resposta com e-mails e horários é cifrada para uma chave temporária da sessão do navegador, e a aplicação descarta IP, navegador e dados submetidos. “Enviado” significa aceito pelo servidor de e-mail e não comprova entrega na caixa de entrada.

### Última alteração registrada

- `2026-09-28` — Adicionada paginação à tabela de campanhas: 10 itens por padrão, seletor para 10/20/50/100, intervalo exibido, páginas numeradas e controles anterior/próxima. A navegação “Áreas de campanhas” agora quebra em linhas em telas estreitas, sem rolagem horizontal.
- A paginação opera sobre as campanhas já sincronizadas no PierSec; nenhuma integração, lançamento ou envio de campanha foi acionado nesta alteração. Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. Não executei testes automatizados. Commit e push serão registrados após a conclusão do versionamento; o deploy da Vercel ainda precisa ser verificado.
- `2026-09-28` — Corrigida a edição de ativos e adicionada consulta individual de atividade. Perfis de envio continuam sendo atualizados pelo ID existente; a API bloqueia a operação se a Stack do Portainer ainda não anunciar suporte a atualização, para impedir que uma versão antiga crie outro perfil. Grupos, modelos e páginas agora abrem seus próprios formulários de edição e preservam campos do ambiente que o formulário não edita.
- Na campanha, **Ver atividade individual** busca resultados atualizados pelo conector quando solicitado, mostra destinatário, estado e horários de envio/abertura/clique/submissão/denúncia/falha e atualiza as contagens agregadas na tela. IP, user-agent, geolocalização, conteúdo submetido e credenciais não são mostrados nem serializados na resposta.
- As respostas de leitura usam AES-GCM com chave aleatória por resposta; a chave é cifrada para uma chave RSA temporária do navegador, cuja chave privada agora é não exportável e fica apenas em memória. O Supabase armazena só o envelope cifrado, que a tela confirma para remoção após abrir; se a confirmação falhar, uma limpeza automática tenta removê-lo após 30 minutos. O payload cifrado de comando é apagado quando o conector conclui a operação.
- A migration `20260928142449_add_campaign_asset_secure_reads.sql` foi aplicada ao Supabase de produção após a autorização do usuário. Ela adiciona o envelope de resposta cifrada à fila, permite `campaign_results` e restringe a função de finalização ao `service_role`, sem `SECURITY DEFINER`. A verificação pós-aplicação confirmou `security_definer=false`, execução permitida para `service_role` e negada para `authenticated`.
- Validações desta alteração: Prettier, `pnpm exec tsc --noEmit`, `node --check connector/bridge.mjs`, `git diff --check` e detector Impeccable (`[]`) passaram. O commit `352cb13` foi enviado para `origin/main`. A Vercel mostra esse commit como produção **Ready**. No Portainer, a Stack `piersec-campaign-bridge` foi atualizada para `352cb13`; o contêiner novo está **running**, sem portas publicadas e com o volume de estado preservado. A tela PierSec voltou a indicar **Conectado** e o snapshot do Supabase confirma `assetEdits`, `profileUpdates` e `individualResults` como ativos.
- As rotas e controles de edição/atividade foram confirmados nas páginas de produção. Não enviei e-mails nem criei campanhas nesta tarefa e não carreguei uma lista individual real durante a conferência. A solicitação anterior do usuário por um `PIERSEC_PAIRING_CODE` permanente e gerenciado pela infraestrutura continua pendente de definição e implementação segura.
- Durante a revisão final, corrigi a edição de modelos para detectar e preservar o pixel de abertura que já existe, sem acrescentar cópias duplicadas ao salvar novamente. Prettier e `pnpm exec tsc --noEmit` passaram. O commit `4e64fa3` foi enviado para `origin/main`; a verificação do deploy Vercel desse último commit foi interrompida antes de confirmar o resultado. A Stack do Portainer não precisa ser reconstruída porque `connector/bridge.mjs` não mudou depois do commit `352cb13`.
- `2026-09-28` — Substituído o campo para digitar o nome e o botão de confirmação por um controle deslizante em **Revise antes de confirmar**. A pessoa precisa marcar que tem autorização e deslizar até o fim; por teclado, o controle também pode ser ativado com Enter ou Espaço. Se a solicitação falhar, o controle retorna ao início para nova tentativa; enquanto envia, ele fica bloqueado.
- O componente `components/lightswind/slide-to-confirm.tsx` foi gerado pelo CLI Lightswind chamado via `pnpm dlx` porque `npx` não está disponível nesta máquina e foi adaptado ao tema claro/escuro do PierSec. Usa `motion/react` já disponível no projeto; nenhuma dependência ou migration foi adicionada. A tela envia o nome da campanha guardado na prévia e mantém a validação exata de nome e aceite no servidor/banco. Nenhuma campanha foi criada ou enviada durante esta alteração.
- Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. Não executei testes automatizados nem build. O commit `0f8c466` foi enviado para `origin/main`; a publicação automática na Vercel ainda não foi verificada.
- `2026-09-28` — Incluída no PierSec a ação **Corrigir acesso** em cada perfil de envio. O usuário informa novas credenciais, que seguem cifradas pela fila existente; o conector consulta os demais dados do perfil localmente e atualiza somente a autenticação. A navegação agora identifica claramente **Perfis de envio**, com acesso direto a partir da criação de campanhas.
- Nenhuma migration foi criada: o comando usa o tipo `sending_profile` já permitido pela tabela e pelas funções existentes. O usuário e a senha não são devolvidos ao navegador pelo conector, não ficam no snapshot nem no histórico, e a alteração de credenciais não envia e-mails.
- Validações: Prettier, `git diff --check`, `tsc --noEmit`, `node --check connector/bridge.mjs` e detector Impeccable (`[]`) passaram. Não executei testes automatizados. O build Next.js local não foi repetido porque a tentativa anterior falhou ao ler `.next/diagnostics/framework.json` como reparse point do OneDrive.
- O commit `f2b08c9` foi enviado para `origin/main`. Confirmar o deploy da Vercel e reconstruir a Stack do conector no Portainer para habilitar a atualização pelo PierSec.
- `2026-09-28` — Ajustado o diagnóstico de campanhas que foram criadas, mas falharam no envio. O conector resume eventos SMTP em categorias sem persistir endereços ou a mensagem bruta; o endpoint do snapshot valida uma lista fechada de categorias; a tela separa o estado de criação do estado de entrega e informa a causa quando recebida.
- Não foi criada migration: o resumo categorizado cabe no snapshot JSONB existente. A tela mantém contagens disponíveis enquanto o conector antigo não enviar as categorias.
- Validações após o rebase em `54adbcd`: Prettier, `git diff --check`, `tsc --noEmit` e `node --check connector/bridge.mjs` passaram. O `next build` não concluiu: o Next.js falhou com `EINVAL` ao executar `readlink` em `.next/diagnostics/framework.json`, que está marcado pelo OneDrive como ponto de nova análise. Antes do rebase, build e script pós-build passaram na base anterior. Nenhum teste automatizado foi executado.
- A implementação foi rebased sobre os 28 commits que já estavam em `origin/main`; o commit `0dfb7e5` foi enviado com sucesso para `origin/main`. Confirmar o deploy web da Vercel; a Stack do Portainer ainda precisa ser atualizada para reconstruir o conector. A tentativa de abrir a Stack no navegador excedeu o tempo limite duas vezes, portanto a infraestrutura não foi alterada nesta tarefa.
- `2026-09-25` — Criados `AGENTS.md` e `.impeccable/README.md` para padronizar o trabalho entre computadores e explicar o contexto histórico da auditoria visual. O relatório original `.impeccable/critique/2026-09-24T14-27-00Z__app.md` foi preservado, sem reescrita dos achados antigos.
- A auditoria de `.impeccable/` encontrou somente esse relatório Markdown (7.141 bytes); não encontrou arquivos adicionais, cache ou segredos. Foi removido um espaço no fim de uma linha do front matter para a checagem do Git passar; os achados não foram reescritos.
- Início desta tarefa: branch `main` em `e4436b2`, sincronizada com `origin/main`; o arquivo `.impeccable/` estava sem rastreamento.
- `2026-09-25` — Commit `4dfd070` (`Show campaign delivery counts in Piersec`), já enviado para `origin/main`.
- Arquivo alterado: `components/campaigns/campaign-workspace-content.tsx`.
- Inclui as colunas de enviados e falhas, o horário de atualização dos dados e texto de contexto sobre entrega de e-mail.
- Validações relatadas: Prettier no componente, TypeScript (`tsc --noEmit`), `next build`, detector Impeccable no componente e `git diff --check` passaram.
- A alteração deve ser publicada pela implantação automática da Vercel ligada à `main`. A confirmação visual da nova versão em produção ainda não foi registrada.

### Estado observado na última sessão

- `2026-09-28` — No PierSec em produção, o comando `testetetse` consta como criado com sucesso (3 destinatários, campanha ID 5 no serviço); o painel de campanhas mostra **0 enviados, 3 falhas, 0 aberturas/cliques/dados**. A sincronização estava ativa às 09:40 BRT. Nenhum e-mail foi aceito pelo servidor de envio; isso explica por que não chegou à caixa de entrada.
- No registro consultado naquela sessão, o resultado era `Campanha registrada.`, estado `succeeded` e contagens agregadas; o texto bruto do erro SMTP não foi persistido. A alteração de diagnóstico passou a exibir categorias seguras após nova sincronização.
- Atualização informada pelo usuário: a tela agora mostra `smtp_auth` como **Autenticação do perfil de envio recusada**. Isso confirma que o servidor recusou usuário/senha do perfil; ainda é necessário atualizar essas credenciais e iniciar uma nova campanha revisada, pois a anterior não é reenviada.
- Não foi criada nem reenviada campanha pelo assistente. Repetir o envio antes de conhecer e corrigir a causa pode fazer mensagens chegarem se a configuração SMTP tiver mudado.
- O conector apareceu como **Conectado** na tela de conexão; a sincronização mais recente observada foi às 17:17 de 25/09/2026.
- A campanha de teste `testetetse` aparecia como “Em andamento”, com 3 destinatários, e início às 17:08. A atividade mostrava que a solicitação foi concluída/registrada. Isso não comprova recebimento na caixa de entrada.
- Na observação anterior, a campanha tinha 0 aberturas, 0 cliques e 0 dados submetidos. A tela ainda não mostrava as métricas de envio; o commit acima adiciona essa informação, mas o novo deploy precisa ser conferido.
- Não foi feito novo disparo pelo assistente. Para saber se a mensagem chegou, primeiro conferir `Enviados` e `Falhas` após a publicação e a próxima sincronização. “Enviados” confirma aceitação pelo servidor SMTP, não a chegada à caixa de entrada. Se necessário, conferir logs do serviço/provedor de e-mail e spam/quarentena.

### Git e arquivos locais

- Branch: `main`; o commit `f2b08c9` com a edição de perfis foi enviado para `origin/main`.
- Havia uma pasta `.impeccable/` não rastreada antes desta tarefa. Ela é preexistente e não deve ser incluída em commits sem relação com ela.
- O registro histórico de que ainda não havia `CHANGELOG.md` descreve a sessão anterior em que esse arquivo foi criado.

## Próximos passos

1. Confirmar a publicação Vercel do commit `4e64fa3`.
2. Validar pela interface a edição de grupos, modelos e páginas, cada qual em sua página, e confirmar que uma atualização de perfil mantém o ID atual.
3. Consultar os resultados individuais de uma campanha isolada para confirmar abertura/clique/envio; a Stack já anuncia a capacidade e a resposta é cifrada, mas essa leitura não foi feita nesta conferência.
4. Definir e implementar o `PIERSEC_PAIRING_CODE` duradouro solicitado para a infraestrutura, sem exigir Portainer dos usuários do app e sem expor o segredo ao frontend. Não registrar o valor do segredo no changelog.
5. Para envio real de teste, usar apenas ambiente/destinatário controlado e autorização explícita; campanhas anteriores com falhas não são reenviadas automaticamente.
6. Manter a interface e a documentação voltadas ao PierSec, sem revelar o fornecedor do motor de campanhas aos usuários finais.

## Histórico

### 2026-09-26 — Paleta neutra inspirada no ChatGPT

- Aplicados os tokens hexadecimais neutros informados pelo usuário nos temas claro e escuro: fundos `#ffffff`/`#0a0a0a`, superfícies, cartões, bordas, foco, seleção, sidebar e áreas de código.
- Ajustados os aliases legados da interface e o modal de gerenciamento de workspace para usar a mesma escala, sem remover as cores semânticas de sucesso e risco.
- Mantidos os cards com imagens, logos, autenticação, MFA, workspaces, campanhas e permissões sem alteração de comportamento.
- Validações: Prettier, `pnpm exec tsc --noEmit`, `git diff --check` e detector Impeccable (`[]`) passaram. `pnpm run build` compilou, verificou tipos e gerou 59 páginas; a etapa final local continua bloqueada no Windows por `EPERM` ao criar symlinks para `.next/standalone`.
- Commit `18a5ed9` (`Aplica paleta neutra inspirada no ChatGPT`) criado e push para `origin/main` confirmado. Não houve deploy, alteração remota de banco ou infraestrutura.

### 2026-09-26 — Correção da dependência de resize no build da Vercel

- Analisado o log do deploy no commit `0a85249`: a Vercel não conseguia resolver `react-resizable/css/styles.css` porque `react-resizable` estava disponível apenas de forma transitiva via `react-grid-layout`.
- Declarado `react-resizable@3.2.0` diretamente no `package.json` e atualizado o `pnpm-lock.yaml`, garantindo instalação determinística no pnpm isolado da Vercel.
- Validações: `pnpm exec tsc --noEmit` passou; `pnpm run build` compilou, verificou tipos e gerou 59 páginas. A etapa final local continua bloqueada no Windows por `EPERM` ao criar symlinks para `.next/standalone`, limitação ambiental já registrada. Nenhum teste automatizado foi executado.
- Commit e push desta correção ainda pendentes. Não houve alteração remota de banco, infraestrutura ou segredos.

Próximo passo: enviar a correção para `origin/main` e acompanhar o novo deploy da Vercel.

### 2026-09-26 — Migração visual para shadcn e paleta neutra

- Inicializado o kit shadcn/base-nova no projeto e adicionados os primitives de botão, campos, labels, cards, badges, avatar, diálogos, menus, selects, tabelas, tabs, tooltips, sheets, popovers, command, skeleton e estados de alerta.
- Migrados login, providers globais e logos de campanha para os componentes do kit; as imagens dos cards e logos continuam sendo exibidas, com fallback acessível pelo `Avatar`.
- Substituída a paleta quente/azulada por tokens neutros inspirados no ChatGPT, com tema claro/escuro, superfícies, bordas, foco e scrollbar consistentes. O fluxo de autenticação, MFA, workspaces, campanhas e permissões não foi alterado.
- Validações: `pnpm exec tsc --noEmit`, Prettier nos arquivos alterados, `git diff --check` e detector Impeccable (`[]`) passaram. A prévia local em `http://localhost:3000/` respondeu e a árvore de acessibilidade confirmou os cards, logos e imagens de participantes. `pnpm run build` compilou, verificou tipos e gerou 59 páginas, mas a etapa final falhou no Windows ao copiar symlinks para `.next/standalone` (`EPERM`). Nenhum teste automatizado foi executado.
- Commit `b87440a` (`Migra interface para shadcn e paleta neutra`) criado e push confirmado em `origin/main`. Não houve deploy nem alteração remota de banco ou infraestrutura.

Próximos passos: conferir o deploy automático e a aparência em produção; o build local continua limitado pela criação de symlinks standalone no Windows.

### 2026-09-26 — Configuração e documentação dos MCPs de referências de design

- Verificadas as dez fontes de referência indicadas e documentados os caminhos oficiais em `docs/mcp-design-references.md`.
- Configurados globalmente no Codex os MCPs remotos oficiais `motionsites`, `originkit` e `refero`; os fluxos OAuth de MotionSites e Refero foram concluídos. O OriginKit ficou configurado para ler `ORIGINKIT_API_KEY` do ambiente local, sem gravar a chave no repositório.
- Instalado `shadcn@4.21.0` como dependência de desenvolvimento, aprovado somente o build do `esbuild` e registrado o servidor global `shadcn` no Codex usando `pnpm exec shadcn mcp`. React Bits Pro e Spell UI continuam dependendo dos respectivos registries em `components.json`; React Bits também exige licença.
- Loading.dev, Unlumen UI, Bencho, Osmo e Inspora foram registrados como fontes sem MCP oficial encontrado na verificação; o manual explica como usar cada uma sem inventar endpoints.
- Validações: `codex mcp list` confirmou os três servidores remotos e `shadcn` habilitados; `pnpm exec shadcn mcp init --client codex` concluiu e exibiu a configuração do cliente. `npx` não está disponível nesta máquina, e o `pnpm dlx` inicial falhou com `ERR_MODULE_NOT_FOUND` para `chalk`; o binário local funcionou após a instalação e aprovação do build. Nenhum teste automatizado foi executado.
- Commit `262eed2` criado e push para `origin/main` confirmado; não há deploy ou confirmação visual de produção envolvidos nesta tarefa.

### 2026-09-26 — Microinterações inspiradas em bibliotecas de componentes

- Analisadas as referências loading.dev, React Bits, Originkit, MotionSites AI, Unlumen UI, Bencho, Osmo, Refero Styles, Inspora e Spell UI; a direção escolhida foi trazer exploração e movimento com função operacional, sem transformar o dashboard em uma landing page.
- Criado `components/ui/spotlight-card.tsx`, componente reutilizável que acompanha o ponteiro dentro dos cards do dashboard visual, sem alterar dados, navegação ou fluxo de campanhas.
- Aplicado o spotlight no hero, métricas, gráfico, risco e visão de campanhas; o estado do hero passou a usar o nome PierSec, um pulso sutil de monitoramento ativo e suporte a `prefers-reduced-motion`.
- Validações: TypeScript (`tsc --noEmit`), Prettier nos arquivos TS/TSX e `git diff --check` passaram; o detector Impeccable foi executado uma vez e manteve somente os dois avisos visuais preexistentes de `side-tab` e transição de largura. O `next build` compilou, verificou tipos e gerou 59 páginas, mas terminou bloqueado pelo Windows ao copiar symlinks para `.next/standalone` (`EPERM`), limitação já observada no projeto.
- Commit `b939501` criado e push para `origin/main` confirmado; a confirmação visual em produção permanece pendente até o deploy automático ficar disponível.

### 2026-09-26 — Logo da empresa no mapa de exposição

- A tabela de pessoas por risco agora identifica a empresa vinculada à campanha e exibe sua logo ao lado do avatar da pessoa; quando não houver imagem, mostra a inicial da empresa.
- Criada uma leitura server-side das empresas ativas do workspace, protegida por sessão, MFA e associação ao workspace, sem expor credenciais administrativas ao navegador.
- Validações: Prettier nos arquivos alterados, `tsc --noEmit`, compilação/geração de páginas do `next build`, `git diff --check` e detector visual passaram; a etapa final do build foi bloqueada pelo Windows ao copiar symlinks para `.next/standalone` (`EPERM`). O detector manteve apenas os dois avisos visuais preexistentes de `side-tab` e transição de largura.
- Commit `7a30c4f` (`Exibe logo da empresa no mapa de exposicao`) criado e enviado para `origin/main`; confirmação visual em produção ainda pendente.

### 2026-09-26 — Clareza visual do risco no modal

- Removida a fração ambígua `3/4` da leitura de risco; o modal agora apresenta diretamente “Risco alto”, “Atenção” ou “Risco baixo”, com escala visual identificada de baixa a alta exposição.
- Reforçadas as cores dos sinais ativos com fundos e bordas semânticos por tipo, deixando clique, abertura, reporte e envio de dados mais legíveis no tema escuro.
- Validações: Prettier em `components/people/person-details-modal.tsx`, `tsc --noEmit`, `git diff --check` e detector visual passaram; o detector manteve apenas os dois avisos preexistentes de `side-tab` e transição de largura.
- Commit/push e confirmação visual em produção ainda pendentes.

### 2026-09-26 — Redesign do modal de detalhes da pessoa

- Reorganizado o modal de detalhes com cabeçalho mais leve, fechamento menos invasivo e agrupamento visual mais claro para risco, sinais, dados, campanhas e linha do tempo.
- Substituído o anel ambíguo de risco por uma escala visual de quatro níveis; sinais ativos e inativos agora usam cores semânticas por tipo, e o status atual acompanha a mesma linguagem visual.
- Corrigido o texto do rodapé para usar PierSec, sem expor o nome técnico do fornecedor.
- Validações: Prettier em `components/people/person-details-modal.tsx`, `tsc --noEmit`, `git diff --check` e detector visual passaram; o detector manteve apenas os dois avisos preexistentes de `side-tab` e transição de largura.
- Commit/push e confirmação visual em produção ainda pendentes.

### 2026-09-26 — Cores semânticas para status e sinais

- A tabela de pessoas impactadas passou a diferenciar visualmente status de abertura, clique, reporte, envio de dados e estados neutros.
- Os sinais de abriu, clicou e reportou agora mantêm cores próprias nos estados ativo e inativo, com tokens específicos para os temas claro e escuro.
- Validações: Prettier em `app/campaigns/[id]/page.tsx`, `tsc --noEmit`, `git diff --check` e detector visual passaram; o detector manteve apenas os dois avisos preexistentes de `side-tab` e transição de largura.
- Commit/push e confirmação visual em produção ainda pendentes.

### 2026-09-25 — Prévia de e-mail em drawer lateral

- Removido o card grande embutido de “Exemplo do e-mail” e criado um gatilho compacto no card principal da campanha, tanto na visão visual quanto na visão clássica.
- A prévia agora abre em uma barra lateral pela direita, com animação, fechamento por botão, Escape ou clique fora e layout responsivo; o conteúdo existente de HTML sanitizado, texto puro, metadados, anexos, upload, substituição, download e remoção foi preservado.
- Validações: Prettier nos arquivos alterados, `tsc --noEmit`, `git diff --check` e detector visual passaram; o detector manteve somente os dois avisos preexistentes de `side-tab` e transição de largura.
- Commit `2fe91e3` criado e enviado para `origin/main`; a publicação automática da Vercel deve seguir o fluxo já configurado. A confirmação visual em produção ainda está pendente.

### 2026-09-25 — Normalização de bordas por tema

- Varredura do site para substituir bordas e divisores neutros hardcoded por `var(--line)`, `var(--line-soft)`, `var(--muted)` ou `var(--accent)` conforme o papel do elemento.
- Atualizados dashboard, detalhes de campanhas, configurações, usuários, perfil, tooltips e formulários; bordas de erro, aviso, sucesso e superfícies intencionalmente escuras foram preservadas.
- Validações: Prettier nos arquivos TS/TSX alterados, `tsc --noEmit`, `git diff --check` e detector visual passaram; o detector manteve apenas dois avisos preexistentes fora deste ajuste.
- Commit `4d35226` criado; push para `origin/main` confirmado.

### 2026-09-25 — Ajuste das bordas da visão geral e configurações

- Removido o divisor inferior do card de aberturas da visão geral, mantendo o restante do layout inalterado.
- Corrigida a borda dos cards de configurações para usar `var(--line)` e acompanhar corretamente o tema claro ou escuro.
- Validações: Prettier, `git diff --check` e detector visual passaram; o detector manteve apenas avisos preexistentes fora deste ajuste.
- Commit `e32ead1` criado e enviado para `origin/main`.

### 2026-09-25 — Ajuste do divisor da página de risco

- Removido o divisor inferior do bloco de filtros da página Pessoas por risco, mantendo o espaçamento e o alinhamento existentes.
- Validações: Prettier em `components/risk/people-risk-content.tsx` e `git diff --check` passaram.
- Commits `acc54dd` e `5d7f1a0` criados e enviados para `origin/main`.

### 2026-09-25 — Refinamentos da visão geral, perfil e tour

- O gráfico de rosca de **Abertura consolidada** ficou maior e passou a usar um contêiner relativo para manter a porcentagem e o rótulo centralizados em diferentes larguras.
- O botão do cabeçalho deixou de se chamar “Buscar” e passou a indicar **Comandos**, com o atalho `⌘K` redesenhado; o item de Workspaces foi removido da navegação lateral.
- As linhas da tabela de Pessoas por risco passaram a usar a mesma borda semântica nas células, evitando a linha branca inconsistente.
- Perfil e tour passaram a carregar e salvar preferências por usuário no Supabase. A migration `20260926024934_add_profile_preferences.sql` criou a tabela com RLS, permissões por usuário e o bucket `profile-avatars` com upload/update/delete controlados; a migration foi aplicada e conferida no projeto remoto. A URL do avatar é pública para permitir a exibição entre dispositivos, mas o objeto só pode ser alterado pelo próprio usuário.
- O tour deixou de depender do `localStorage`; o menu **Ver tour do produto** continua permitindo reiniciá-lo manualmente.
- Validações: TypeScript (`tsc --noEmit`), Prettier nos arquivos TS/TSX, `git diff --check`, detector Impeccable e conferência visual local em visão geral, comandos, Pessoas por risco e Configurações. O `next build` compilou e gerou as páginas, mas terminou com `EPERM` ao copiar symlinks para `.next/standalone` por limitação de permissões do Windows.
- Commit `7e6a774` criado e enviado para `origin/main`. A publicação automática da Vercel e a confirmação visual em produção continuam pendentes.

### 2026-09-25 — Ajuste do vídeo da tela de login

- O vídeo da área visual do login passou a preencher todo o painel com `object-fit: cover`, mantendo o enquadramento responsivo em desktop e mobile.
- Removido o texto promocional que alternava automaticamente e toda a lógica de intervalo/animação associada.
- Validações executadas: Prettier nos arquivos alterados, TypeScript (`tsc --noEmit`), detector Impeccable e `git diff --check`. O detector registrou apenas avisos preexistentes em outras regras do CSS.
- O commit `a640108` foi criado e enviado para `origin/main`; a confirmação visual do deploy em produção continua pendente.

### 2026-09-25 — Passagem de contexto e rotina do change log

- Criado este arquivo para permitir continuidade do trabalho em computadores diferentes.
- Registrada a instrução de atualizá-lo a cada alteração futura, junto com o estado do Git, evidências de validação e pendências.
- Registrados o fluxo de campanhas existente, o resultado observado do teste de e-mail, a última alteração em `main` e as verificações ainda necessárias.

### 2026-09-25 — Instruções persistentes e auditoria Impeccable

- Criado `AGENTS.md` na raiz com instruções para início de sessão, segurança, campanhas, validação, continuidade, commits e atualização obrigatória do change log.
- Incluída no repositório a pasta `.impeccable/`, que contém uma auditoria visual histórica de 24/09; adicionada uma nota explicando que os achados precisam ser revalidados antes de orientar novas mudanças.
- A auditoria original foi preservada sem reescrita dos achados; apenas um espaço no fim de uma linha do front matter foi removido. Nenhum arquivo de segredo foi incluído.

### 2026-09-28 — Diagnóstico do envio de campanhas

- Investigado o teste existente pelo painel do PierSec e pelos registros operacionais do Supabase. A campanha foi criada; 3 destinatários falharam na etapa de envio e nenhum foi aceito pelo servidor SMTP.
- A causa técnica detalhada não estava no snapshot recebido. Implementado o resumo de categorias de erro baseado nos eventos locais do serviço, com envio apenas de códigos agregados e textos fixos para o PierSec; e-mails e detalhes brutos permanecem locais.
- A interface agora diferencia campanha criada de falha/resultado parcial de envio e explica quantos envios foram aceitos ou falharam e a causa categorizada quando disponível.
- A interface atual foi preservada ao integrar a alteração; `0dfb7e5` está enviado a `origin/main`. Prettier, `git diff --check`, TypeScript e sintaxe do conector passaram. O build foi tentado novamente, mas parou no artefato `.next/diagnostics/framework.json` marcado pelo OneDrive; o build e o script pós-build tinham passado antes do rebase. O deploy do conector no Portainer ainda está pendente.
