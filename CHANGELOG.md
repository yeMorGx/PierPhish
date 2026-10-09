# Change log e passagem de contexto

Este arquivo registra o estado do projeto para continuar o trabalho em outro computador ou sessão.

## Regra para próximas alterações

**Sempre que uma tarefa alterar o repositório, atualize este arquivo na mesma tarefa.** Acrescente uma entrada datada em `Histórico`, descrevendo o que mudou, validações executadas, commit/push/deploy quando aplicável e o que continua pendente. Não apague entradas antigas para substituir pelo estado novo. No início de uma sessão em outro computador, leia este arquivo e confira o estado real do Git antes de continuar.

Não inclua neste arquivo chaves, tokens, senhas, códigos de pareamento ativos, endereços de destinatários ou outros segredos. Diferencie claramente código pronto, configuração aplicada em produção e validação ainda não feita.

## Estado do projeto — atualizado em 08/10/2026

### Contraste e espaçamento da gestão do workspace — 2026-09-29

- O modal de gestão passou a usar uma paleta monocromática via tokens também nos campos, prévia do logo, navegação, convite, resumo de acesso e lista de pessoas. O texto auxiliar ganhou mais contraste; removi o desfoque do fundo, a sombra do modal e o gradiente sobre a imagem.
- A largura útil, o padding e a hierarquia foram reorganizados: resumo do time, formulário de convite e lista agora têm separação consistente; os controles têm altura e alinhamento uniformes. Em telas estreitas, os campos e o resumo refluem em uma coluna.
- Nenhum dado do workspace foi alterado.
- Validações: Prettier aprovado; `tsc --noEmit` aprovado; detector Impeccable de layout sem achados; `git diff --check` aprovado (apenas aviso de conversão LF/CRLF do Git no Windows).
- Entrega: `2136de2` foi enviado para `main` e publicado na Vercel com status **Ready**. Conferi no site o formulário e a aba Pessoas; os três membros carregaram. Nenhum dado foi alterado.
- Próximos passos: revisar a aparência no tamanho de tela usado pela equipe. Não há pendências de código ou publicação.

### Correção de cores do resumo de campanhas — 2026-09-29

- Removidos os valores azul-petróleo fixos que ainda eram aplicados no tema escuro ao cabeçalho e às linhas da tabela, cartões de métricas, indicadores, avatares e status do resumo de campanhas.
- A seção agora usa `--surface`, `--surface-soft`, `--line`, `--line-soft`, `--ink` e `--text-muted`, alinhando os fundos e textos à paleta monocromática do PierSec.
- Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. O detector Impeccable sinalizou dois padrões em outras regras do CSS (borda lateral decorativa e transição de largura), ambos fora da área alterada. Nenhuma campanha ou envio foi executado.
- O commit `2d1009c` foi enviado para `origin/main`. O deployment de produção da Vercel apontou para esse commit e ficou **Ready**. A conferência na tela confirmou cartões/cabeçalho em cinza e linhas/status neutros, sem os fundos azul-petróleo.
- Próximos passos: nenhum para esta correção visual.

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
- O novo fluxo valida se o modelo contém `{{.URL}}` e apresenta gráficos de campanhas. O deploy Vercel do commit `0c4bb0b` foi confirmado como **Ready**. O Portainer reporta a Stack `piersec-campaign-bridge` na revisão `00a753b`, contêiner **running**, sem porta publicada; PierSec indica **Conectado** e marca modelos com/sem link rastreável.

### Última alteração registrada — documentação por assunto

