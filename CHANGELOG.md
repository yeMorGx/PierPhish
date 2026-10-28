# Change log e passagem de contexto

### Fundo claro no fluxo de autenticação — 2026-10-28

- O fluxo de autenticação agora mantém fundo, painel e controles no tema claro mesmo quando o tema global está escuro. A regra vale para login, primeiro acesso/troca de senha, MFA, esqueci minha senha e redefinição de senha, todos renderizados pelo mesmo `AuthPageShell`.
- Escopados os tokens claros em `.login-page` e removido o vínculo com o canvas temático global. A ilustração escura da lateral permanece como imagem do produto; a área de formulário fica clara.
- Verificação local com tema global escuro: `/login`, `/esqueci-senha`, `/redefinir-senha`, `/alterar-senha` e `/mfa` retornaram fundo/painel brancos e `color-scheme: light`. Não foi possível verificar um fluxo autenticado real, produção ou deploy.
- Próximos passos: conferir em produção após o deploy, incluindo recuperação e primeiro acesso com uma conta controlada.

### Desempenho ao abrir “Criar acesso” — 2026-10-28

- A tela de usuários mantinha a tabela inteira montada, inclusive as linhas do diretório escondido, e refazia a busca em cada troca de aba. Isso tornava a navegação pesada quando a lista crescia.
- Busca do diretório agora é memorizada e a tabela exibe 25 contas por página com controles Anterior/Próxima. A lista completa e a busca continuam disponíveis; a aba de criação não precisa renderizar milhares de linhas.
- QA visual no servidor local: “Criar acesso” abriu em 283 ms com os dados de demonstração; formulário e campos apareceram. O diretório mostrou os 3 registros de demonstração. Dataset real grande e produção não disponíveis para reproduzir o travamento.
- Validações aprovadas: `pnpm lint` (TypeScript sem erros), `pnpm test` (5 arquivos, 11 testes), Prettier do componente e `git diff --check`. Nenhuma conta/e-mail real alterado; deploy não verificado.

### QA do cadastro, convite e entrada — 2026-10-28

