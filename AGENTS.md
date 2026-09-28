# Instruções para trabalhar neste repositório

Estas instruções valem para qualquer IA ou pessoa que continue o projeto em outro computador. Leia também o `CHANGELOG.md`: ele registra o estado mais recente e a fila de próximos passos.

## Ao iniciar uma sessão

1. Leia este arquivo e `CHANGELOG.md`. Consulte `PRODUCT.md` e `README.md` quando precisar de contexto de produto, execução, infraestrutura ou convenções existentes.
2. Verifique `git status --short --branch`, a branch atual e os últimos commits. Não descarte, sobrescreva ou inclua trabalho preexistente sem relação com a tarefa.
3. Confirme no código e no ambiente o estado atual antes de afirmar que algo está implantado, conectado ou validado. O changelog é uma passagem de contexto, não substitui a verificação do estado real.
4. Use a pasta e as ferramentas do workspace ativo. Não suponha que um serviço local, navegador, sessão do Portainer ou segredo esteja disponível em outro computador.

## Como conduzir mudanças

- Converse com o usuário em português do Brasil, salvo se ele pedir outro idioma. Seja direto e explique resultados, limitações e validações com clareza.
- O nome usado na interface é **PierSec**. Para usuários finais, descreva a integração como campanhas, conexão ou serviço de campanhas. Não exponha o nome do fornecedor do motor de campanhas nem detalhes internos de implementação em textos da interface.
- Preserve os fluxos existentes de BeePhish, workspaces, autenticação/MFA, autorização por workspace e políticas RLS ao trabalhar em áreas relacionadas.
- Faça alterações focadas e compatíveis com os padrões já usados no repositório. Leia os componentes, rotas e migrations relacionados antes de editar. Mudanças no banco devem vir com migration versionada.
- Valide as alterações relevantes com as ferramentas disponíveis no projeto e relate os comandos e resultados. Não afirme que um deploy, migration remota, configuração do Portainer ou envio de e-mail ocorreu sem verificar esse resultado.
- Não adicione nem execute testes automatizados, salvo quando o usuário pedir testes/verificação. Para mudanças de código, rode validações não-testes apropriadas, como formatação, TypeScript ou build, quando disponíveis e proporcionais à alteração.

## Direção visual de interfaces — anti-AI-slop

Ao criar ou editar qualquer interface, siga estas regras. Elas têm prioridade sobre padrões visuais genéricos; preserve o comportamento real do produto e use apenas conteúdo confirmado.

### Estilo e tokens

- Minimalista e monocromático; a hierarquia vem de tipografia e espaçamento. Profundidade vem de bordas de 1 px, sem sombras, gradientes ou glow decorativo.
- Defina cores como CSS variables e use os tokens, sem hex solto em componentes:

```css
:root {
  --bg: #ffffff;
  --surface: #fafafa;
  --border: #eaeaea;
  --border-hover: #c9c9c9;
  --text: #171717;
  --text-muted: #666666;
  --text-subtle: #8f8f8f;
  --accent: #0070f3;
  --radius: 10px;
}

.dark,
[data-theme="dark"] {
  --bg: #000000;
  --surface: #0a0a0a;
  --border: #262626;
  --border-hover: #4a4a4a;
  --text: #ededed;
  --text-muted: #a1a1a1;
  --text-subtle: #737373;
}
```

- Use uma única cor de acento, definida em `--accent`, somente para foco, link ativo e um CTA principal por tela. Todo o restante fica em tons de cinza.
- **Exceção restrita à documentação (`/docs`):** guias podem usar uma única cor semântica em `--docs-accent` e tons derivados para navegação ativa e avisos instrutivos. Não introduza cores decorativas nem altere a paleta das demais áreas do produto.
- Use Geist ou Inter para texto e Geist Mono ou JetBrains Mono para código/dados; mantenha uma única família sans. Títulos devem ser curtos e concretos, com até duas linhas.

### Tipografia

- H1: 40–48 px, peso 600, `letter-spacing: -0.03em`.
- H2: 24–30 px, peso 600, `letter-spacing: -0.02em`.
- H3/título de seção: 15–16 px, peso 600.
- Corpo: 15–16 px, peso 400, `line-height: 1.6`.
- Texto secundário: 14 px, peso 400, `--text-muted`.
- Labels, datas e badges: 12 px, peso 500; mono ou uppercase discreto. Garanta contraste de pelo menos 4.5:1 para texto normal.

### Componentes

- Card: borda `1px solid var(--border)`, raio de 10–12 px, padding de 20 px e fundo `--surface` ou transparente. Hover muda discretamente a borda e o fundo (3–5%), com `transition-colors` de 150 ms. Quando a navegação pedir um card, use título, descrição curta e link “Ver mais”; o indicador do link pode avançar 2–4 px no hover.
- Botão primário: fundo `var(--text)`, texto `var(--bg)`, raio de 8 px, altura de 36–40 px e peso 500; no hover reduza levemente a opacidade.
- Botão secundário: transparente, borda de 1 px e texto `var(--text)`; hover usa `--surface`.
- Badge: pill de 11–12 px, borda fina ou fundo cinza translúcido, sem cores fortes.
- Input: altura de 40 px, borda de 1 px, raio de 8 px e fundo `--bg`; foco com `outline: 2px solid var(--accent)` e `outline-offset: 2px`.
- Header fixo, quando fizer sentido: altura de 56–64 px, borda inferior e fundo semitransparente; blur de até 8 px somente para legibilidade do conteúdo atrás, nunca como decoração.
- Feed/lista: linhas separadas por bordas finas, sem cartões repetidos. Data pequena em cinza, título em destaque e descrição abaixo.
- Código/dado técnico: fundo levemente diferente, borda de 1 px, raio de 8 px, fonte mono de 13 px e botão de copiar quando houver conteúdo copiável.