- `2026-09-28` — `/docs` agora funciona como índice curto e cada assunto tem uma página própria: `/docs/primeiros-passos`, `/docs/campanhas`, `/docs/resultados`, `/docs/administracao` e `/docs/ajuda`. Todas compartilham um menu lateral por assunto no desktop, que se reorganiza sem rolagem horizontal no mobile.
- Enxugado o texto e reorganizados os passos. A área de campanhas agora diferencia grupo, modelo de e-mail, página de destino e perfil de envio; explica a sequência de revisão e a confirmação deslizante. Foi incluído um esquema dos campos reais da primeira etapa, sem dados de destinatários, contas ou campanhas.
- Criada uma exceção visual limitada a `/docs` no `AGENTS.md`: o guia pode usar o token `--docs-accent` para navegação e destaques instrutivos; as demais áreas mantêm a regra monocromática. Não foi alterado o sistema global de cores.
- Capturas atuais de `/docs`, `/campanhas/grupos` e `/campanhas/nova` foram inspecionadas no navegador para manter a documentação alinhada às telas. Nenhuma captura com avatar ou dados da conta foi adicionada aos assets; o guia usa um esquema textual dos campos em vez de publicar a imagem da sessão autenticada.
- Validações: Prettier nos arquivos alterados, `pnpm exec tsc --noEmit`, `git diff --check` e detector Impeccable (`[]`) passaram. O commit `78f91dc` foi enviado para `origin/main`; a Vercel mostrou o deployment de produção como **Ready** às 18:08 BRT. Com a sessão autorizada, abri `/docs` e `/docs/campanhas` e conferi menu, links, esquema de formulário e captura de desktop. A versão mobile foi revisada pelos breakpoints do CSS, sem uma captura dedicada. Nenhum teste automatizado, envio, campanha, migration ou alteração de infraestrutura foi executado.
- A revisão de contraste encontrou texto secundário insuficiente sobre a superfície levemente azul do item ativo no tema claro. `--docs-muted` agora usa tons próprios para cada tema; no ativo claro a relação calculada é 4,82:1, e no ativo escuro é 5,36:1.
- O ajuste está no commit `33f6200`, enviado para `origin/main`. `pnpm exec tsc --noEmit`, Prettier e `git diff --check` passaram. A leitura da aba Vercel foi interrompida antes de confirmar esse novo deployment; o deploy `78f91dc` continua confirmado como **Ready**.
- Próximos passos: confirmar a publicação de `33f6200`; se o menu em duas colunas no celular ficar apertado em aparelhos menores, ajustar o breakpoint e a descrição dos assuntos. Não há operação de campanha pendente nesta entrega.

### Integração de e-mails pelo Resend — 2026-09-28

- Adicionada a dependência `resend@6.30.0` e o envio server-side em `lib/server-email.ts`. Os modelos de convite/ativação, convite de workspace e redefinição usam o nome PierSec; campos dinâmicos são escapados no HTML e o assunto remove quebras de linha. `RESEND_API_KEY` nunca usa prefixo `NEXT_PUBLIC_`, e a chave não é lida no navegador nem armazenada no Supabase.
- A criação de usuário deixou de pedir/armazenar uma senha temporária. Ela gera um link de convite do Supabase Auth, vincula a conta ao workspace e manda por Resend uma mensagem para confirmar o e-mail e definir a primeira senha. Convites para contas já existentes agora também mandam os dados de acesso por e-mail e mantêm o aviso interno.
- A ação administrativa de senha envia um link individual em vez de trocar a senha diretamente. Adicionadas as páginas `/esqueci-senha` e `/redefinir-senha`; a solicitação pública responde genericamente para contas inexistentes e aplica limites de frequência por e-mail/IP em cada instância da aplicação.
- Configuração esperada no servidor local e na Vercel: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (remetente de domínio verificado) e `APP_BASE_URL` (URL HTTPS do site em produção). O `.env.local.example` contém somente um placeholder `re_xxxxxxxxx`; nenhum segredo foi adicionado ao repositório. As URLs `/alterar-senha` e `/redefinir-senha` precisam estar na allowlist de Redirect URLs do Supabase Auth.
- Validações: Prettier nos arquivos TS/TSX/CSS/MD/JSON, TypeScript (`pnpm exec tsc --noEmit`), `pnpm install --lockfile-only --frozen-lockfile --ignore-scripts --offline` e `git diff --check` passaram. Nenhum e-mail foi enviado nem migration/configuração remota aplicada. O commit `3269326` foi enviado para `origin/main`; a publicação da Vercel ainda não foi conferida.
- Próximos passos: configurar a chave Resend e um remetente verificado nos ambientes local/Vercel, configurar `APP_BASE_URL` e Redirect URLs no Supabase, depois implantar e testar os três fluxos com endereços controlados. Consultar os logs do Resend para confirmar aceitação e entrega.
- `2026-09-28` — O usuário informou a URL de produção `https://pier-phish.vercel.app/`; `APP_BASE_URL` foi configurada com esse endereço no `.env.local` (arquivo ignorado pelo Git). A presença da chave `RESEND_API_KEY` foi conferida sem ler ou imprimir seu valor; `RESEND_FROM_EMAIL` ainda não está definido.
- Por decisão do usuário, verificar o domínio remetente no Resend e configurar `RESEND_FROM_EMAIL` ficam para uma etapa futura. Nenhuma mensagem foi enviada e nenhum deploy foi validado. Ao retomar: verificar um domínio no Resend, configurar as variáveis de produção na Vercel e as Redirect URLs no Supabase, depois testar os fluxos com destinatários controlados.

