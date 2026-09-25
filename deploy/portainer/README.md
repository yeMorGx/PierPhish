# Campanhas no Portainer

O serviço de campanhas e o agente rodam em contêineres Docker gerenciados pelo Portainer. A porta administrativa não é publicada. O agente compartilha uma rede Docker com o serviço e inicia conexões HTTPS de saída para o Piersec.

## Criar o serviço de campanhas

No Portainer, crie uma Stack a partir do repositório PierPhish, branch `main`, usando `deploy/portainer/campaign-engine.compose.yaml`. A Stack baixa a versão Linux fixada no Dockerfile, monta a configuração/certificado como somente leitura e usa o volume persistente `piersec_campaign_data` para o banco operacional. Não adicione mapeamentos de portas.

O nome interno do serviço é `campaign-engine`, na rede `piersec_campaign_private`. O serviço escuta a API administrativa em HTTPS nessa rede; o listener de páginas também permanece sem porta publicada.

## Preparar os arquivos no host Docker

Crie dois arquivos protegidos no host do Docker:

- `campaign-api-key.txt`: chave de API do serviço, em uma única linha.
- `campaign-admin.crt`: certificado HTTPS usado pelo serviço.

Restringa a leitura desses arquivos à conta administrativa do Docker. Não coloque o conteúdo deles em variáveis de ambiente, no navegador ou no repositório.

## Criar a Stack

No Portainer, crie uma Stack a partir do repositório PierPhish, selecione a branch `main` e use `deploy/portainer/campaign-bridge.compose.yaml` como caminho do arquivo Compose.

Defina as variáveis da Stack:

| Variável                   | Valor                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `PIERSEC_URL`              | URL HTTPS atual do Piersec                                                                          |
| `PIERSEC_PAIRING_CODE`     | Código de uso único gerado em Campanhas → Conexão                                                   |
| `CAMPAIGN_SERVICE_URL`     | `https://campaign-engine:3333`                                                                      |
| `CAMPAIGN_TLS_SERVER_NAME` | Nome DNS presente no certificado, se diferente do host em `CAMPAIGN_SERVICE_URL`                    |
| `CAMPAIGN_DOCKER_NETWORK`  | `piersec_campaign_private`                                                                          |
| `CAMPAIGN_API_KEY_FILE`    | `/var/snap/docker/common/var-lib-docker/volumes/piersec_campaign_config/_data/campaign-api-key.txt` |
| `CAMPAIGN_ADMIN_CERT_FILE` | `/var/snap/docker/common/var-lib-docker/volumes/piersec_campaign_config/_data/gophish_admin.crt`    |

Implante a Stack e aguarde o status **Conectado** no Piersec. Depois, remova `PIERSEC_PAIRING_CODE` das variáveis da Stack e atualize-a. O código expira em 10 minutos e só pode ser usado uma vez.

## Operação

O agente mantém a chave e o token em arquivos montados ou em um volume Docker privado. A chave privada usada para abrir operações de criação também fica nesse volume; somente a chave pública é sincronizada com o PierSec. O conector faz as chamadas administrativas dentro da rede privada.

No PierSec, usuários autorizados podem criar grupos, modelos de e-mail, páginas de destino e perfis de envio, além de montar e revisar campanhas. Listas de destinatários, conteúdo de modelos/páginas e segredos SMTP são cifrados para a chave pública do conector antes de entrar na fila do Supabase. O conector abre o conteúdo localmente e o PierSec apaga o payload cifrado quando recebe o resultado ou quando a ordem expira. O histórico mantém somente tipo/nome do ativo, quantidade quando aplicável, solicitante, horário e resultado.

O conector sincroniza nomes e IDs de ativos, horários e estatísticas agregadas. Não envia listas de pessoas, endereços de e-mail, IPs, eventos individuais, conteúdo submetido ou dados de credenciais.

A criação de página força `capture_credentials` e `capture_passwords` para `false`; campos de entrada, formulários e scripts são bloqueados. A criação de campanha revalida grupos, modelo, página e perfil antes da chamada única de criação e continua exigindo revisão e confirmação explícita. Se o resultado da chamada ficar inconclusivo, o histórico pede conferência manual e o agente não repete a operação automaticamente.

Para remover a conexão, pare e exclua a Stack pelo Portainer e remova o volume `campaign_bridge_state` se também quiser descartar o token persistido.