### Layout e movimento

- Coluna de leitura com 720–800 px; grids até 1100–1200 px. Use espaçamento em múltiplos de 4 px: 4, 8, 12, 16, 20, 24, 32, 48 e 64.
- Separe seções por 56–64 px e título do conteúdo por 16–20 px. Varie o ritmo entre texto, lista, tabela e código; não repita uma grade de cards como única estrutura.
- Mobile-first: uma coluna no mobile, duas em `sm` e três em `lg`, quando o conteúdo justificar.
- Transições de 150–200 ms com `ease-out`, apenas em cor, borda e transform. Se uma entrada ajudar a leitura, use fade com `translateY(8px)` uma única vez, sem stagger longo. Sem parallax, bounce, entradas exageradas ou `hover:scale-105` em cards. Respeite `prefers-reduced-motion`.

### Proibido

- Gradientes roxo/azul/rosa, blobs, orbes, glow, glassmorphism pesado, sombras grandes ou coloridas, bordas acima de 1 px e várias cores de acento.
- Ícones emoji, ícones decorativos em círculos coloridos ou ilustrações decorativas em cards.
- Hero padrão de badge “Novo”, H1 gigante, dois botões e mockup; grade repetitiva de três cards “Rápido / Seguro / Escalável”; CTA final em bloco gradiente.
- Números, depoimentos, logos ou métricas inventados. Sem conteúdo real, use `[a definir]` e informe o usuário.
- `gray-XXX` ou cores hex soltas fora das definições de tokens.
- Copy genérica/lorem ipsum e termos “revolucione”, “eleve”, “desbloqueie”, “potencialize”, “seamless”, “next-gen”, “all-in-one”, “cutting-edge”, “mergulhe” ou “jornada”.
- Duplicação de componentes: use dados e `.map()` quando o mesmo padrão se repetir.

### Checklist de interface

Antes de finalizar uma interface, revise e informe na resposta:

- [ ] Só uma cor de acento.
- [ ] Sem gradiente, glow, blur decorativo ou sombra em card.
- [ ] Sem conteúdo inventado.
- [ ] Seções com ritmo variado.
- [ ] Cores aplicadas via tokens.
- [ ] Foco visível e contraste de pelo menos 4.5:1 no texto muted.
- [ ] Se 30% dos elementos decorativos forem removidos, a página ainda funciona? Se sim, remova-os.

## Segurança e operações de campanha

- Nunca coloque chaves, tokens, senhas, códigos de pareamento ativos ou dados de destinatários no frontend, no changelog, em commits ou em saídas de ferramentas. Segredos do servidor não devem usar prefixo `NEXT_PUBLIC_`.
- A chave administrativa do motor de campanhas fica no ambiente Docker/Portainer em segredo montado; não deve ser enviada ao navegador nem armazenada na nuvem do PierSec. O conector deve iniciar comunicação de saída e acessar o serviço apenas pela rede Docker privada; não publicar portas administrativas.
- O Supabase é o banco de dados operacional. Respeite RLS, isolamento entre workspaces, escopo mínimo de privilégios e o fluxo de segredos já existente. Antes de executar uma operação remota de banco ou infraestrutura, confira que ela está autorizada pelo pedido atual e inspecione exatamente o que será alterado.
- Campanhas podem enviar mensagens imediatamente. Não criar, confirmar, reenviar ou lançar uma campanha sem pedido explícito do usuário e uma revisão clara de nome, grupo/destinatários, conteúdo, perfil de envio e horário. A prévia e confirmação explícita existentes devem continuar obrigatórias; não contorne a fila ou o histórico de auditoria.
- Testes de campanha devem usar ambiente isolado e destinatários controlados pelo usuário. Não coletar senhas reais; manter captura de credenciais desativada.
- Ao usar navegador ou Portainer, verifique antes qual ambiente/Stack está aberto. Prefira inspeção de leitura quando isso responder à pergunta; registre mudanças de infraestrutura no changelog sem registrar segredos.

## Histórico, commits e continuidade

- **Atualize `CHANGELOG.md` na mesma tarefa de toda alteração no repositório.** Acrescente uma entrada datada com o que mudou, validações, commit/push/deploy ou operações remotas verificadas e próximos passos. Não apague o histórico anterior e não inclua segredos.
- Ao terminar uma tarefa de repositório, revise `git diff`, faça commit apenas dos arquivos pertencentes à tarefa e envie para a branch atual quando houver upstream e autenticação. Nunca use force push para contornar conflitos.
- Se não puder fazer commit ou push, informe o bloqueio e deixe o estado claramente documentado.
- `.impeccable/critique/2026-09-24T14-27-00Z__app.md` é uma auditoria visual histórica. Suas observações não foram revalidadas contra a interface atual; consulte a nota em `.impeccable/README.md` antes de usá-las como recomendações vigentes.