### Alterações anteriores

- 2026-09-28 — Corrigida a sanitização das páginas de destino para preservar o documento HTML e os estilos necessários na página publicada pelo serviço de campanhas: mantidos html/head/body, elementos semânticos, viewport, imagens HTTPS e folhas CSS externas HTTPS. O CSS embutido agora aceita propriedades comuns de layout, !important, breakpoints de largura/altura, preferência de tema/movimento e camadas @layer, com limites de tamanho e regras.
- Folhas e imagens externas ficam restritas a HTTPS com hostname (sem IP literal, credenciais, porta alternativa ou fragmento); o navegador recebe referrerpolicy=no-referrer. Scripts, formulários, campos de entrada e captura de credenciais continuam bloqueados. A prévia sandbox continua bloqueando requisições externas; o texto do editor explica essa diferença.
- Como páginas já salvas podem ter perdido o CSS durante a sanitização anterior, depois do deploy será necessário editar a página no PierSec e colar/salvar novamente o HTML original.
- Validações: Prettier, pnpm exec tsc --noEmit e git diff --check passaram. Nenhum teste automatizado, campanha, e-mail ou alteração de infraestrutura foi executado. Commit fac0278 enviado para origin/main; deploy Vercel ainda não verificado.
- Próximos passos: publicar o código, atualizar a página com o HTML original e conferir a apresentação pelo endereço HTTPS do túnel.
- `2026-09-28` — Criada a rota autenticada `/docs`, com guia passo a passo para acesso e workspaces, painel inicial, campanhas, grupos, modelos, páginas, perfis de envio, agenda e confirmação, resultados, atividade, riscos, empresas, usuários, configurações e problemas comuns. A página também está acessível por **Documentação** no menu do perfil; os links levam às telas correspondentes do PierSec.
- O conteúdo explica que o modelo é o e-mail, a página é o destino após o clique, `{{.URL}}` registra cliques, “enviado” não garante chegada à caixa de entrada e campanhas só entram na fila após revisão e confirmação explícita. A documentação não expõe o fornecedor do serviço de campanhas.
- Acrescentadas ao `AGENTS.md` as regras visuais anti-AI-slop pedidas pelo usuário: tokens monocromáticos, tipografia, bordas, espaçamento, movimento discreto, elementos proibidos e checklist obrigatório para interfaces.
- Validações: Prettier, `pnpm exec tsc --noEmit`, `git diff --check` e detector Impeccable (`[]`) passaram. Nenhum teste automatizado, envio, campanha, migration ou configuração de infraestrutura foi executado. Commit `4c13bbb` enviado para `origin/main`; deploy da Vercel ainda não foi conferido.
- Próximos passos: publicar pela Vercel, abrir `/docs` com uma conta autorizada e revisar os passos no ambiente implantado.
- `2026-09-28` — Removidos os seis banners, o componente visual compartilhado e os estilos sobrepostos; restaurados os cabeçalhos de campanhas sem imagem.
- Atualizados os títulos do cabeçalho para `Campanhas/Grupos`, `Campanhas/Modelos`, `Campanhas/Páginas`, `Campanhas/Perfis de envio`, `Campanhas/Atividade`, `Campanhas/Conexão` e `Campanhas/Nova campanha`. A listagem principal permanece `Campanhas`.
- Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. Nenhuma operação ou campanha foi executada. Commit/push serão registrados após o versionamento.
- `2026-09-28` — Suavizado o fundo dos banners com blur de 3 px e escurecimento uniforme de 45%, sem gradiente, para separar melhor o texto branco da arte.
- Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. Nenhuma campanha ou operação foi executada. Commit `6a01624` enviado a `origin/main`.
- `2026-09-28` — Ajustado o cabeçalho dos banners: título, descrição e metadados ficam centralizados; removida a camada em gradiente cinza. O texto branco usa uma sombra discreta para se destacar sobre as imagens.
- Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. Nenhuma operação ou campanha foi executada. Commit `35011e8` enviado a `origin/main`.
- `2026-09-28` — Aplicados os seis banners enviados aos cabeçalhos de Campanhas, Atividade, Grupos, Modelos, Páginas e Perfis de envio. Os arquivos foram copiados para `public/campaign-banners/`; um cabeçalho compartilhado usa as artes como fundo decorativo com camada de contraste adaptada ao tema claro/escuro.
- Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. Nenhuma operação ou campanha foi executada. Commit `ab0a93b` enviado a `origin/main`; o deploy automático da Vercel ainda precisa ser conferido.
- `2026-09-28` — Adicionada paginação à tabela de campanhas: 10 itens por padrão, seletor para 10/20/50/100, intervalo exibido, páginas numeradas e controles anterior/próxima. A navegação “Áreas de campanhas” agora quebra em linhas em telas estreitas, sem rolagem horizontal.
- A paginação opera sobre as campanhas já sincronizadas no PierSec; nenhuma integração, lançamento ou envio de campanha foi acionado nesta alteração. Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram. Não executei testes automatizados. Commit `1f98ed9` enviado a `origin/main`; o deploy automático da Vercel ainda precisa ser verificado.
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

