# Change log e passagem de contexto

Este arquivo registra o estado do projeto para continuar o trabalho em outro computador ou sessão.

## Regra para próximas alterações

**Sempre que uma tarefa alterar o repositório, atualize este arquivo na mesma tarefa.** Acrescente uma entrada datada em `Histórico`, descrevendo o que mudou, validações executadas, commit/push/deploy quando aplicável e o que continua pendente. Não apague entradas antigas para substituir pelo estado novo. No início de uma sessão em outro computador, leia este arquivo e confira o estado real do Git antes de continuar.

Não inclua neste arquivo chaves, tokens, senhas, códigos de pareamento ativos, endereços de destinatários ou outros segredos. Diferencie claramente código pronto, configuração aplicada em produção e validação ainda não feita.

## Estado atual — 25/09/2026

### Objetivo do produto

Criar e acompanhar campanhas de conscientização pelo PierSec. A pessoa usuária deve conduzir o trabalho pela interface PierSec; Portainer é assunto de infraestrutura. A interface não deve revelar o nome do fornecedor do motor de campanhas. Dados operacionais e histórico ficam no Supabase.

### O que já existe no repositório

- Integração entre o PierSec hospedado na Vercel e um conector/serviço de campanhas em Docker, gerenciado pelo Portainer.
- O conector inicia conexões HTTPS de saída para o PierSec e conversa com o serviço pela rede Docker privada. O Compose não publica portas do serviço nem do conector.
- A chave administrativa e o certificado são montados como segredos no host Docker. A chave privada do conector fica em volume persistente; o navegador não recebe a chave administrativa.
- Pareamento do conector pela área de conexão, consulta de estado e sincronização de campanhas, grupos e estatísticas agregadas.
- Área de campanhas separada da conexão, com administração de grupos, modelos de e-mail, páginas e perfis de envio, além do fluxo de criação de campanha.
- Criação passa por prévia, revisão explícita, confirmação digitando o nome da campanha e aceite da autorização. A confirmação cria um comando para a fila; o resultado fica no histórico. Não repetir automaticamente uma operação cujo resultado seja inconclusivo.
- As páginas são configuradas sem captura de credenciais/senhas. O fluxo documentado também bloqueia formulários, entradas e scripts de captura.
- Conteúdo operacional e listas de destinatários são cifrados para o conector antes de irem para a fila do Supabase e apagados quando o resultado chega ou a ordem expira. O histórico guarda solicitante, horário, seleção, contagem e resultado.
- A tela de campanhas agora mostra destinatários, enviados, falhas, aberturas, cliques e dados submetidos. A indicação esclarece que “enviado” significa aceito pelo servidor de e-mail e não comprova entrega na caixa de entrada.

### Última alteração registrada

- `2026-09-25` — Criados `AGENTS.md` e `.impeccable/README.md` para padronizar o trabalho entre computadores e explicar o contexto histórico da auditoria visual. O relatório original `.impeccable/critique/2026-09-24T14-27-00Z__app.md` foi preservado, sem reescrita dos achados antigos.
- A auditoria de `.impeccable/` encontrou somente esse relatório Markdown (7.141 bytes); não encontrou arquivos adicionais, cache ou segredos. Foi removido um espaço no fim de uma linha do front matter para a checagem do Git passar; os achados não foram reescritos.
- Início desta tarefa: branch `main` em `e4436b2`, sincronizada com `origin/main`; o arquivo `.impeccable/` estava sem rastreamento.
- `2026-09-25` — Commit `4dfd070` (`Show campaign delivery counts in Piersec`), já enviado para `origin/main`.
- Arquivo alterado: `components/campaigns/campaign-workspace-content.tsx`.
- Inclui as colunas de enviados e falhas, o horário de atualização dos dados e texto de contexto sobre entrega de e-mail.
- Validações relatadas: Prettier no componente, TypeScript (`tsc --noEmit`), `next build`, detector Impeccable no componente e `git diff --check` passaram.
- A alteração deve ser publicada pela implantação automática da Vercel ligada à `main`. A confirmação visual da nova versão em produção ainda não foi registrada.

### Estado observado na última sessão

