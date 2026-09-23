# Design QA — arte da troca de senha

## Artefatos e estado

- Fonte visual: `C:\Users\GabrielMorgadoGoes\Downloads\ChatGPT Image 22 de set. de 2026, 19_31_56.png`.
- Captura da implementação: captura inline do navegador Codex In-app Browser em `http://127.0.0.1:3003/alterar-senha`; a ferramenta não disponibilizou um caminho local para exportar o screenshot.
- Viewport: 908 × 638 CSS px, DPR 1,25. Captura retornada: 907 × 638 px, normalizada pelo navegador para pixels CSS (diferença de 1 px na largura por arredondamento).
- Fonte: 1672 × 941 px, PNG a 1×; sem redimensionamento da fonte antes de renderizar.
- Estado: renderização inicial não autenticada (“Verificando seu acesso…”). A rota redirecionou depois; nenhum formulário foi enviado e nenhuma ação de conta foi executada.
- A referência fornecida é a arte isolada, não um layout completo da tela. A comparação de layout considera, portanto, o shell de autenticação existente e a fidelidade/crop da arte no painel visual.

## Comparação

- Visão completa: o formulário e a hierarquia existentes permanecem à esquerda; a arte ocupa o painel direito, dentro do recorte arredondado já usado pelo produto.
- Região focal: a pessoa sob a iluminação âmbar e a chave dourada continuam visíveis no crop central, sem distorção. O tratamento escuro da própria arte mantém contraste com a legenda existente.
- Tipografia: a arte não contém texto. Tipografia e copy da tela foram preservadas, sem mudanças.
- Espaçamento e ritmo: layout split existente preservado; a imagem preenche o painel com `object-fit: cover` e não afeta as dimensões do formulário.
- Cores: paleta azul-marinho e âmbar da arte preservada; nenhum token ou cor do formulário foi alterado.
- Qualidade/fidelidade do asset: arquivo enviado pelo usuário copiado sem edição para `public/password-reset-artwork.png` e renderizado sem esticar.
- Conteúdo: copy da tela de primeiro acesso mantida; nenhuma nova instrução foi introduzida.

## Findings

- Nenhum problema visual P0, P1 ou P2 observado na captura desktop.

## Limites e refinamentos

- P3 — Não capturei o formulário autenticado nem uma viewport móvel: abrir a tela autenticada poderia avançar o fluxo de segurança, e a referência só define a arte. A regra responsiva existente mantém a imagem acima do formulário em telas menores; a interação e os campos não foram modificados.

## Checklist

- [x] Arte exata aplicada à tela existente `/alterar-senha`.
- [x] Crop desktop inspecionado; pessoa e chave permanecem no enquadramento.
- [x] TypeScript verificado.
- [x] Testes: 2 arquivos, 5 testes aprovados.
- [x] `git diff --check` sem erros.

final result: passed

---

# Design QA — página 404 do Figma

## Artefatos e estado

- Fonte visual: [frame Figma 105:24](https://www.figma.com/design/qCkRPKTQMKNyqzBN7EztnX/Untitled?node-id=105-24), 1672 × 941 px.
- Implementação: rota inexistente `http://127.0.0.1:3004/this-page-should-not-exist-404-preview`, renderizada pelo navegador Codex In-app Browser. A captura ficou disponível inline; a ferramenta não forneceu um caminho local para exportá-la.
- Comparação visual lado a lado: captura temporária `/figma-404-qa.html`, exibindo Figma e implementação em painéis iguais de 1024 × 576 CSS px; a página auxiliar foi removida depois da captura. Saída combinada: 2048 × 576 px; DPR 1. O frame Figma (1672 × 941) foi reduzido proporcionalmente para 1024 × 576; sem distorção.
- Viewports adicionais: implementação a 1672 × 941 e 390 × 844 CSS px. O override do navegador foi restaurado para o padrão (908 × 638) antes do handoff.
- Estado: tema claro, URL inexistente, link de retorno para `/`. O aviso global de cookies foi dispensado no navegador local de QA; nenhum formulário foi enviado.
- Console: sem erros; houve apenas um aviso de Fast Refresh durante a atualização de desenvolvimento.

## Comparação

- Visão completa: a arte ocupa a tela toda e o botão de vidro fica no centro, como no frame. Na comparação normalizada, horizonte, jangada, personagem e botão se alinham; ambos mantêm o mesmo recorte 16:9.
- Região focal — botão: o Figma define 357 × 76 px na moldura de 1672 × 941 px. Na captura 1024 × 576, a implementação escala proporcionalmente para cerca de 219 × 47 px, centralizada, com preenchimento cinza translúcido, blur, cantos pill e seta SVG exportada do próprio Figma.
- Tipografia: Montserrat SemiBold 600, branca; o tamanho acompanha a escala do frame (12,3 px no painel de 1024 px; 20 px na moldura original). O texto visual é “Voltar ao Inicio”, igual ao Figma; o `h1` acessível fica oculto visualmente.
- Espaçamento/ritmo: dimensões e posições proporcionais ao frame; link centralizado em ambos os eixos. Em retrato, o fundo permanece `cover` e recorta as laterais; o botão fica acima do personagem sem cobrir seu rosto.
- Cores: preservado o azul/ciano da arte e o botão em `rgba(164,164,164,0.1)`; sem gradiente ou card adicional.
- Imagem/ícone: arte Figma local em `public/not-found-ocean-artwork.png` (1672 × 941) e seta Figma em `public/not-found-back-arrow.svg`; sem substitutos desenhados em CSS.
- Conteúdo: a tela mostra apenas a arte e a ação de retorno, além de um título 404 acessível a leitores de tela.

## Histórico e findings

- Primeira versão anterior a esta referência: card branco, texto explicativo e ação no alto à esquerda. Isso divergia materialmente do frame; removi card e copy, substituí pelo pill translúcido central e pela seta do Figma.
- Comparação pós-ajuste: captura lado a lado em 1024 × 576 não revelou diferença visual P0/P1/P2 que bloqueie a correspondência.
- P3 — Em primeira visita, o aviso global de cookies pode se sobrepor à parte inferior da ilustração até ser dispensado. Ele é compartilhado pelo restante do produto e ficou fora desta alteração.
- P3 — O indicador “N” visível na captura de desenvolvimento é do Next.js e não aparece em produção.

## Checklist

- [x] Frame 105:24 usado como fonte visual; captura Figma e implementação vistas lado a lado.
- [x] Arte, Montserrat e seta exportada usados no app.
- [x] Link acessível testado: abre `/`; desktop e móvel conferidos.
- [x] TypeScript, Prettier, `git diff --check` e 5 testes aprovados.

final result: passed