1. Confirmar em produção a nova alteração dos gráficos e que o Portainer manteve a Stack atualizada após o push.
2. Em ambiente isolado, usar destinatário controlado, modelo com `href="{{.URL}}"` e domínio público roteado ao serviço; clicar no link e conferir a contagem e a atividade individual após a sincronização. Campanhas antigas com link direto não registram cliques retroativamente.
3. Continuar a validação da edição de grupos, modelos e páginas e confirmar que atualização de perfil mantém o ID atual.
4. Definir e implementar o `PIERSEC_PAIRING_CODE` duradouro solicitado para a infraestrutura, sem exigir Portainer dos usuários do app e sem expor o segredo ao frontend. Não registrar o valor do segredo no changelog.
5. Deixar para etapa futura a verificação de domínio e a configuração do remetente do Resend; depois configurar as Redirect URLs do Supabase e validar convite, confirmação e redefinição com endereços controlados.
6. Manter a interface e a documentação voltadas ao PierSec, sem revelar o fornecedor do motor de campanhas aos usuários finais.

## Histórico

### 2026-10-09 — Correções da auditoria UI/UX

- A lista de campanhas ganhou tipografia operacional maior, causa de falha legível, botão por linha com alvo de 44 px e instrução visível de rolagem horizontal em telas estreitas. O painel de atividade individual também teve texto e controles ampliados. `--text-muted` do tema claro passou a `#666666` para superar a meta de contraste nas superfícies claras.
- Os estados conhecidos do detalhe das campanhas importadas agora recebem rótulos em português, incluindo envio de dados e falha; sinais e filtros continuam com a classificação correta. A exportação de clicados foi colocada junto da lista de pessoas nos dois modos, com explicação de que ignora o filtro visual. A documentação acompanha a mudança.
- O menu de campanhas agrupa as oito rotas em Acompanhar, Preparar e Configurar. A paginação ganhou rótulos acessíveis em português e alvos maiores. O detalhe visual passou a ter filtros com estado acessível, foco visível e texto maior.
- O gráfico de abertura mantém nomes completos nos dados e no tooltip, mesmo com eixo abreviado; foi removido um link que apontava para a própria seção. A página de workspaces evita mostrar “nenhum” enquanto carrega e apresenta uma recuperação para falha de leitura.
- O registro da auditoria de 08/10 foi encerrado após tratar os cinco itens priorizados P1/P2.
- Validações: `pnpm exec tsc --noEmit`, Prettier nos arquivos alterados, `pnpm build`, detector Impeccable (zero alertas nos componentes revisados) e `git diff --check` concluídos. O texto muted do tema claro agora mede entre 5,31:1 e 5,74:1 nas superfícies verificadas. Nenhuma campanha, destinatário, configuração remota ou migration foi alterada.
- Entrega: commit e push pendentes; a publicação e a revisão das telas em desktop/mobile serão registradas depois da verificação no ambiente publicado.
- Próximos passos: conferir o deploy em produção, revisar campanhas e dashboard em desktop/mobile e verificar contraste/interações nos temas claro e escuro.

