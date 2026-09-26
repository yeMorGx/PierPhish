# MCPs e fontes de referência visual

Este documento registra o estado das integrações de design verificadas em 26/09/2026 e como usá-las com o Codex neste projeto.

## Resumo do estado

| Fonte | Integração encontrada | Estado neste computador |
| --- | --- | --- |
| [MotionSites AI](https://motionsites.ai/mcp) | MCP remoto por HTTP | Configurado como `motionsites`; OAuth concluído |
| [OriginKit](https://www.originkit.dev/docs/components) | MCP remoto por HTTP | Configurado como `originkit`; requer `ORIGINKIT_API_KEY` |
| [Refero](https://refero.design/mcp) | MCP remoto por HTTP | Configurado como `refero`; OAuth concluído |
| [React Bits Pro](https://pro.reactbits.dev/docs/mcp) | MCP oficial baseado no servidor do shadcn + registries | Servidor `shadcn` configurado; registry/licença ainda não adicionados |
| [Spell UI](https://spell.sh/docs/mcp) | MCP baseado no servidor do shadcn + registry | Servidor `shadcn` configurado; registry ainda não adicionado |
| [Loading.dev](https://loading.dev/) | Biblioteca React/npm, sem MCP oficial encontrado | Usar como pacote ou copiar o componente |
| [Unlumen UI](https://ui.unlumen.com/) | Registry shadcn, sem MCP próprio encontrado | Usar o registry/código-fonte |
| [Bencho](https://bencho.dev/) | Blocos interativos para copiar, sem MCP encontrado | Usar a página e copiar o código |
| [Osmo](https://www.osmo.supply/) | Biblioteca de recursos Webflow/HTML, sem MCP encontrado | Usar o Vault/demo conforme a conta |
| [Inspora](https://www.inspora.design/) | Catálogo de inspiração, sem MCP encontrado | Usar para pesquisa visual |

“Configurar” um MCP remoto não baixa um pacote para o projeto: registra o endpoint na configuração global do Codex. Componentes/registries só devem ser adicionados ao repositório quando houver necessidade concreta e depois de revisar licença, dependências e acessibilidade.

## MCPs já configurados no Codex

Confira o estado atual com:

```powershell
codex mcp list
```

Os registros criados são:

```powershell
codex mcp add motionsites --url https://xgdzyqfalbibzelpdpvr.supabase.co/functions/v1/mcp

codex mcp add originkit --url https://mcp.originkit.dev/mcp --bearer-token-env-var ORIGINKIT_API_KEY

codex mcp add refero --url https://api.refero.design/mcp

# Neste computador, npx não está disponível; o shadcn usa o binário local.
codex mcp add shadcn -- pnpm exec shadcn mcp
```

O `shadcn` foi instalado como dependência de desenvolvimento (`shadcn@4.21.0`) e o build necessário do `esbuild` foi aprovado somente para este projeto. O `components.json` ainda precisa ser criado/configurado antes de instalar itens de registries.

Não há tokens ou chaves neste repositório. O OAuth é autorizado no navegador quando necessário. Para o OriginKit, configure a chave apenas no ambiente local do usuário e reinicie o Codex:

```powershell
[Environment]::SetEnvironmentVariable("ORIGINKIT_API_KEY", "<sua-chave-do-origin-kit>", "User")
```

Substitua o marcador localmente; não coloque a chave em `.env` versionado, `CHANGELOG.md`, commit ou prompt compartilhado.

## Como usar cada MCP

### MotionSites AI

O MCP consulta prompts de design de sites e seções. Ele é adequado para pesquisar direção visual, composição, hierarquia e referências de landing pages; não deve ser tratado como fonte de dados operacionais do PierSec.

Exemplos de pedidos:

```text
Use o MotionSites para encontrar três referências de dashboard SaaS escuro, com alto contraste, navegação lateral e métricas de risco. Resuma apenas padrões de layout, tipografia e interação que possam ser adaptados ao PierSec.

Pesquise no MotionSites referências para um hero de monitoramento de segurança. Não copie marca, textos ou imagens; extraia somente composição, ritmo e microinterações.
```

O primeiro uso pode abrir a autorização OAuth. A conta gratuita pode ter limite de consultas; a própria página do MCP informa o limite vigente.

### OriginKit

O OriginKit expõe um catálogo de componentes executáveis e adaptados ao stack solicitado. As operações documentadas são `list_components`, `search`, `get_component` e `fetch`.

Exemplos de pedidos:

```text
Use o OriginKit para pesquisar componentes de status, métricas e gráficos para um dashboard React + Next.js + TypeScript. Não instale nada ainda; liste opções, dependências e riscos de acessibilidade.

Busque um componente de card de risco no OriginKit, adaptado para Next.js, TypeScript e Tailwind. Retorne o código somente depois de eu escolher o componente.
```

Antes de solicitar código, peça ao agente para ler `package.json`, `tsconfig.json` e as convenções do componente que será alterado. A chave é lida da variável `ORIGINKIT_API_KEY`; nunca deve aparecer no frontend.

### Refero

O MCP do Refero pesquisa telas e fluxos reais para apoiar decisões de UX/UI. Ele é útil para investigar padrões de onboarding, tabelas, estados vazios, permissões, filtros e dashboards antes de escrever código.

Exemplos de pedidos:

```text
Use o Refero para pesquisar dashboards de segurança e risco com navegação lateral. Compare três padrões de hierarquia, densidade, filtros e estados vazios; não copie a identidade visual de um produto específico.

Pesquise no Refero fluxos de revisão e confirmação para uma ação potencialmente destrutiva. Traga padrões de prévia, confirmação explícita, feedback e histórico de auditoria.
```

O endpoint usa OAuth. A página oficial informa que o acesso ao MCP está incluído no plano Pro. Para pesquisa de estilo sem o MCP, também é possível abrir um estilo no Refero Styles e exportar um `DESIGN.md` para revisão manual.

### React Bits Pro

O React Bits Pro não possui um endpoint MCP independente: ele usa o servidor MCP oficial do shadcn para consultar os registries `@reactbits-starter` e `@reactbits-pro`. Para habilitá-lo em um projeto compatível:

1. Inicialize o shadcn no projeto e confirme que existe `components.json`.
2. Coloque a licença em `.env.local` como `REACTBITS_LICENSE_KEY`, sem versioná-la.
3. Adicione os dois registries usando o bloco fornecido na [documentação oficial de instalação](https://pro.reactbits.dev/docs/installation).
4. Inicialize o MCP para o cliente desejado, conforme a [documentação oficial do shadcn](https://ui.shadcn.com/docs/mcp). Para Codex, use o cliente `codex`:

```powershell
pnpm dlx shadcn@latest mcp init --client codex
```

5. Reinicie o cliente e faça pedidos que indiquem o registry:

```text
Liste os componentes disponíveis no registry @reactbits-starter.

Encontre um bloco de dashboard em @reactbits-pro e mostre dependências, licença e arquivos que serão alterados antes de instalar.
```

O React Bits Pro exige licença para o catálogo correspondente. Não adicionar um registry autenticado sem a chave do usuário e sem revisar o plano/licença.

### Spell UI

O Spell UI também usa o MCP do shadcn, mas o registry é público e documentado na página oficial:

```json
{
  "registries": {
    "@spell": "https://spell.sh/r/{name}.json"
  }
}
```

Depois de inicializar o shadcn MCP, os pedidos podem ser feitos assim:

```text
Pesquise no registry @spell um componente de gráfico interativo e mostre a API antes de instalar.

Adicione o componente @spell/label-input somente se ele for compatível com as convenções atuais do formulário e com navegação por teclado.
```

O Spell entrega código React/Tailwind no projeto. Revise dependências, `prefers-reduced-motion`, contraste e o comportamento em telas pequenas antes de incorporar.

## Fontes sem MCP próprio encontrado

Estas fontes continuam úteis, mas não devem ser adicionadas ao Codex como servidores MCP inexistentes:

- **Loading.dev:** a página oficial oferece a biblioteca `loading-dev` para React. Use `pnpm add loading-dev`, leia a API e escolha loaders que comuniquem espera real; não use animação para mascarar operações travadas.
- **Unlumen UI:** oferece componentes e primitives para React/shadcn por registry. Use a documentação/código-fonte e mantenha os componentes editáveis no repositório.
- **Bencho:** oferece blocos interativos ao vivo para pressionar, arrastar, selecionar e digitar. Use-o como referência de microinteração; copie apenas o código necessário após revisar acessibilidade.
- **Osmo:** oferece recursos Webflow/HTML, easings, ícones e exemplos de transição. A maior parte depende de acesso ao Vault/membership; use como referência de técnica, não como MCP.
- **Inspora:** funciona como catálogo de inspiração visual. Use para comparar composição, espaçamento e direção de arte, sem incorporar imagens ou identidade de terceiros sem licença.

## Regras para usar referências no PierSec

- Usar referências para extrair padrões, não para copiar marca, textos, imagens ou identidade de terceiros.
- Não enviar para esses serviços chaves, tokens, dados de pessoas, destinatários, conteúdo de campanhas, credenciais ou informações do Supabase.
- Não instalar componentes automaticamente em fluxos de campanhas, autenticação, MFA, workspaces ou RLS sem revisão específica.
- Antes de incorporar código, conferir licença, dependências, tamanho do bundle, acessibilidade, responsividade e `prefers-reduced-motion`.
- Para mudanças visuais do PierSec, preservar o nome PierSec e a linguagem operacional do produto; referências de landing page devem ser adaptadas ao contexto de dashboard.

## Diagnóstico rápido

```powershell
codex mcp list
```

- **OAuth pendente:** reinicie o Codex e faça um pedido simples ao MCP para reabrir a autorização.
- **OriginKit sem acesso:** confira se `ORIGINKIT_API_KEY` existe no ambiente do usuário; não cole a chave no terminal compartilhado.
- **React Bits/Spell sem ferramentas:** confirme `components.json`, registries e o arquivo MCP gerado pelo shadcn; depois reinicie o cliente.
- **Instalação do shadcn falha:** atualize Node/pnpm e tente novamente no projeto; não force uma instalação global quebrada nem versiona cache de pacote.
