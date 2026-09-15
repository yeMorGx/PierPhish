# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O usuário principal é o administrador interno que acompanha campanhas de conscientização e organiza diferentes ambientes de clientes. Essa leitura é inferida pelas áreas existentes de risco, usuários, status e configuração.

## Product Purpose

PierPhish consolida campanhas, eventos e sinais de exposição humana do BeePhish em uma operação visual única. O sucesso é permitir que um administrador alterne entre ambientes de teste e produção, mantenha as conexões de clientes organizadas e encontre rapidamente pessoas e campanhas que precisam de atenção.

## Positioning

O produto conecta a leitura operacional de risco humano à administração de múltiplos clientes BeePhish dentro de workspaces próprios, mantendo a operação de cada ambiente separada.

## Operating Context

- Workspaces são ambientes internos do PierPhish e podem representar teste ou produção.
- Cada workspace pode conter vários clientes BeePhish, identificados por Client ID e Client Secret.
- A conexão BeePhish alimenta campanhas, resultados e eventos exibidos no painel.
- A criação e a manutenção de workspaces acontecem dentro do PierPhish, sem depender de criar um workspace na API do BeePhish.

## Capabilities and Constraints

- Deve existir uma área Empresas acessível pelo sidebar para listar, criar e editar clientes.
- Cada cliente pode ter nome, logo e informações editáveis, além de Client ID e Client Secret para a conexão BeePhish.
- Logos e fotos devem ser escolhidos por upload do dispositivo; não usar campos de link externo.
- Client Secret é dado sensível: nunca deve ser enviado ao cliente/browser ou salvo em localStorage. A integração deve usar uma rota/worker server-side.
- A seleção do workspace continua disponível no menu da conta e deve refletir o ambiente ativo quando a integração estiver conectada.
- `admin@teste.com` deve ser reconhecido como super admin tanto na interface de usuários quanto nas rotas administrativas.
- O sistema deve continuar funcionando em modo demonstração quando as variáveis do Supabase não estiverem configuradas.

## Brand Commitments

- O nome do produto é PierPhish.
- A interface existente é um dashboard profissional, claro, responsivo e orientado a dados.
- A identidade visual atual usa superfícies claras, tipografia geométrica, ícones lineares, bordas suaves e um modo Visual Bento configurável.

## Evidence on Hand

- Código existente em `app/`, `components/` e `outputs/sync-beephish/`.
- Integração atual com as tabelas `beephish_campaigns`, `beephish_results` e `beephish_events`.
- Função de sincronização BeePhish server-side em `outputs/sync-beephish/index.ts`.
- Fluxo de administração de usuários em `components/users/user-management-content.tsx` e `app/api/admin/users/route.ts`.
- Não há, neste repositório, um schema persistido de workspaces/clientes; o modelo precisa ser introduzido com migração e políticas adequadas quando o projeto Supabase estiver disponível.

## Product Principles

- Ambientes de teste e produção não devem misturar dados.
- Credenciais sensíveis nunca atravessam a fronteira do servidor.
- Administração deve ser rápida de escanear e simples de editar.
- O estado vazio deve orientar o próximo passo sem inventar dados de integração.

## Accessibility & Inclusion

- Os controles de administração precisam funcionar com teclado, foco visível, rótulos acessíveis e feedback de erro/sucesso.
- O layout deve manter legibilidade e refluidez em telas menores.