### 2026-10-08 — Auditoria UI/UX Impeccable

- Feita auditoria de design e técnica em duas avaliações independentes, com inspeção de código e das telas de produção do dashboard, campanhas, criação, detalhe, documentação e workspaces. A revisão mobile cobriu `/campanhas` em 390 px; não foi feita validação exaustiva em todos os aparelhos.
- Resultado: 25/40 nas heurísticas de Nielsen. Prioridades: tipografia e contraste na tabela operacional, tradução dos status no detalhe, agrupamento da navegação de campanhas, localização da exportação junto aos resultados e indicação da rolagem móvel/alvos de toque. O detector Impeccable retornou zero alertas nos nove componentes de campanhas examinados; os problemas listados vieram da inspeção visual e do código.
- O relatório foi salvo em `.impeccable/critique/2026-10-08T18-09-35Z__app.md`; a auditoria histórica de 24/09/2026 foi preservada. A série 22/40 → 25/40 é apenas indicativa porque as telas e condições de avaliação mudaram.
- Nenhuma interface, dado, campanha ou configuração remota foi alterada. O navegador não permitiu injetar o overlay do detector; a inspeção usou capturas e código. O commit `9c90a34` foi enviado para `origin/main`; não houve deploy de código nesta tarefa.
- Próximos passos: escolher se a primeira rodada corrige apenas os itens P1 ou também a navegação, a exportação e a experiência móvel; reavaliar contraste e foco após as alterações.

### 2026-10-08 — Extração de clicados das campanhas BeePhish

- O detalhe de campanhas sincronizadas (`/campaigns/[id]`) agora oferece “Extrair clicados · Excel” nos dois modos de visualização. A extração usa os resultados e eventos do workspace ativo, percorre todas as páginas de 500 registros e considera clique no status ou no histórico de eventos, sem depender do recorte exibido na tela.
- A planilha usa o mesmo modelo de sete colunas da entrega anterior. Nome, sobrenome, e-mail, cargo e departamento vêm dos resultados sincronizados; gestor e e-mail do gestor ficam vazios porque a integração atual não os fornece. Um e-mail aparece uma vez, e os endereços excluídos das estatísticas do workspace não entram no arquivo.
- A geração permanece no navegador, sem nova persistência de dados pessoais. A mudança de workspace durante a extração impede o download do workspace anterior. O guia `/docs/resultados` foi atualizado.
- Validações: `pnpm exec tsc --noEmit`, Prettier e `git diff --check` passaram. `pnpm build` parou antes da compilação com `EINVAL` no arquivo ignorado `.next/diagnostics/framework.json`, marcado pelo OneDrive como ponto de nova análise; a remoção pontual desse cache foi recusada pela revisão automática de comandos (`blocked by policy`). Commit `0bfbb7a` enviado para `origin/main`; deploy não verificado. Não foi feita consulta a dados reais, migration ou alteração na integração remota.
- Próximos passos: verificar o download numa campanha BeePhish autorizada e confirmar se os campos de gestor existem na origem antes de propor sua sincronização.

### 2026-10-08 — Extração de pessoas que clicaram