- Revisados os fluxos no código. Conta nova: administrador cria usuário e vínculo ativo do workspace; Supabase gera link de convite e PierSec tenta enviá-lo pelo Resend. Pessoa define senha de pelo menos 12 caracteres com três grupos de caracteres e configura TOTP antes de acessar. Conta existente: adicionar ao workspace ativa o acesso imediatamente, cria notificação e tenta enviar aviso por e-mail; não exige aceite do convite. Entrada normal exige senha e MFA; recuperação de senha usa link por e-mail e encerra a sessão local após a troca.
- Corrigido limite de 100 usuários: listagem administrativa agora percorre páginas de 1.000 usuários e procura e-mail normalizado em páginas sucessivas. Falha do provedor para a listagem/consulta continua sendo reportada.
- Convite para conta existente não apresenta mais erro se a ativação já ocorreu e apenas o recálculo dos indicadores falhou. A resposta separa o acesso liberado, o estado do e-mail e o estado dos indicadores; a interface informa cada resultado.
- Alinhados nome acessível, marca de login e nome padrão do autenticador para PierSec.
- QA automatizado: `pnpm test` aprovado (5 arquivos, 11 testes), incluindo 3 testes da busca/listagem paginada. `pnpm lint` (TypeScript), Prettier nos arquivos TS/TSX e `git diff --check` aprovados. Documentação Supabase confirma `page`/`perPage` e o uso apenas no servidor ([referência](https://supabase.com/docs/reference/javascript/auth-admin-listusers)).
- Limite da validação: `.env.local` deste computador não configura Supabase; não foi possível testar login real, MFA, convite ou entrega Resend. Nenhuma conta foi criada, e-mail enviado, operação remota feita ou deploy confirmado.
- Próximos passos: depois do deploy, testar com conta controlada em ambiente autorizado: criação e primeiro acesso, login com TOTP, convite de uma conta existente, senha esquecida e falha de e-mail. Conferir a chegada real no provedor, pois aceitação pelo Resend não garante entrega.

### Dashboard em colunas, marcas e paginação da tabela — 2026-10-28

- Botão Exportar para o Canva renderiza somente quando o usuário autenticado tem o e-mail gabriel.goes@piersec.com.br (comparação normalizada). Restrição de visibilidade do componente; não altera as autorizações existentes da API de exportação. Sem sessão ou para outros usuários, botão/modal não são renderizados.
- Reorganizados hero/rankings na coluna principal e os dois gráficos na coluna lateral, cada coluna com fluxo vertical independente. O gráfico por empresa sobe para logo abaixo do gráfico de cliques, eliminando vãos entre linhas de cards com alturas diferentes. Rankings lado a lado têm altura igual.
- Removida a numeração de posição dos rankings de pessoas e substituída por logos circulares das empresas das campanhas que contribuíram para as interações/reportes. Até duas logos aparecem quando há mais de uma empresa; título/nome acessível lista as empresas conhecidas. Sem logo usa inicial da empresa; sem associação conhecida, marcador de empresa não informada, sem inferir vínculo pelo nome ou e-mail. Contagens e ordem dos rankings preservadas.
- Empresa selecionada no filtro (nome e marca) aparece acima de PierSec / Visão geral. Seleção Todas mostra Todas as empresas. Prop opcional mantém os consumidores de apresentação compatíveis sem atribuir empresa incorreta.
- Sete indicadores da tabela recebem altura de 86 px e três linhas internas alinhadas para rótulo/valor/detalhe. Conferência de DOM local confirmou a mesma posição vertical para os sete valores.
- Tabela passa a mostrar 10 campanhas por página, com opções de 20/50, contagem da faixa visível, Anterior/Próxima e transição curta de 140 ms, desativada com movimento reduzido. Filtros, novos dados e mudança do tamanho reiniciam/limitam a página. Paginação afeta somente as linhas, nunca totais e gráficos.
- Controle Mostrar campanhas ocultas movido para o final, após tabela e paginação. Ao expandir, abre a página em que começam os testes; ao recolher volta à primeira página. Testes permanecem no banco, no final da lista e fora dos indicadores.
- Validações aprovadas: TypeScript da aplicação sem diagnósticos após corrigir a passagem das empresas ao segundo ranking, Prettier, git diff --check e detector Impeccable sem apontamentos. Conferência visual desktop claro com demonstração: colunas sem vãos, logo/nome acompanhando seleção e ocultas abaixo da tabela; botão Canva ausente sem sessão. Dataset local tem quatro campanhas e rankings sem dados pessoais; navegação com muitos registros, logos em rankings reais, presença do botão na conta autorizada, escuro/mobile e deploy não foram conferidos em produção. Sem testes automatizados, banco alterado, campanha ou e-mail enviados. Commit/push em main ao concluir.

### Histórico de auditoria operacional — 2026-10-28

- Integrado o componente de histórico enviado pelo usuário como AuditLog reutilizável em components/ui/audit-log.tsx, adaptado ao Base UI, Lucide e tokens existentes. Busca, filtros de responsável/tipo/estado, paginação de 12 itens, detalhes, abrir origem e copiar ID com confirmação/erro. Ações também ficam disponíveis por botão visível e menu de contexto. Não foram instaladas dependências Radix duplicadas nem usados dados fictícios do exemplo.
- Nova página /auditoria, acessível no menu do perfil. Carregamento, erro, ausência de sessão e nenhum resultado são tratados. Troca de workspace/usuário cancela a requisição anterior, invalida a lista e fecha detalhes de outro escopo.
- Nova API GET /api/audit consulta somente metadados das tabelas existentes de solicitações de campanhas e ativos, após autenticação, MFA e autorização administrativa do workspace pelo verificador já usado pelo projeto. Filtro de workspace aplicado às duas consultas; cache privado/no-store e resposta sem payload, conteúdo cifrado, mensagens brutas de erro ou credenciais. Sem escrita no banco ou migration.
- Escopo explícito: até 100 solicitações recentes de cada origem (até 200 no conjunto), com aviso quando há mais registros. Filtros são sobre o recorte carregado. Mostra estado atual e datas da solicitação/finalização, sem prometer trilha imutável de cada transição. Não inclui logins, alterações de usuários, operações BeePhish externas ou ações que nunca foram registradas. Ampliação dessa cobertura exige nova tarefa de instrumentação.
- Validações aprovadas: TypeScript da aplicação (incluindo novos arquivos) sem diagnósticos, Prettier, git diff --check e detector Impeccable sem apontamentos. Conferência visual local desktop claro do estado sem sessão; API local retornou 401 sem token para workspace válido. Não foram usados tokens artificiais nem acessado banco remoto para simular autorização. Registros reais, filtros com dados autenticados, detalhes/contexto e isolamento remoto entre perfis não validados no ambiente de produção.
- Commit/push em main ao concluir; deploy não verificado. Nenhuma campanha ou e-mail enviados. Próximos passos: validar leitura autenticada com administrador/MFA no workspace correto e definir se será necessário registrar também eventos de usuários, login e outras operações.

### Dashboard compacto, detalhes de entrega e controles — 2026-10-28

- Indicadores de entrega/resultados compactados e colocados na mesma linha em telas largas. Falhas e Sem confirmação se tornam um cartão combinado, cujo total só aparece quando a conciliação é válida. Ao clicar, abre modal Base UI com rolagem contida, totais separados e detalhamento por campanha com links; valores desconhecidos continuam explícitos. Não transforma pendências em falhas nem altera dados de destinatários.
- Testes identificados pelo nome ou marcação ficam recolhidos inicialmente. Mostrar campanhas ocultas expande/recolhe os mesmos registros no final da tabela, preservando menu de contexto e banco. Borda da tabela recebe recorte arredondado e border-collapse separado para eliminar pontas.
- Rankings compartilham a largura da coluna principal, com densidade menor, e liberam a coluna lateral para o gráfico Cliques e reportes por empresa: até quatro empresas com mais cliques, duas séries na mesma escala de contagens e valores explícitos. Somente campanhas incluídas nos filtros e indicadores; não representa pessoas únicas. Sem dados inventados.
- Exportação mantém o fluxo PPTX e passa a mostrar Exportar para o + símbolo Canva. Marca monocromática inicialmente e cores da marca somente em hover/foco, com transição curta e movimento reduzido. SVG local proveniente de simple-icons 11.15.0, arquivo icons/canva.svg via jsDelivr (licença CC0 do pacote). Exceção visual restrita à marca solicitada.
- Filtro de período mantém HeroUI v3, com cinco opções na mesma faixa, largura/padding e resumo reorganizados. Botão de sincronização usa fundo preto por token no escuro. Menu do perfil unificado em linhas neutras, sem cartões repetidos; ajustes de fontes, alinhamento, foco inicial, navegação por setas/Home/End e retorno ao acionador por Escape. Fluxos de autenticação, permissões e sincronização preservados.
- Validações: TypeScript da aplicação aprovado sem diagnósticos (incluindo componentes novos), Prettier, revisão do diff e detector Impeccable aprovados. Conferência visual desktop em tema claro com dados de demonstração aprovada para distribuição, gráfico, modal (abertura/fechamento), período Tudo/Dia, menu do perfil e expansão/recolhimento dos testes. Confirmados por DOM o teste oculto/exibido e recorte hidden da tabela; preferências do filtro restauradas ao estado inicial. A prévia antiga precisou ser reiniciada após retornar 404 e depois respondeu HTTP 200. Tema escuro, viewport mobile e dados reais não foram conferidos visualmente nesta tarefa. Sem testes automatizados, migrations, operações de banco, sincronização remota, envio de campanha ou e-mail. Commit/push em main; deploy não verificado. Próximos passos: conferir modalidades claro/escuro, filtros, modal e rankings com dados reais em produção.

### Conciliação das contagens de entrega — 2026-10-28

- Conferida a origem do dashboard: participações e entregas vêm dos agregados; falhas vêm de resultados completos ou error informado, sem inferir falhas pela diferença. Na imagem do usuário, a diferença aritmética é 135 (1.372 menos 1.237 menos zero); isso não confirma 135 rejeições de envio.
- Agrupados Participações, Entregues, Falharam e Sem confirmação na mesma seção, com a equação imediatamente abaixo. Campanhas, abertura, taxa de cliques e reportes ficam em uma segunda seção, evitando confundir o conjunto de entrega. O indicador Sem confirmação e a equação já existiam; esta tarefa melhora sua proximidade e hierarquia.
- Reforçada a validação por campanha: valores inválidos/negativos ou entregas mais falhas acima das participações impedem uma conciliação aparentemente válida por compensação entre campanhas. Nesse caso aparece orientação para sincronizar; sem confirmação fica indisponível. Campanhas de teste continuam excluídas do cálculo.
- Validações aprovadas: Prettier, sintaxe TSX e git diff --check. Não executados testes automatizados, sincronização remota ou alteração de banco. Origem dos 135 registros não foi verificada no serviço remoto. Commit/push em main ao concluir; deploy não verificado. Próximo passo: sincronizar e verificar estados de destinatários no ambiente real para distinguir pendências de falhas efetivas.

### Faixas de criticidade e transição do gráfico — 2026-10-28

- Barras seguem as faixas existentes de maturidade: até 3% verde; acima de 3 até 5% verde-azulado; acima de 5 até 10% amarelo; acima de 10 até 15% laranja; acima de 15% vermelho com aproximação ao vinho em 100%. Cores semânticas por tokens restritos ao gráfico, conforme pedido; sem alterar as fórmulas ou a paleta das outras áreas.
- Ícone de criticidade ao lado de cada percentual, com formato por faixa, nome acessível e título textual. Percentuais continuam em cor neutra; informação não depende apenas da cor. Campanhas de mesma taxa recebem a mesma cor.
- AnimatePresence/motion aplica saída e entrada curtas de 160 ms na troca de página; preferência por movimento reduzido elimina o deslocamento e a duração. Mantidas três campanhas por página e controles fora da região animada.
- Validações: Prettier, sintaxe TSX, detector Impeccable e diff aprovados; conferência visual desktop local com dados de demonstração confirmou cores/ícones em 0%, 20% e 100%. Dataset local tem três campanhas; troca de página com mais registros e tema escuro não foram conferidos visualmente. TypeScript da aplicação aprovado sem diagnósticos. Commit/push em main; deploy não verificado.

### Gravidade e três campanhas no gráfico de cliques — 2026-10-28

- Reduzida paginação de cinco para três campanhas por página, mantendo acesso a todas por Anterior/Próxima, ordenação e filtros.
- Barras recebem uma cor sólida por valor, interpolada entre vermelho suave e vinho em 100%, via tokens restritos ao gráfico. Exceção de cor solicitada pelo usuário, sem mudar a paleta global. Percentual e comprimento continuam informando o valor sem depender da cor. Não é um novo cálculo nem mudança nas faixas de maturidade.
- Removida a explicação final sobre cliques/entregas e o seletor CSS sem uso. Total de entregas e paginação preservados.
- Validações: Prettier, sintaxe TSX e diff; commit/push em main ao concluir. Deploy e conferência visual em produção não verificados.

### Indicadores como rodapé do card principal — 2026-10-28

- Agrupados os quatro indicadores e a linha de andamento/sincronização em um footer semântico único, ancorado à base do hero. O conteúdo ocupa a altura disponível e a primeira linha absorve o espaço extra, evitando área vazia abaixo do rodapé. No celular, mantém empilhamento e indicadores em duas colunas.
- Preservados todos os valores, cálculos, filtros e Liquid Glass. Estilos via tokens, sem nova decoração ou outline.
- Validações: formatação, sintaxe TSX e revisão do diff; commit/push em main ao concluir. Deploy e conferência visual em produção não verificados.

### Remoção dos trechos marcados no hero — 2026-10-28

- Removidas a observação abaixo dos indicadores e toda a seção Próxima ação, incluindo botão e lógica de escolha da campanha. Limpos imports, CSS e áreas de grid sem uso, eliminando também o espaço reservado ao trecho.
- Preservados os quatro indicadores, regras de dados indisponíveis, maturidade em Liquid Glass, campanhas em andamento e sincronização. Nenhum cálculo ou dado alterado.
- Validações: formatação, sintaxe TSX e git diff --check; commit/push em main ao concluir. Deploy e conferência visual em produção não verificados.

### Resumo de risco e envio no card principal — 2026-10-28

- Após esclarecimento pelo material grill-me fornecido pelo usuário, definido resumo equilibrado de risco/envio com próxima ação baseada nos dados. Preenchido o espaço do hero com Entregues, Falhas registradas, Dados enviados e Reportes, mantendo maturidade à direita e informações de sincronização.
- Métricas usam totais existentes dos filtros, sem fórmulas novas. Falhas respeitam failuresAvailable; envios de dados/reportes incompletos aparecem como não informados. Contagens explicam que uma pessoa pode aparecer em mais de uma campanha.
- Próxima ação abre detalhes de uma campanha incluída no filtro: prioriza maior quantidade de envios de dados, depois cliques, depois falhas disponíveis; desempata por ID. Sem sinais positivos, leva à tabela atual. É apenas navegação, sem criar, confirmar ou enviar campanhas. Não representa avaliação de pessoas únicas nem garante cobertura completa de dados ausentes.
- Layout sem cartões aninhados, via tokens do hero, com duas colunas de indicadores no celular, foco por sublinhado/fundo e Liquid Glass preservado. Gráfico adjacente deixa de esticar até a altura do hero para evitar espaço vazio dentro dele.
- Validações: Prettier, detector Impeccable e diff aprovados; conferência visual desktop local com dados de demonstração confirmou indicadores e destino da ação. TypeScript da aplicação aprovado sem diagnósticos. Commit/push em main; deploy não verificado. Nenhuma operação de banco ou envio. Próximo passo: conferir dados reais, estados incompletos e tema escuro no ambiente publicado.

### Rankings de pessoas compactos — 2026-10-28

- Reduzidos padding (28 para 20 px), título (20 para 16 px), avatares (36 para 28 px), espaço antes da lista (28 para 16 px) e altura mínima das linhas (68 para 52 px). Removida a altura mínima de 316 px do card para estados vazios.
- Removido o destaque repetido do maior total no cabeçalho. Uma etiqueta Campanhas identifica a coluna; cada linha mantém número e nome acessível, sem repetir a unidade visualmente. Detalhes de cliques/envio de dados foram abreviados, preservando a unidade em campanhas. Mantidos cinco nomes, desempates, filtros e cálculos.
- Validações aprovadas: Prettier, sintaxe TSX, git diff --check e detector Impeccable sem apontamentos. Sem testes automatizados; conferência visual com dados reais e deploy não verificados. Entrega por commit/push em main. Próximo pedido: definir informações relevantes para o espaço livre do card principal usando a skill grill-me, cuja disponibilidade precisa ser confirmada.

### Comparativo horizontal de cliques — 2026-10-28

- Substituído o gráfico vertical de **Clicados por campanhas** por barras horizontais na escala fixa de 0 a 100%. Nomes completos e clicáveis ficam acima da barra, com percentual alinhado à direita; removidos cortes de texto e rolagem lateral.
- Maiores taxas aparecem primeiro, com desempate por nome/ID. Paginação de cinco campanhas mantém acesso a todas as campanhas recebidas pelo componente, sem aumentar indefinidamente o card. Filtros e exclusões existentes são preservados; nenhum cálculo foi alterado. Mantida a explicação da base alternativa quando não há entregas.
- Layout via tokens, foco por fundo/sublinhado sem outline, estado vazio e controles com nomes acessíveis. Sem novas cores, sombras ou animações decorativas.
- Validação: Prettier e detector Impeccable aprovados. TypeScript da aplicação aprovado sem diagnósticos; git diff --check aprovado. Dashboard compilou e respondeu HTTP 200; conferência visual desktop em tema claro com dados de demonstração confirmou nomes completos, percentuais alinhados e escala das barras. Paginação com mais de cinco campanhas e tema escuro não foram conferidos visualmente nesta tarefa. A página volta ao início quando muda a lista/ordenação. Entrega por commit/push em main; deploy não verificado. Nenhuma alteração de banco ou envio de campanha.

### Alinhamento das camadas do Liquid Glass — 2026-10-28

- Corrigido o contorno duplicado/deslocado da maturidade. A biblioteca mede o painel na montagem e conserva dimensões nas camadas auxiliares; após mudanças no conteúdo/tipografia, essas medidas podem divergir da superfície real.
- Painel agora participa do fluxo normal, sem centralização por transform. Camadas auxiliares ficam ancoradas em inset zero e usam 100% da caixa atual, sem depender da altura em cache. Superfície interna usa flex para evitar espaço de linha do inline-flex. Removidas alturas mínimas do invólucro que poderiam separar contornos. Biblioteca, refração, tooltip em portal e foco sem outline preservados.
- Validações aprovadas: Prettier e git diff --check. Conferência visual no dashboard local com dados de demonstração; medidas do DOM confirmaram mesma posição, largura e altura (260 × 169 px) em todas as camadas, inclusive a superfície interna. Após recarregar os estilos, contorno único confirmado. Entrega por commit e push em main. Nenhuma fórmula, dado, banco ou operação de campanha alterada; deploy ainda não verificado.

### Gráfico de cliques com espaço próprio e recorte do Liquid Glass — 2026-10-28

- Ajustado especificamente o card **Clicados por campanhas**: barras com altura estável de 136 px, separação entre valor/gráfico/nome, nomes completos em até duas linhas e legenda que reorganiza em telas estreitas. Removida a cadeia de alturas percentuais que comprimia as barras conforme a altura do hero. Rolagem horizontal continua restrita ao gráfico, acessível por teclado, sem outline.
- No desktop, a primeira linha usa sete colunas para o hero e cinco para o gráfico; em telas intermediárias o gráfico ocupa uma linha inteira. Os cálculos, campanhas incluídas e filtros permanecem os mesmos.
- Liquid Glass continua usando a biblioteca existente; corrigido o box-sizing das camadas de brilho e aplicado recorte arredondado ao conjunto para impedir pontas fora das bordas. Tooltip continua em portal, fora do recorte.
- Validações: Prettier, revisão do diff e detector Impeccable de layout sem apontamentos. TypeScript da aplicação aprovado, sem diagnósticos. Dashboard compilado e respondendo HTTP 200; conferência visual local em desktop com dados de demonstração confirmou barras com altura própria e contorno arredondado do vidro. A navegação inicial excedeu o tempo limite durante compilação, mas a inspeção posterior funcionou. Não foi validado com os dados reais em produção. Entrega por commit e push na branch main; deploy não verificado. Próximo passo: conferir a aparência no ambiente publicado, principalmente o gráfico com muitas campanhas e os cantos do vidro.

Este arquivo registra o estado do projeto para continuar o trabalho em outro computador ou sessão.

## Regra para próximas alterações

**Sempre que uma tarefa alterar o repositório, atualize este arquivo na mesma tarefa.** Acrescente uma entrada datada em `Histórico`, descrevendo o que mudou, validações executadas, commit/push/deploy quando aplicável e o que continua pendente. Não apague entradas antigas para substituir pelo estado novo. No início de uma sessão em outro computador, leia este arquivo e confira o estado real do Git antes de continuar.

Não inclua neste arquivo chaves, tokens, senhas, códigos de pareamento ativos, endereços de destinatários ou outros segredos. Diferencie claramente código pronto, configuração aplicada em produção e validação ainda não feita.

## Estado do projeto — atualizado em 27/10/2026

### Hero compacto com Liquid Glass, tooltip e entrada dos filtros — 2026-10-27

- Reorganizado o hero padrão em duas colunas: total de campanhas à esquerda e maturidade à direita, com rodapé compartilhado. Reduzidos paddings, tipografia e alturas mínimas do hero/gráfico adjacente para evitar que a maturidade aumente desnecessariamente o card. No celular, a disposição se reorganiza em coluna.
- Adicionada a biblioteca solicitada `liquid-glass-react@1.1.1`, com versão fixa e lockfile. O componente compartilhado `LiquidGlassSurface` usa a biblioteca real, restringe o efeito ao painel de maturidade, remove a sombra externa padrão e mantém fallback com conteúdo durante SSR/hidratação. Elasticidade desativada e ponteiro estático quando movimento reduzido está ativo. O modo padrão evita o modo shader instável da biblioteca; navegadores com refração parcial mantêm conteúdo e aparência de vidro.
- A explicação **Como a maturidade é calculada** passou de disclosure que expandia o hero para tooltip personalizado em portal, com entrada/saída suaves, abertura por hover/foco, acionamento do botão e fechamento gerenciado pelo Base UI. Contém a fórmula e as cinco faixas existentes, sem alterar cálculos, filtros ou exclusões.
- Filtros de empresas ganham entrada horizontal curta, com atraso limitado entre opções e sem repetir a entrada ao apenas selecionar filtros. Arraste e degradês de borda continuam preservados. Animações são desativadas com movimento reduzido.
- Registrada em AGENTS.md a preferência do usuário: quando pedir Liquid Glass, usar a biblioteca rdev/liquid-glass-react pelo componente compartilhado, somente no elemento solicitado, preservando legibilidade e fallback. A preferência não aplica glassmorphism globalmente.
- Validações aprovadas: TypeScript da aplicação com arquivos versionados e exclusões do projeto, Prettier, git diff --check e detector Impeccable sem apontamentos nos componentes avaliados. Importação da biblioteca em Node sem globais de navegador aprovada; dashboard local compilou e respondeu HTTP 200. Conferência visual local em desktop e viewport 390×844 com dados de demonstração: painel à direita no desktop, reorganização no celular, abertura do tooltip pelo botão e fechamento por Escape. Captura local de conferência salva fora dos arquivos versionados. Entrega por commit e push em main. Nenhuma migration, operação remota de banco, campanha ou mensagem enviada. Próximo passo: conferir estados reais e temas no ambiente publicado; deploy não verificado.

### Maturidade no card principal e arraste dos filtros — 2026-10-27

- Removido o card independente de maturidade. A informação agora faz parte do card principal da visão geral: no modo padrão, abaixo do total de campanhas; no modo visual, na área de destaque lateral do hero, substituindo a rosca repetida e o indicador de exposição daquele trecho.
- Componente compartilhado `HeroMaturity` preserva cálculo, faixas e estados de dados incompletos/incoerentes/sem base. O resumo mostra classificação, taxa e base; as cinco faixas e a explicação ficam em **Como a maturidade é calculada**, recolhidas inicialmente para reduzir informação simultânea. Não foram alteradas as demais fórmulas de exposição do modo visual.
- A lista horizontal de empresas ganhou um degradê de transparência suave apenas nas bordas com conteúdo fora da área visível. A indicação acompanha rolagem, redimensionamento e mudanças nas empresas. Arraste com mouse/caneta usa captura após um limiar de movimento e bloqueia o clique gerado pelo gesto, evitando trocar o filtro ao soltar; cliques normais e navegação por teclado continuam disponíveis, e telas de toque mantêm a rolagem nativa.
- Estilos por tokens, sem nova cor, sombra ou outline; degradê restrito à indicação de overflow pedida pelo usuário. Campanhas de teste permanecem no banco, no fim da tabela e fora das métricas, com marcação pelo menu do botão direito.
- Validações aprovadas: TypeScript da aplicação com arquivos versionados e exclusões do projeto, Prettier, git diff --check e detector Impeccable sem apontamentos nos componentes avaliados. Dashboard local respondeu HTTP 200 após as alterações. Atualizado também o consumidor do hero nas apresentações para manter compatibilidade. Entrega por commit e push em main. Nenhuma migration, alteração remota de banco, campanha ou e-mail enviados. Próximo passo: conferir hero e arraste em desktop/mobile, claro/escuro e filtros no ambiente publicado; deploy e conferência visual ainda não verificados.

### Card de maturidade e apresentação de campanhas de teste — 2026-10-27

- Criado um card próprio de **Maturidade** no dashboard padrão e visual, junto dos filtros, substituindo o resumo de classificação que ficava dentro da tabela. Mostra a taxa consolidada de cliques com até duas casas, a base usada, a faixa atual e as cinco faixas definidas pelo usuário. A classificação usa o valor sem arredondamento e acompanha empresa, período e exclusões existentes. Não representa uma avaliação geral de segurança nem soma reportes/envios de dados.
- Sem base, o card informa que não pode classificar; contagem de cliques maior que a base ou inválida pede conferência dos dados. Se não há entregas registradas, mantém a base alternativa de participações, explicitamente indicada. Layout monocromático, responsivo e via tokens, com a faixa atual identificada também por texto.
- Removido o botão visível **Marcar como teste** de cada linha e o CSS sem uso. Marcação e reversão continuam no menu de contexto do botão direito; linhas de usuários com permissão também aceitam foco de teclado para o menu, sem outline/ring.
- Campanhas identificadas como teste, pelo nome ou pela marcação manual, ficam no final da tabela, com apresentação discreta e rótulo explícito. Dentro de cada grupo, as mais recentes vêm primeiro. Elas permanecem no banco e acessíveis; esta tarefa não adiciona exclusão de registros nem altera o conteúdo da RPC. Continuam fora dos indicadores e do cálculo de maturidade.
- Validações aprovadas: TypeScript da aplicação com arquivos versionados e exclusões do projeto, Prettier, git diff --check e detector Impeccable sem apontamentos nos dois cards. Dashboard compilado localmente e respondendo HTTP 200. A conferência visual no navegador foi tentada, mas ficou bloqueada por navegação à página de erro de conexão; não afirmar QA visual concluída. Sem testes automatizados, migration, alteração remota de banco ou envio de campanhas nesta tarefa. Entrega por commit e push em main. Próximo passo: conferir o card nos filtros e a ordem/apresentação das linhas no ambiente publicado; deploy não verificado.

### Critério de pessoas mais recorrentes — 2026-10-27

- Corrigido o ranking **Pessoas mais recorrentes**: agora considera campanhas em que a pessoa clicou ou enviou dados, em vez da quantidade de campanhas recebidas. A mesma campanha conta uma vez no total, mesmo com as duas ações; cada linha mostra os totais de campanhas com clique e com envio de dados separados. Quem apenas recebeu/abriu não entra.
- Ordenação por campanhas com interação; desempate por envios de dados, cliques e nome. O estado de envio de dados também implica clique, seguindo a convenção dos agregados existentes. Os sinais vêm do status sincronizado dos resultados, não de contagem de cada clique repetido.
- O carregamento combina sinais de registros repetidos da mesma pessoa na campanha, sem descartar ações. Mantidos os filtros, exclusões de campanhas de teste e de pessoas internas. O ranking de reportes preserva seu critério.
- Validações aprovadas: TypeScript da aplicação com arquivos versionados e exclusões do projeto, Prettier e git diff --check; detector Impeccable sem apontamentos no card. Sem testes automatizados, migration ou operação remota de banco nesta tarefa. Entrega por commit e push em main. Deploy e conferência visual não verificados.
- Próximo passo: conferir o ranking com resultados sincronizados no ambiente publicado. O projeto Supabase informado pelo usuário é `acwxnnqnfdzsggwzpetl`; a aplicação da migration anterior não foi reconferida nesta tarefa.

### Dashboard, gestão de acessos e integridade dos indicadores — 2026-10-27

- Simplificado o card principal da visão geral: total de campanhas, andamento e sincronização, sem repetir a rosca e as métricas da tabela. Integrado o shader WebGL fornecido pelo usuário em `components/ui/istanblue.tsx`, restrito ao hero, com fundo de fallback, limite de pixels, pausa fora da tela/aba e quadro estático quando movimento reduzido está ativo. Rankings ganharam hierarquia de contagens, iniciais, nomes legíveis, tratamento de empates e reflow no celular.
- Corrigida a rolagem dos modais de workspace, tanto no seletor quanto em Empresas; bloqueio do documento e contenção de overscroll, com ciclo de foco do teclado e restauração ao fechar. Aplicado o mesmo comportamento aos diálogos de clientes e ações de usuários.
- Gerenciar usuários abre no diretório pesquisável. Criação de acesso e vínculo de conta existente foram separados em painéis; formulários, mensagens, permissões e ações existentes foram preservados. Tabela adaptada em linhas agrupadas em telas menores, cores por tokens e foco por fundo/texto/sublinhado, sem outline/ring/sombra de foco.
- O comparativo agora é **Clicados por campanhas**, calculado como clicados / entregues, usando participações quando não há entregas registradas. Cabeçalho e ajuda descrevem a base. Roscas de cliques e o resumo usam as faixas solicitadas: ≤3 excelente/maduro; >3–5 bom; >5–10 aceitável; >10–15 alerta; >15 crítico. A classificação usa o percentual sem arredondamento, com texto e tokens semânticos.
- Conciliação explícita nos cards de Todas as campanhas: participações = entregues + falhas registradas + sem confirmação, somente quando a origem permite calcular o saldo. No exemplo enviado, 7.038 = 6.778 + 7 + 253. O saldo não é tratado como falha e uma soma incoerente não é ocultada como zero.
- Campanhas com `teste` em qualquer parte do nome, sem distinguir maiúsculas, ficam fora dos indicadores. A tabela mantém essas campanhas identificadas para consulta; menu de contexto e ação acessível permitem marcar/desmarcar outras campanhas como teste. A mesma exclusão foi aplicada aos agregados de status, perfil, apresentações, risco e visão geral das campanhas locais. O detalhe individual continua acessível.
- Clientes BeePhish ganhou alternância lista/cards e campo de plataforma: Google Workspace, Microsoft Exchange, outro ou não informado. A plataforma é metadado e não muda credenciais de envio; edições sem alteração desse campo não exigem a coluna nova.
- Migration versionada `20261027183000_campaign_test_flags_and_company_email_provider.sql` adiciona os metadados, autor/horário da marcação e uma RPC restrita à flag, com MFA e autorização de gestão por workspace. Sem ampliação de políticas de acesso às tabelas. **Não aplicada remotamente:** a conexão Supabase disponível nesta máquina aponta para outro projeto, sem as tabelas PierSec. O projeto correto foi solicitado ao usuário. A marcação manual e gravação de plataforma dependem dessa migration. A exclusão por nome já funciona sem ela. Nenhum dado remoto foi alterado.
- Levantamento completo em [docs/calculos-percentuais.md](docs/calculos-percentuais.md): bases, arredondamentos, ausência de dados, conciliação e divergências entre detalhes, modo visual, slides e exportações. As fórmulas de exposição com sobreposição de eventos foram documentadas para decisão posterior, sem alterar silenciosamente o significado das métricas.
- Validações: TypeScript do código-fonte sem diagnósticos; compilação local e HTTP 200 para `/`, `/usuarios`, `/empresas` e `/campanhas/visao-geral`; Prettier e `git diff --check`. `pnpm lint` encontrou referências geradas ausentes em `.next/types`; a checagem alternativa usa a configuração do projeto excluindo somente artefatos gerados. O detector Impeccable apontou apenas duas regras antigas de CSS fora das alterações (borda lateral da documentação e transição de largura). Nenhum teste automatizado foi adicionado/executado. Conferência visual em navegador indisponível porque o uso local está desabilitado no Work; não afirmar validação visual ou deploy.
- A CLI Supabase falhou ao iniciar nesta instalação (binário ausente em duas distribuições); a migration foi escrita e revisada localmente como fallback. Aplicação, consulta de verificação da RPC e validação remota ficam pendentes no banco correto.
- Entrega: implementação `82eb6b8` enviada para `origin/main` em 27/10/2026; deploy não verificado. Redis permanece em standby. Nenhum convite, e-mail ou campanha foi enviado.
- Próximos passos: identificar/conectar o Supabase do PierSec, aplicar a migration revisada, verificar gravação/remoção de teste e plataforma entre computadores, conferir totais reais após sincronização e revisar a interface em desktop/mobile e claro/escuro no ambiente publicado.

### Correção da origem do total de falhas — 2026-10-26

- Identificado no código que o dashboard convertia a ausência de `stats.error` em zero. Agora a contagem de falhas usa os estados individuais quando os resultados correspondem ao total da campanha, preservando os filtros do workspace e a exclusão de pessoas internas. Sem resultados completos ou agregado explícito, o card mostra **Não disponível**.
- A sincronização e o recálculo também normalizam as falhas a partir de resultados completos antes de aplicar exclusões. Estados como **Not Delivered** e **Error Sending Email** são classificados como falha; o rótulo individual deixa de confundir esses estados com entrega ou envio.
- O resumo explica a diferença entre participações e entregues como **sem entrega confirmada**, que pode incluir falhas, pendências ou registros ainda sem atualização. Essa diferença não é usada como total de falhas.
- Validações: `pnpm lint` (TypeScript), Prettier e `git diff --check` aprovados. Nenhum teste automatizado foi adicionado ou executado. A leitura remota de diagnóstico não foi realizada por ausência de configuração de servidor nesta máquina; nenhum dado remoto foi alterado. O total real de falhas e o deploy ainda precisam de conferência no ambiente publicado.
- Entrega: implementação `dc3912c` enviada para `origin/main` em 26/10/2026.
- Próximo passo: conferir o resumo após carregar os resultados e, se necessário, sincronizar as campanhas. Não afirmar que toda a diferença de entrega representa falhas.

### Localização dos indicadores de participações e falhas — 2026-10-26

- Removido **Participações** do resumo dos detalhes da campanha, nos modos padrão e visual. A grade volta a sete indicadores; **Falharam** permanece entre eles.
- Acrescentado **Falharam** aos cards de **Todas as campanhas**, ao lado de **Entregues**, com `totals.errors`. O total acompanha os filtros de empresa e período e usa apenas falhas registradas; mensagens pendentes não são inferidas como erros. **Participações** permanece no resumo consolidado.
- Validações: `pnpm lint` (TypeScript), Prettier e `git diff --check` aprovados. Nenhum teste automatizado foi adicionado ou executado. Deploy não verificado.
- Entrega: implementação `f1671af` enviada para `origin/main` em 26/10/2026.
- Próximo passo: conferir os resumos no ambiente publicado.

### Participações e falhas no resumo da campanha — 2026-10-26

- Acrescentado o card **Participações**, com `stats.total`, nos dois modos da página de detalhes da campanha. O indicador de erros existente agora se chama **Falharam** e continua usando `stats.error`, sem inferir falhas pela diferença entre destinatários e entregues.
- A grade foi ajustada para oito indicadores, com quatro colunas em telas intermediárias e duas no celular. A nota abaixo do resumo explica que participações são os destinatários da campanha e a base dos percentuais.
- Validações: `pnpm lint` (TypeScript), Prettier e `git diff --check` aprovados. Nenhum teste automatizado foi adicionado ou executado. Deploy não verificado.
- Entrega: implementação `77ec3a1` enviada para `origin/main` em 26/10/2026.
- Próximo passo: conferir os oito indicadores no ambiente publicado com os dados sincronizados.

### Sete indicadores nos detalhes da campanha — 2026-10-26

- O resumo da página `/campaigns/[id]` agora tem sete indicadores: **Enviados**, **Entregues**, **Abertos**, **Clicados**, **Dados enviados**, **Reportado** e **Falha na entrega**, conforme a estrutura enviada pelo usuário. O componente compartilhado atende os modos padrão e visual.
- Os valores vêm dos totais sincronizados em `campaign.stats`, em vez de depender da lista parcial de participantes carregada na tela. Os percentuais usam o total de destinatários, e campos ausentes aparecem como **Não disponível**, sem convertê-los em zero.
- Layout com ícones de significado correspondente, contagens de pelo menos dois dígitos, bordas e cores por tokens, sem sombra ou outline. A grade se reorganiza em telas menores; o resumo ocupa a largura disponível nos dois modos.
- Validações: `pnpm lint` (TypeScript), Prettier e `git diff --check` aprovados. Nenhum teste automatizado foi adicionado ou executado. Deploy e conferência visual em produção pendentes.
- Entrega: implementação `4028300` enviada para `origin/main` em 26/10/2026.
- Próximo passo: conferir os indicadores com os totais sincronizados de uma campanha real no ambiente publicado.

### Datas e ordem da tabela de campanhas — 2026-10-26

- A tabela **Todas as campanhas** agora exibe a coluna **Início**, próxima ao nome da campanha, com data e horário de Brasília a partir de `launch_date`.
- As linhas são ordenadas da data de início mais recente para a mais antiga. Datas ausentes ou inválidas aparecem como **Não informada** no final; o ID desempata datas iguais. A ordenação é local à tabela, preservando os critérios dos demais gráficos.
- Ajustados o cabeçalho, a distribuição das nove colunas e o agrupamento dos dados em telas menores. Removida a indicação de maior alcance, que não descreve a nova ordem. Os detalhes de ajuda usam tokens, sem sombra, com foco por fundo e sublinhado, sem outline.
- Validações: `pnpm lint` (TypeScript), Prettier e `git diff --check` aprovados. Nenhum teste automatizado foi adicionado ou executado; deploy e aparência em produção ainda não verificados.
- Entrega: implementação `24f306c` enviada para `origin/main` em 26/10/2026.
- Próximo passo: conferir as datas sincronizadas e o layout no ambiente publicado.

### Princípios de Gestalt e UX — 2026-10-26

- Acrescentados ao `AGENTS.md` critérios práticos para Proximidade, Semelhança, Fechamento, Continuidade, Pregnância, Unidade, Fitts, Jakob, Hick-Hyman, Miller, usabilidade estética, Navalha de Occam e Postel.
- A diretriz de Postel esclarece que aceitar variações comuns e seguras não flexibiliza validações de autenticação, autorização, segredos, dados pessoais ou operações de campanha. A referência de Miller é aproximada, não um limite rígido para tabelas ou listas.
- Mudança somente documental. Validações: leitura do diff, Prettier e `git diff --check`; nenhum teste automatizado é aplicável. Nenhum deploy.
- Próximos passos: aplicar esses critérios nas próximas mudanças de interface.

### Rankings de pessoas no dashboard — 2026-10-26

- Os painéis “Sinais da operação” e “Risco humano” foram substituídos por **Pessoas mais recorrentes** e **Pessoas que mais reportam** na visão geral do dashboard.
- Os rankings seguem a empresa e o período ativos. Recorrência conta em quantas campanhas filtradas a pessoa aparece; reportes contam em quantas dessas campanhas a pessoa reportou uma mensagem. Cada lista mostra até cinco nomes e a contagem correspondente.
- Os resultados são consultados em páginas no workspace ativo, respeitam a lista de e-mails excluídos e não exibem endereços de e-mail nos rankings. Com estado de carregamento, workspace sem dados ou sem resultados, a interface mostra uma mensagem correspondente.
- Validações: `pnpm lint`, Prettier e `git diff --check` aprovados. Não foram adicionados nem executados testes automatizados, conforme as instruções do repositório. Deploy ainda não verificado.
- Próximos passos: conferir os rankings com dados reais após sincronizar o workspace. Nenhuma migration foi necessária.

### Preencher modelo PowerPoint do Canva — 2026-10-16

- A janela **Exportar para Canva** agora aceita arrastar ou escolher um `.pptx` exportado do Canva. Ela detecta os marcadores, informa quantos campos PierSec encontrou e avisa sobre marcadores sem correspondência antes de gerar o arquivo.
- O usuário adiciona marcadores de texto no modelo, como `{{empresa}}`, `{{periodo}}`, `{{taxa_abertura}}` e `{{campanha_1_nome}}`. A lista completa de campos gerais e por campanha está no próprio modal e em `templates/pptx/README.md`. Os valores vêm dos filtros ativos e do ranking do dashboard; campos de campanhas podem ser numerados de 1 a 250.
- O modelo é processado no navegador com JSZip e não é enviado nem salvo no servidor. O fluxo valida `.pptx`, limita arquivo a 20 MB, slides a 100 e conteúdo descompactado a 150 MB. O layout, as imagens e os estilos existentes são mantidos; cada marcador deve estar em um único trecho de texto.
- O modelo padrão PierSec continua disponível como alternativa. Marcadores desconhecidos permanecem no arquivo e são avisados antes/depois da geração. Não houve alteração no fluxo de autenticação ou nas rotas de campanha.
- Validações: `pnpm lint` (TypeScript), Prettier e `git diff --check` aprovados. Não foi executada suíte automatizada; não foi fornecido um `.pptx` real do Canva para validar a compatibilidade final, e não houve deploy.
- `tsconfig.json` agora exclui `.next-verification`, pasta temporária do build anterior, para que a checagem de TypeScript não percorra arquivos gerados.
- Próximo passo: soltar o modelo real exportado do Canva no painel e conferir se os campos do design usam os marcadores suportados.

### Exportação de relatórios para Canva — 2026-10-16

- Adicionado ao dashboard o botão **Exportar para Canva**. O resumo acompanha a empresa e o período selecionados e inclui métricas agregadas, o logo local quando disponível e as campanhas filtradas ordenadas por cliques. A tabela é dividida em páginas de cinco campanhas, com limite explícito de 250 por arquivo.
- O modo de arquivo `.pptx` gera a apresentação no servidor com `pptx-automizer`; o modelo de exemplo tem capa, resumo de métricas e tabela de campanhas. `pnpm templates:pptx` regenera o `templates/pptx/base.pptx` usando o script versionado. O README documenta as formas nomeadas e como trocar o modelo pelo design final.
- `POST /api/export/pptx` exige sessão Supabase com MFA e associação ativa ao workspace. A rota valida o schema e os campos pelo manifesto, limita o payload, aceita somente logos PNG/JPEG locais em data URL e não busca URLs externas. A exportação não leva nomes, e-mails ou outros dados individuais dos destinatários. O arquivo usa MIME de PPTX e `Cache-Control: private, no-store`.
- O modal orienta como importar o arquivo no Canva. A opção de criação direta no Canva segue desabilitada com a mensagem **Em breve (requer Canva Enterprise)**. Não foi criada integração OAuth/API do Canva, migration, configuração remota ou publicação.
- Validações: `pnpm lint` (TypeScript) aprovado; Prettier aprovado; `git diff --check` aprovado; dois arquivos de teste, três casos, aprovados. O teste do gerador confirmou quatro slides no cenário com páginas extras de campanhas.
- Entrega no Git: commit `c029387` enviado para `origin/main` em 16/10/2026. O código está no repositório; nenhum deploy de produção foi executado.
- O build padrão `pnpm build` parou ao tentar ler `.next/diagnostics/framework.json`, pois `.next` está marcado pelo Windows como ponto de nova análise do OneDrive (`EINVAL`). Tentei `next build` com uma pasta de saída temporária; a compilação iniciou, mas repetiu falhas de rede ao baixar as fontes Google usadas por `app/layout.tsx` e `app/not-found.tsx`, então interrompi a tentativa. Não houve deploy nem importação real no Canva.
- A pasta local de saída `.next-verification/` ficou como artefato não versionado; ela foi acrescentada ao `.gitignore`. A tentativa de removê-la com `Remove-Item -Recurse` foi bloqueada pela política da ferramenta, então a limpeza fica pendente no computador atual.
- Próximos passos: abrir um `.pptx` exportado no PowerPoint e importar no Canva; substituir o modelo de exemplo por um `.pptx` final fornecido pelo responsável; implementar o modo direto no Canva apenas depois de aprovar e preparar as credenciais/conta Enterprise.

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

### 2026-10-16 — Período compacto na barra de empresas

- Removido o card de período abaixo das empresas. O filtro agora compartilha a barra das empresas, com botão arredondado que mostra o intervalo aplicado e abre um Popover HeroUI. Os seletores de dia, semana, mês e ano, navegação, contagem e aviso sobre métricas acumuladas ficam dentro do popover; alterações continuam aplicadas imediatamente.
- Mantidos os controles HeroUI de calendário, mês e ano e os limites de datas existentes. O painel tem largura limitada à tela e os controles refluem em telas estreitas. O botão Personalizar do modo visual continua acessível na mesma barra.
- Registrada no AGENTS.md a regra obrigatória de nunca usar outline ou simulá-lo com ring/sombra. O foco por teclado usa preenchimento e sublinhado; a política global remove outline e sombras de foco, inclusive nos controles HeroUI.
- Validações: `pnpm exec tsc --noEmit`, Prettier e `git diff --check` passaram; `pnpm build` concluiu com sucesso e gerou 69 páginas. Nenhum teste automatizado, envio de campanha ou operação remota de banco/infraestrutura foi executado. O commit `5044f30` foi enviado para `origin/main`; não confirmei o deploy da Vercel nem validei visualmente o site publicado. Próximo passo: conferir a aparência e interação no site publicado, nos dois temas e em tela estreita.

### 2026-10-16 — Filtro de período com controles HeroUI

- Reorganizado o filtro do dashboard: intervalo aplicado e contagem aparecem juntos, navegação usa botões HeroUI com ícones e alvos de 44 px; o atalho contextual mostra Hoje, Esta semana, Este mês ou Este ano e fica desabilitado no período atual.
- Dia e semana usam DatePicker/Calendar em português, com semanas iniciando na segunda-feira e validação até hoje. Mês usa Select de meses e NumberField para ano; ano usa somente NumberField. Meses futuros do ano atual ficam desabilitados; ao voltar ao ano atual, o mês é ajustado caso necessário.
- Cálculo dos limites usa CalendarDate e o fuso local; o fim continua exclusivo para preservar o filtro por início da campanha. Não se trata de filtrar a data dos eventos: as métricas continuam acumuladas por campanha, conforme o aviso da interface.
- O layout móvel quebra os atalhos em linhas, sem scroll horizontal, e reorganiza os campos em telas estreitas. Novos estilos usam tokens, foco visível e superfícies sem sombras; sem novas dependências.
- Validações: `pnpm exec tsc --noEmit`, `pnpm build` (69 páginas), Prettier e `git diff --check` passaram. Detector Impeccable do componente: zero alertas. Nenhum teste automatizado ou operação de campanha foi executado.
- Entrega: commit `ab58baa` enviado para `origin/main`; deploy e interação visual em navegador ainda não confirmados. Próximo passo: conferir calendário, seleção de mês/ano, navegação e foco no site publicado, nos dois temas e em telas estreitas.

### 2026-10-13 — Remoção da coluna Participações

- Removida a coluna Participações da tabela do dashboard, incluindo os avatares e o destaque por linha. As oito colunas restantes receberam novas larguras, com mais espaço para campanha, empresa e status; o estado vazio foi ajustado para oito colunas.
- Removidos os helpers e props de avatares que ficaram sem uso nesse componente. O indicador agregado de participações acima da tabela e os dados usados pelo modo visual continuam funcionando.
- Validações: `pnpm exec tsc --noEmit`, Prettier e `git diff --check` passaram. Detector Impeccable do componente: zero alertas. Nenhum teste automatizado foi executado.
- Entrega: commit `1099b10` enviado para `origin/main`; deploy ainda não confirmado. Próximo passo: conferir a tabela publicada com oito colunas.

### 2026-10-13 — Resumo sem scroll horizontal e status coloridos

- Removidos a largura mínima de 1040 px e o scroll horizontal da tabela. No desktop, as nove colunas dividem a largura disponível; nomes quebram linha e participações refluem. Abaixo de 1000 px, cada campanha reorganiza os campos em duas colunas com rótulos, preservando todos os dados.
- Retirado o padding da imagem da empresa, mantendo o formato circular e a proporção da logo.
- Conforme o pedido explícito por cor nos status, “Em andamento” usa âmbar e “Concluída” usa verde. A exceção fica restrita a esses status, com tokens próprios para os temas claro e escuro e rótulos textuais preservados.
- Validações: `pnpm exec tsc --noEmit`, Prettier e `git diff --check` passaram; detector Impeccable do componente retornou zero alertas. Contraste dos status: 6,02:1 e 6,74:1 no claro, 9,52:1 e 8,31:1 no escuro. Nenhum teste automatizado foi executado.
- Entrega: commit `66511f5` enviado para `origin/main`. Inspeção visual e deploy ainda não confirmados nesta sessão. Próximo passo: conferir o layout publicado em desktop/mobile com nomes longos e logos reais.

### 2026-10-13 — Avatares circulares e cliques simplificados

- Na tabela de resumo, o ícone da campanha e a logo da empresa agora são totalmente circulares; imagens e iniciais continuam herdando o raio do contêiner. A alteração do ícone da campanha está limitada à tabela.
- Removida a contagem ao lado da rosca de cliques, conforme a captura anotada. O percentual e sua descrição acessível permanecem; os dados e o cálculo não foram alterados.
- Validações: Prettier, `pnpm exec tsc --noEmit` e `git diff --check` passaram; detector Impeccable do componente retornou zero alertas. Nenhum teste automatizado foi executado.
- Entrega: commit `f77a3d7` enviado para `origin/main`; publicação ainda não verificada. Próximo passo: conferir os dois ícones circulares e a coluna de cliques publicada.

### 2026-10-13 — Empresas e taxas no resumo de campanhas

- Corrigido o formato do avatar de campanha: imagem e fallback herdam o mesmo raio do contêiner, com borda de 1 px e fundo por tokens, eliminando os cantos pretos causados pela combinação de círculo e quadrado.
- A tabela do dashboard padrão passou a mostrar Empresa com nome e logo cadastrados, usando a associação real `company_id`. Sem logo, usa a inicial; sem associação reconhecida, informa “Empresa não informada”. A lista já carregada de empresas do workspace fornece os dados, incluindo empresas inativas vinculadas a campanhas antigas, sem nova consulta ou alteração de banco.
- Abertura e taxa de cliques agora têm roscas SVG com percentual central e descrição acessível. A contagem de cliques continua ao lado. Status em andamento usa fundo de alto contraste; concluída usa superfície neutra e outros estados usam borda fina, em ambos os temas.
- Validações: Prettier nos cinco arquivos alterados, `pnpm build` (69 páginas geradas), `pnpm exec tsc --noEmit` após o build e `git diff --check` passaram. O detector Impeccable nos componentes revisados retornou zero alertas. A primeira execução isolada de TypeScript coincidiu com a recriação de `.next/types` pelo build e apontou arquivos gerados ausentes; a repetição após o build terminou sem erros. Nenhum teste automatizado ou operação remota foi executado.
- Entrega: commit `15126b9` enviado para `origin/main`. Publicação e inspeção visual em navegador ainda não confirmadas nesta sessão. Próximos passos: conferir a tabela publicada com logos reais, nos temas claro/escuro e em viewport estreito.

### 2026-10-09 — Correções da auditoria UI/UX

- A lista de campanhas ganhou tipografia operacional maior, causa de falha legível, botão por linha com alvo de 44 px e instrução visível de rolagem horizontal em telas estreitas. O painel de atividade individual também teve texto e controles ampliados. `--text-muted` do tema claro passou a `#666666` para superar a meta de contraste nas superfícies claras.
- Os estados conhecidos do detalhe das campanhas importadas agora recebem rótulos em português, incluindo envio de dados e falha; sinais e filtros continuam com a classificação correta. A exportação de clicados foi colocada junto da lista de pessoas nos dois modos, com explicação de que ignora o filtro visual. A documentação acompanha a mudança.
- O menu de campanhas agrupa as oito rotas em Acompanhar, Preparar e Configurar. A paginação ganhou rótulos acessíveis em português e alvos maiores. O detalhe visual passou a ter filtros com estado acessível, foco visível e texto maior.
- O gráfico de abertura mantém nomes completos nos dados e no tooltip, mesmo com eixo abreviado; foi removido um link que apontava para a própria seção. A página de workspaces evita mostrar “nenhum” enquanto carrega e apresenta uma recuperação para falha de leitura.
- O registro da auditoria de 08/10 foi encerrado após tratar os cinco itens priorizados P1/P2.
- Validações: `pnpm exec tsc --noEmit`, Prettier nos arquivos alterados, `pnpm build`, detector Impeccable (zero alertas nos componentes revisados) e `git diff --check` concluídos. O texto muted do tema claro agora mede entre 5,31:1 e 5,74:1 nas superfícies verificadas. Nenhuma campanha, destinatário, configuração remota ou migration foi alterada.
- Entrega: commit `b7364d3` enviado para `main`. A rota de produção `/campanhas` foi recarregada e confirmou o menu agrupado, os rótulos traduzidos da paginação e a tabela com a pista de rolagem disponível no breakpoint estreito. A inspeção visual em desktop confirmou a hierarquia do menu. Nenhuma operação de campanha foi executada.
- Próximos passos: validar visualmente em viewport móvel estreito e conferir os dois temas; revisar a ação de exportação no detalhe da campanha durante a próxima sessão de QA com dados de teste controlados.

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