- O conector apareceu como **Conectado** na tela de conexão; a sincronização mais recente observada foi às 17:17 de 25/09/2026.
- A campanha de teste `testetetse` aparecia como “Em andamento”, com 3 destinatários, e início às 17:08. A atividade mostrava que a solicitação foi concluída/registrada. Isso não comprova recebimento na caixa de entrada.
- Na observação anterior, a campanha tinha 0 aberturas, 0 cliques e 0 dados submetidos. A tela ainda não mostrava as métricas de envio; o commit acima adiciona essa informação, mas o novo deploy precisa ser conferido.
- Não foi feito novo disparo pelo assistente. Para saber se a mensagem chegou, primeiro conferir `Enviados` e `Falhas` após a publicação e a próxima sincronização. “Enviados” confirma aceitação pelo servidor SMTP, não a chegada à caixa de entrada. Se necessário, conferir logs do serviço/provedor de e-mail e spam/quarentena.

### Git e arquivos locais

- Branch: `main`; no início desta tarefa, `HEAD` e `origin/main` estavam em `4dfd070`.
- Havia uma pasta `.impeccable/` não rastreada antes desta tarefa. Ela é preexistente e não deve ser incluída em commits sem relação com ela.
- Não havia `CHANGELOG.md` no início desta tarefa.

## Próximos passos

1. Confirmar no painel da Vercel se o deploy de `4dfd070` concluiu e conferir, dentro do PierSec, as colunas **Enviados** e **Falhas** para a campanha de teste após a sincronização.
2. Se enviados for zero ou houver falhas, consultar os logs do conector/serviço e a configuração SMTP no Portainer. Não reenviar a campanha automaticamente; um novo disparo precisa ser solicitado pelo usuário e direcionado a caixas de teste controladas.
3. Resolver a diferença entre o requisito de infraestrutura pedido pelo usuário e o fluxo atualmente implementado para pareamento: o usuário pediu um `PIERSEC_PAIRING_CODE` definitivo configurado pela infraestrutura, enquanto o código/documentação do repositório atualmente geram um código de uso único, válido por 10 minutos, pela interface PierSec e orientam removê-lo da Stack após o pareamento. Definir e implementar um mecanismo duradouro e protegido que não exija acesso de usuários finais ao Portainer, sem expor segredo no frontend. Não registrar o valor do segredo aqui.
4. Confirmar no Supabase de produção que as migrations da conexão, fila de campanhas e ativos foram aplicadas e que RLS continua habilitada. As migrations correspondentes estão em `supabase/migrations/` com prefixos `2026092412`, `2026092415`, `2026092503`, `20260925185638` e `20260925190540`.
5. Fazer um teste controlado ponta a ponta com destinatários próprios: criar/revisar campanha no PierSec, confirmar explicitamente, acompanhar fila/histórico, sincronização e contagem aceita pelo SMTP. Usar ambiente isolado e não coletar senhas reais.
6. Revisar os textos e navegação da interface para garantir que o nome do produto permaneça PierSec e que detalhes do fornecedor do motor de campanhas não apareçam para usuários finais. Há identificadores internos e documentação de infraestrutura com o nome técnico; não os confundir com o texto da interface.

## Histórico

### 2026-09-25 — Passagem de contexto e rotina do change log

- Criado este arquivo para permitir continuidade do trabalho em computadores diferentes.
- Registrada a instrução de atualizá-lo a cada alteração futura, junto com o estado do Git, evidências de validação e pendências.
- Registrados o fluxo de campanhas existente, o resultado observado do teste de e-mail, a última alteração em `main` e as verificações ainda necessárias.

### 2026-09-25 — Instruções persistentes e auditoria Impeccable

- Criado `AGENTS.md` na raiz com instruções para início de sessão, segurança, campanhas, validação, continuidade, commits e atualização obrigatória do change log.
- Incluída no repositório a pasta `.impeccable/`, que contém uma auditoria visual histórica de 24/09; adicionada uma nota explicando que os achados precisam ser revalidados antes de orientar novas mudanças.
- A auditoria original foi preservada sem reescrita dos achados; apenas um espaço no fim de uma linha do front matter foi removido. Nenhum arquivo de segredo foi incluído.