- Na lista de campanhas, “Ver atividade e extrair clicados” carrega a atividade individual pela conexão privada. O painel passa a oferecer “Extrair clicados · Excel”, com contagem de pessoas únicas que tiveram clique registrado.
- O arquivo `.xlsx` é criado no navegador depois da descriptografia da resposta, sem nova cópia de dados pessoais no servidor. Ele mantém a aba “Clicados únicos” e as sete colunas do exemplo fornecido: Nome, Sobrenome, E-mail, Cargo, Departamento, Gestor e E-mail do Gestor. Os três últimos campos ficam vazios porque não são fornecidos pelo serviço atual; o aviso aparece no painel. A planilha de exemplo foi inspecionada apenas para estrutura e não foi adicionada ao repositório.
- Se a consulta individual estiver truncada nos primeiros 500 destinatários, a exportação é desabilitada para não apresentar uma lista parcial como completa. A atividade em memória é limpa ao trocar de workspace.
- O guia `/docs/resultados` recebeu o passo de extração e explica os campos ausentes e o limite de consulta.
- Dependência `exceljs` adicionada para gerar o arquivo no cliente sob demanda; locks do pnpm e npm atualizados.
- Validações: `pnpm exec tsc --noEmit`, `pnpm exec prettier --check` nos arquivos editados, `git diff --check` e `pnpm build` concluídos sem erro. Commit `5080605` enviado para `origin/main`; o deploy não foi verificado. Não foi feita consulta a dados reais, envio de campanha, migration nem operação no Portainer.
- Próximos passos: validar o download com uma campanha de teste e ampliar a consulta paginada caso seja preciso extrair campanhas acima do limite atual de 500 destinatários.

### 2026-10-08 — Filtro de datas na visão geral

- A visão geral agora filtra campanhas iniciadas no dia, na semana (segunda a domingo), no mês ou no ano da data de referência. A opção “Todo o período” preserva a visão completa; a pessoa pode escolher uma data no calendário HeroUI e avançar ou voltar um período. O próximo período é desabilitado quando ainda não começou.
- O recorte é aplicado à lista, aos gráficos e às métricas dos dois modos do dashboard, além das contagens no filtro de empresas. Campanhas sem data de início só aparecem na visão completa. A interface explica que os resultados são totais acumulados até a última sincronização, e não eventos que ocorreram dentro do período escolhido.
- Foram adicionadas as dependências HeroUI v3 e seus estilos, com controles adaptados aos tokens claro/escuro do PierSec. O texto secundário do filtro ganhou token próprio para manter contraste no tema claro. Os arquivos de lock do pnpm e do npm foram atualizados; o lock do npm também precisava absorver dependências já presentes no manifesto antes desta tarefa, por isso o diff é maior.
- Validações: `pnpm build`, `pnpm exec tsc --noEmit`, Prettier nos arquivos alterados e `git diff --check` passaram. Não executei testes automatizados, campanha ou operação remota de banco/infra. A interface ainda não foi conferida manualmente com dados reais após publicação.
- Entrega: o commit `d5ba520` foi enviado para `origin/main`. O deploy da Vercel não foi conferido nesta tarefa; não afirmar que a versão já está em produção sem verificar o deployment.
- Próximos passos: conferir o filtro na interface com campanhas reais em ambos os temas após a publicação.

### 2026-09-28 — CSS do HTML, personalização do nome e entrega no spam

- Corrigido o sanitizador do PierSec: ele agora mantém CSS inline e blocos `<style>` após validar regras e propriedades com PostCSS. Scripts, formulários, importações e recursos externos continuam bloqueados. O editor explica esse comportamento para modelos e páginas.
- O conteúdo atual da página de treinamento já foi salvo sem CSS; os estilos descartados anteriormente não existem no registro para recuperação. Depois que a versão corrigida for implantada, será necessário colar novamente o HTML/CSS original no editor e salvar. Nenhum ativo remoto foi alterado nesta tarefa.
- Causa observada do nome: o modelo usa `{{.FirstName}} {{.LastName}}`, enquanto o grupo selecionado tem `Pessoal` cadastrado literalmente como sobrenome. A correspondência dos campos está correta; atualizar os sobrenomes exige os valores reais e não foi feito automaticamente.
- Entrega no spam: o servidor SMTP aceitar a mensagem não informa se a caixa colocou o e-mail na entrada ou no spam. O envio testado usa Gmail pessoal e um link público temporário `trycloudflare.com`; reputação do remetente, URL e conteúdo de simulação também podem influenciar, sem que os dados disponíveis identifiquem uma causa única. As diretrizes atuais do Gmail recomendam autenticação de domínio e esclarecem que autenticação sozinha não garante entrega. Usar domínio próprio verificado, remetente estável e coordenação com o administrador de e-mail da organização são próximos passos; não tentei contornar filtros.
- Validações: Prettier, `pnpm exec tsc --noEmit`, `pnpm install --lockfile-only --frozen-lockfile --ignore-scripts --offline` e `git diff --check` passaram. Não executei testes automatizados. O detector Impeccable apontou um falso positivo de imagem em uma expressão regular que reconhece o pixel de rastreamento já existente; não há imagem quebrada na interface.
- Nenhuma campanha ou mensagem foi enviada, e nenhuma lista, grupo ou perfil remoto foi modificada. O commit `c69a4c6` foi enviado para `origin/main`; a publicação automática da Vercel ainda precisa ser conferida. Esta atualização final do changelog será enviada em um commit separado.

