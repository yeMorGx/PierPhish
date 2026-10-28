# Ampliação da auditoria

Escopo aprovado em 28/10/2026: usuários/workspaces, autenticação e campanhas.

## Cobertura atual

A API `/api/audit` lê até 100 comandos de campanhas e 100 comandos de ativos por workspace. Esses registros representam o estado atual da solicitação, não cada transição. A autorização exige administrador, MFA e acesso ao workspace.

## Eventos a instrumentar

| Área         | Eventos                                                                                                                 | Origem prevista                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Usuários     | Criação de acesso, convite enviado/falhou, alteração de papel, ativação, suspensão, remoção e exclusão das estatísticas | Rotas administrativas, após confirmar o resultado da operação                |
| Workspaces   | Criação, mudança de nome/logo, adição/remoção de membros                                                                | Rotas de workspace e administração                                           |
| Autenticação | Entrada, saída, recuperação e alteração de senha, cadastro/remoção de MFA, tentativa de verificação                     | Logs nativos do Supabase Auth, quando disponíveis                            |
| Campanhas    | Prévia, confirmação, execução, falha, sincronização e marcação/desmarcação como teste                                   | Rotas de campanha e sincronização; comandos existentes permanecem como fonte |
| Ativos       | Criação e edição de grupos, modelos, páginas e perfis de envio                                                          | Fila de ativos e retorno da execução                                         |

## Contrato necessário

Cada evento precisa de ID imutável, workspace, identidade do responsável verificada no servidor, ação, origem, referência do objeto, resultado e data do servidor. Usar metadados permitidos por ação, sem copiar corpos de requisição, HTML, destinatários, senhas, tokens ou segredos.

A escrita deve ocorrer no servidor. RLS deve impedir inserção, alteração e exclusão por clientes comuns. Leitura continua restrita aos administradores do workspace com MFA. Eventos de autenticação são da conta e não possuem workspace por definição: definir e validar o vínculo temporal antes de exibi-los a administradores de workspaces, evitando exposição de ações de outros ambientes.

Repetições de processamento devem usar chave de idempotência. Falha ao registrar auditoria precisa de monitoramento; não responder que uma operação já concluída falhou só porque o registro de auditoria falhou. Eventos que não existiam não podem ser reconstruídos a partir do estado atual.

## Fotos

A interface usa a foto disponível do perfil autenticado quando o e-mail coincide com o responsável. Outros responsáveis usam inicial até existir uma consulta autorizada de fotos. Não consultar diretório global nem serviços externos por e-mail. Fotos privadas exigem URLs assinadas de curta duração e escopo de workspace.

## Bloqueio de ativação

O conector Supabase desta sessão lista somente o projeto Gabriel (`qjlpghlrbznouwesfsbx`). O projeto informado do PierSec é `acwxnnqnfdzsggwzpetl`. Não aplicar migrations no projeto Gabriel. Falta acesso ao banco correto para conferir schema, políticas, disponibilidade de `auth.audit_log_entries` e configurar a implantação.

Nenhuma nova instrumentação de eventos foi ativada nesta tarefa. Ao obter acesso: inspecionar schema real, criar migration versionada, implementar produtores e consulta paginada, validar isolamento e falhas com contas controladas, aplicar no ambiente autorizado e confirmar os eventos no site.
