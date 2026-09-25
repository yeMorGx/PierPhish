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