### 2026-09-28 — Diagnóstico de modelo e página recusados

- Os logs do ambiente mostraram HTTP 500 ao salvar o modelo e a página `BancoExemplo`: o parser recusou `{{nome_cliente}}` porque `nome_cliente` não é uma variável disponível. A consulta de leitura ao snapshot confirmou que nenhum dos dois ativos apareceu no ambiente; os registros antigos da fila foram preservados como estavam.
- O formulário agora barra variáveis no formato `{{nome_cliente}}` antes de criar uma solicitação e sugere campos aceitos, como `{{.FirstName}}`, `{{.LastName}}` e `{{.Email}}`. A lista de variáveis do modelo também passou a incluir `.Email`.
- O conector agora reconhece a mensagem de variável desconhecida em respostas JSON ou texto simples. Para esse erro de validação conhecido, registra uma falha definitiva com orientação para corrigir e salvar novamente; outros erros HTTP 5xx continuam exigindo verificação antes de repetir e agora informam o código HTTP. O texto bruto de erro do ambiente não é armazenado nem repassado.
- Não repeti a criação do modelo ou da página, não alterei os registros do Supabase e não criei nem lancei campanha.
- Validações: Prettier, `pnpm exec tsc --noEmit`, `node --check connector/bridge.mjs`, `git diff --check` e detector Impeccable no formulário (`[]`) passaram. Nenhum teste automatizado foi executado.
- O commit `7cc342a` foi enviado para `origin/main`. O deploy de produção da Vercel para esse commit está **Ready**.
- A Stack `piersec-campaign-bridge` foi atualizada no Portainer para `7cc342a`; o contêiner novo está **running**, os logs confirmam o conector ativo e sincronizando 10 campanhas/2 grupos, e a coluna de portas publicadas permanece `-`.

### 2026-09-28 — Rastreamento de cliques, prévia HTML isolada e visão geral

- Corrigida a origem provável da ausência de cliques em campanhas novas: o modelo precisa usar o placeholder `{{.URL}}` e a URL configurada precisa ser o domínio público roteado ao serviço de campanhas. O conector agora anuncia se validou o link no modelo; a API de prévia recusa modelos sem link rastreável ou conexão com essa capacidade, mantendo a confirmação da campanha existente.
- A lista de modelos informa se há link rastreável. O editor agora distingue modelo de e-mail (assunto, texto e HTML enviados) de página de destino (conteúdo estático após o clique), e mostra uma prévia em `iframe` com sandbox, scripts/forms/acesso externo bloqueados; os atributos `href` também são removidos na prévia para impedir navegação.
- Adicionada a página `Campanhas/Visão geral` com indicadores agregados e gráficos das oito campanhas mais recentes: aberturas/cliques, taxas de abertura/clique e envios/falhas. Atualização automática a cada 30 segundos. O menu apresenta os nomes `Modelos de e-mail` e `Páginas de destino`.
- Adicionado `components/ui/chart.tsx` com o CLI local do shadcn. A dependência Recharts já existente foi mantida; não houve mudança de pacote, migration Supabase, operação Portainer nesta etapa nem lançamento/envio de campanha.
- Validações: Prettier nos arquivos alterados, TypeScript (`tsc --noEmit`), `node --check connector/bridge.mjs`, `git diff --check` e detector Impeccable (`[]`) passaram. Nenhum teste automatizado foi executado.
- Commit `0c4bb0b` enviado para `origin/main`; o deploy Vercel correspondente foi conferido e está **Ready**. O Portainer mostra a Stack `piersec-campaign-bridge` na revisão `00a753b`; o contêiner está **running**, sem porta publicada, e os logs confirmam conexão e sincronização. A tela de modelos mostra um ativo sem link e outro com link rastreável. Não enviei e-mails nem criei campanhas.
- A atualização `becf225` acrescentou o gráfico de envios/falhas; o deploy de produção foi conferido como **Ready**. Em `https://pier-phish.vercel.app/campanhas/visao-geral`, confirmei os três gráficos e os dados sincronizados: 10 campanhas, 28 destinatários, 15 enviados aceitos, 13 falhas, 0 aberturas e 0 cliques (dados de 28/09/2026, 15:41). A página explica que o modelo precisa de `{{.URL}}` e que campanhas anteriores com link direto não registram cliques retroativamente.
- Próximo passo: validar o rastreamento com uma campanha isolada e destinatário controlado; nenhuma campanha foi criada nem enviada nesta tarefa. A Stack do Portainer permanece na revisão `00a753b`, conectada e sem porta publicada.

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

### 2026-09-28 — Tentativa de túnel temporário para páginas de campanha

- Criada no Portainer a Stack `piersec-campaign-page-test-tunnel`, limitada à rede Docker privada `piersec_campaign_private` e ao serviço `campaign-engine:80`. Nenhuma porta é publicada no host; a porta administrativa 3333 continua privada.
- Adicionada a configuração reproduzível em `deploy/portainer/campaign-page-test-tunnel.compose.yaml`. Após autorização do usuário, foi concedida somente a capacidade `NET_BIND_SERVICE` ao contêiner. `cap_drop: ALL`, `no-new-privileges:true`, usuário `0:0`, sistema de arquivos raiz somente leitura e `/tmp` temporário foram mantidos.
- A Stack foi reaplicada pelo Portainer. A inspeção confirmou `CapAdd=CAP_NET_BIND_SERVICE`, `CapDrop=ALL`, `ReadonlyRootfs=true`, rede privada e `PortBindings` vazio. Porém, o contêiner continua reiniciando com `exec /usr/local/bin/cloudflared: operation not permitted`; nenhum endereço `trycloudflare.com` foi gerado e o túnel ainda não está funcional.
- Próximo passo: diagnosticar se a restrição `no-new-privileges:true` ou outra política do host impede executar o binário. Qualquer remoção dessa proteção precisa de autorização específica para este contêiner do túnel. Depois que iniciar, conferir a URL temporária nos logs e testar que ela chega somente ao listener de páginas; links já enviados não mudam e uma campanha de teste nova não deve ser enviada sem pedido explícito.
- Nenhuma campanha foi criada ou enviada nesta etapa.

### 2026-09-28 — Túnel temporário ativo para páginas de campanha

- Com autorização explícita, removido `no-new-privileges` somente da Stack `piersec-campaign-page-test-tunnel` no Portainer. A configuração continua com `cap_drop: ALL`, `NET_BIND_SERVICE` como única capacidade adicionada, usuário `0:0`, sistema de arquivos raiz somente leitura, `/tmp` em tmpfs, rede Docker privada e sem portas publicadas. A porta administrativa 3333 permanece privada.
- O contêiner está **running**, com zero reinicializações após o ajuste. Os logs confirmam que o Quick Tunnel foi criado e registrou conexão. A URL aleatória é temporária e não foi copiada para este changelog; se o contêiner reiniciar, consulte a nova URL nos logs do Portainer.
- Uma requisição HTTPS à raiz pública respondeu `404`, comportamento esperado sem o parâmetro `rid` de uma campanha. Isso confirma o encaminhamento até o serviço de páginas; a FAQ oficial descreve o `404` sem `rid` e o uso do host público como URL da campanha: https://github.com/gophish/user-guide/blob/master/faq.md.
- Para um teste posterior, usar a URL `trycloudflare.com` atual como **Endereço público de rastreamento** na criação pelo PierSec e manter `{{.URL}}` no link do modelo. A landing page escolhida será servida quando houver um link individual de campanha. Links de e-mails anteriores continuam apontando para o host antigo.
- Nenhuma campanha foi criada ou enviada. A confirmação de retorno da landing page selecionada ainda depende de uma nova campanha de teste autorizada.
