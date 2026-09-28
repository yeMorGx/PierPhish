import Link from "next/link";
import styles from "./docs-content.module.css";

const sections = [
  { id: "inicio", label: "Acesso e ambiente" },
  { id: "painel", label: "Painel inicial" },
  { id: "campanhas", label: "Campanhas" },
  { id: "resultados", label: "Resultados e atividade" },
  { id: "riscos", label: "Pessoas por risco" },
  { id: "administracao", label: "Empresas, workspaces e usuários" },
  { id: "conta", label: "Conta e preferências" },
  { id: "ajuda", label: "Problemas comuns" },
];

export function DocsContent() {
  return (
    <article className={styles.page} id="top">
      <div className={styles.readingColumn}>
        <header className={styles.hero}>
          <h1>Guia de uso do PierSec</h1>
          <p className={styles.lead}>
            Encontre o ambiente certo, acompanhe os indicadores e conduza
            campanhas de conscientização com revisão antes do envio. Este guia
            explica cada área e o caminho para as tarefas mais comuns.
          </p>
          <Link className={styles.actionLink} href="/campanhas">
            Abrir campanhas
          </Link>
        </header>

        <nav className={styles.index} aria-label="Índice da documentação">
          <h2>Nesta página</h2>
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.chapters}>
          <section className={styles.chapter} id="inicio">
            <h2>Acesso e ambiente</h2>
            <p>
              O conteúdo exibido depende do workspace selecionado. Use o
              ambiente de teste para validar dados e conteúdo antes de operar em
              produção.
            </p>
            <ol>
              <li>
                Entre com seu e-mail e senha. Se ainda não tem acesso, peça a um
                administrador que envie um convite. No primeiro acesso, siga o
                link recebido para confirmar o e-mail e definir a senha.
              </li>
              <li>
                Se sua conta pedir autenticação em duas etapas, conclua essa
                verificação para continuar.
              </li>
              <li>
                Abra o menu do perfil e selecione <strong>Workspaces</strong>.
                Escolha o ambiente indicado para a tarefa; confira se ele está
                marcado como <strong>Teste</strong> ou <strong>Produção</strong>
                .
              </li>
              <li>
                Volte ao painel inicial e confira o workspace e a empresa
                selecionados antes de interpretar os resultados.
              </li>
            </ol>
            <p className={styles.links}>
              <Link href="/workspaces">Gerenciar workspaces</Link>
              <Link href="/status">Ver status do ambiente</Link>
            </p>
          </section>

          <section className={styles.chapter} id="painel">
            <h2>Painel inicial</h2>
            <p>
              O painel reúne indicadores de campanhas e sinais de risco para o
              workspace ativo. Use o filtro de empresa para restringir a leitura
              e o seletor de visualização para alternar a apresentação.
            </p>
            <ol>
              <li>Selecione o workspace e, quando disponível, a empresa.</li>
              <li>
                Leia os indicadores e as listas de acompanhamento dentro do
                período mostrado; use <strong>Atualizar</strong> para buscar uma
                leitura nova quando a tela oferecer essa opção.
              </li>
              <li>
                Em <Link href="/configuracoes">Configurações</Link>, ajuste o
                modo visual e a ordem dos blocos do painel. As preferências de
                aparência ficam neste navegador.
              </li>
            </ol>
          </section>

          <section className={styles.chapter} id="campanhas">
            <h2>Campanhas</h2>
            <p>
              A área de campanhas é separada em lista, visão geral, grupos,
              modelos de e-mail, páginas de destino, perfis de envio, atividade
              e conexão. Prepare os itens antes de abrir o fluxo de criação.
            </p>

            <h3>1. Confira a conexão</h3>
            <ol>
              <li>
                Acesse <Link href="/campanhas/conexao">Campanhas/Conexão</Link>{" "}
                e confira se o serviço está conectado e atualizando.
              </li>
              <li>
                Se estiver desconectado, peça ao responsável pela infraestrutura
                para revisar a conexão do ambiente. O código de pareamento é de
                uso único, expira e deve ser compartilhado somente durante a
                configuração autorizada.
              </li>
            </ol>

            <h3>2. Prepare o público</h3>
            <ol>
              <li>
                Abra <Link href="/campanhas/grupos">Grupos</Link> e crie um
                grupo com os destinatários autorizados para o exercício.
              </li>
              <li>
                Para importar uma planilha, use CSV com uma coluna de e-mail e,
                se necessário, colunas de nome, sobrenome e cargo. Cabeçalhos
                como <code>email</code>, <code>first_name</code>,{" "}
                <code>last_name</code> e <code>position</code> são reconhecidos.
              </li>
              <li>
                Confira os nomes e os campos antes de salvar: valores importados
                são usados literalmente nas variáveis do modelo.
              </li>
            </ol>

            <h3>3. Prepare o conteúdo</h3>
            <ol>
              <li>
                Em <Link href="/campanhas/modelos">Modelos de e-mail</Link>,
                configure assunto, texto simples e HTML. A prévia é isolada e
                não executa scripts nem navega para links.
              </li>
              <li>
                As variáveis reconhecidas incluem{" "}
                <code>{"{{.FirstName}}"}</code>, <code>{"{{.LastName}}"}</code>{" "}
                e <code>{"{{.Email}}"}</code>. Para registrar cliques, use{" "}
                <code>{'href="{{.URL}}"'}</code> no link do e-mail.
              </li>
              <li>
                Em <Link href="/campanhas/paginas">Páginas de destino</Link>,
                crie a página estática que abre após o clique. Formulários,
                scripts e captura de senhas/credenciais são bloqueados.
              </li>
              <li>
                Em <Link href="/campanhas/envio">Perfis de envio</Link>,
                configure o servidor de e-mail autorizado, remetente e dados de
                autenticação exigidos pelo provedor. As credenciais são
                protegidas no fluxo de conexão.
              </li>
            </ol>

            <h3>4. Configure, revise e confirme</h3>
            <ol>
              <li>
                Acesse <Link href="/campanhas/nova">Nova campanha</Link> e
                informe o nome, modelo, página de destino, perfil de envio e o
                endereço público HTTPS usado para rastrear cliques.
              </li>
              <li>
                Selecione um ou mais grupos e confira a quantidade estimada de
                destinatários.
              </li>
              <li>
                Escolha envio assim que o serviço buscar a ordem ou agende data
                e hora. O modo imediato pode começar em poucos segundos após a
                confirmação.
              </li>
              <li>
                Na revisão final, confira nome, grupos, quantidade, modelo,
                página, perfil e horário. Marque a autorização e deslize para
                confirmar. A campanha só entra na fila após essa confirmação.
              </li>
            </ol>

            <aside className={styles.note}>
              <strong>Antes de confirmar</strong>
              <p>
                Use apenas grupos autorizados e ambientes controlados. Não
                solicite nem colete senhas reais. A página de destino é o
                conteúdo aberto após o clique; o modelo de e-mail é a mensagem
                enviada.
              </p>
            </aside>
          </section>

          <section className={styles.chapter} id="resultados">
            <h2>Resultados e atividade</h2>
            <ol>
              <li>
                Em <Link href="/campanhas">Campanhas</Link>, localize uma
                campanha e abra seus detalhes. A tabela permite navegar pelas
                páginas e alterar quantas linhas aparecem.
              </li>
              <li>
                Use <Link href="/campanhas/visao-geral">Visão geral</Link> para
                comparar destinatários, envios aceitos, aberturas, cliques e
                falhas nos gráficos agregados. Os dados são atualizados
                automaticamente e também podem ser atualizados manualmente.
              </li>
              <li>
                Na lista de campanhas, solicite a atividade individual para
                consultar destinatários e horários de envio, abertura, clique ou
                falha quando esses eventos estiverem disponíveis.
              </li>
              <li>
                Em <Link href="/campanhas/atividade">Atividade</Link>, consulte
                o histórico de solicitações: quem confirmou, grupos, quantidade
                estimada, agenda e resultado de cada ordem.
              </li>
              <li>
                Confira o texto técnico da falha no resultado. Se não houver
                dados recentes, confirme a conexão e atualize a leitura.
              </li>
            </ol>
            <aside className={styles.note}>
              <strong>
                Envio aceito não significa entrega na caixa de entrada
              </strong>
              <p>
                “Enviado” significa que o servidor de e-mail aceitou a mensagem.
                O PierSec não informa se ela chegou à entrada ou ao spam. A
                abertura também depende do carregamento de imagens pelo cliente
                de e-mail; o clique depende do link rastreável no modelo.
              </p>
            </aside>
          </section>

          <section className={styles.chapter} id="riscos">
            <h2>Pessoas por risco</h2>
            <p>
              A área reúne pessoas e sinais relacionados às campanhas no
              ambiente selecionado. Ela serve para localizar registros e
              priorizar acompanhamento, não para substituir uma análise do
              contexto.
            </p>
            <ol>
              <li>
                Abra <Link href="/riscos">Pessoas por risco</Link> e confira o
                workspace ativo.
              </li>
              <li>
                Pesquise por nome, e-mail ou campanha. Use os filtros de nível
                de risco e área para restringir a lista.
              </li>
              <li>
                Abra uma pessoa para ver os sinais e campanhas associados. Use
                <strong> Atualizar leitura</strong> para buscar os dados mais
                recentes.
              </li>
            </ol>
          </section>

          <section className={styles.chapter} id="administracao">
            <h2>Empresas, workspaces e usuários</h2>
            <h3>Workspaces</h3>
            <ol>
              <li>
                Abra <Link href="/workspaces">Workspaces</Link> pelo menu do
                perfil para criar ou consultar ambientes.
              </li>
              <li>
                Ao criar um ambiente, informe nome, descrição e se ele é de
                teste ou produção. Mantenha os dados dos dois ambientes
                separados.
              </li>
            </ol>

            <h3>Empresas</h3>
            <ol>
              <li>
                Abra <Link href="/empresas">Empresas</Link> para adicionar ou
                editar uma empresa no workspace selecionado.
              </li>
              <li>
                Preencha os dados da conexão conforme as instruções do
                administrador responsável. Envie o logo como arquivo de imagem
                se quiser identificá-la no painel.
              </li>
              <li>
                Confira o status ativo/inativo e use o filtro do painel para
                restringir os resultados à empresa escolhida.
              </li>
            </ol>

            <h3>Usuários e permissões</h3>
            <ol>
              <li>
                Quem tem acesso administrativo pode abrir{" "}
                <Link href="/usuarios">Usuários</Link>, escolher o workspace,
                informar o e-mail e conceder um papel de acesso.
              </li>
              <li>
                A pessoa recebe o convite por e-mail para confirmar a conta e
                definir a senha. Permissões são atribuídas por workspace.
              </li>
              <li>
                Na lista, revise acessos existentes e use as ações disponíveis
                para atualizar o papel, iniciar a redefinição de senha ou
                remover o acesso.
              </li>
            </ol>
          </section>

          <section className={styles.chapter} id="conta">
            <h2>Conta e preferências</h2>
            <ol>
              <li>
                Em <Link href="/configuracoes">Configurações</Link>, atualize o
                nome e a foto do perfil.
              </li>
              <li>
                Na aba <strong>Estilo</strong>, escolha o tema, o modo de
                visualização e a ordem dos blocos do painel. O controle de
                acessibilidade ajusta o tamanho do texto.
              </li>
              <li>
                Na aba <strong>Status</strong>, confira o estado geral dos dados
                e abra a leitura detalhada se precisar investigar uma falha.
              </li>
              <li>
                Para trocar uma senha esquecida, use{" "}
                <Link href="/esqueci-senha">Esqueci minha senha</Link> na tela
                de acesso e siga o link enviado por e-mail. A exclusão da conta,
                também disponível nas configurações, é permanente.
              </li>
            </ol>
            <p>
              O menu do perfil também reúne notificações, workspaces, o tour do
              produto e a opção de sair.
            </p>
          </section>

          <section className={styles.chapter} id="ajuda">
            <h2>Problemas comuns</h2>
            <dl className={styles.troubleshooting}>
              <div>
                <dt>Não vejo campanhas ou pessoas</dt>
                <dd>
                  Confira o workspace, a empresa e a conexão. Atualize os dados
                  antes de repetir a consulta.
                </dd>
              </div>
              <div>
                <dt>O clique não aparece</dt>
                <dd>
                  Confirme que o e-mail usa <code>{'href="{{.URL}}"'}</code> e
                  que o endereço público HTTPS configurado está acessível. Um
                  link que vai direto à página não registra o clique no PierSec.
                </dd>
              </div>
              <div>
                <dt>O envio falhou</dt>
                <dd>
                  Abra o resultado da campanha e leia a causa. Revise as
                  credenciais e permissões do perfil de envio com o
                  administrador responsável.
                </dd>
              </div>
              <div>
                <dt>O e-mail foi aceito, mas não chegou à entrada</dt>
                <dd>
                  O estado de envio não revela a pasta de destino. Consulte a
                  autenticação do remetente, os registros do provedor e as
                  políticas da organização que recebe a mensagem.
                </dd>
              </div>
              <div>
                <dt>Não consigo entrar</dt>
                <dd>
                  Use o fluxo de redefinição de senha. Se a conta exigir duas
                  etapas, será necessário concluir a verificação após o login.
                </dd>
              </div>
            </dl>
            <p className={styles.links}>
              <Link href="/status">Abrir status</Link>
              <Link href="/campanhas/conexao">Abrir conexão de campanhas</Link>
            </p>
          </section>
        </div>

        <footer className={styles.footer}>
          <Link href="#top">Voltar ao início</Link>
          <span>Guia de funcionalidades do PierSec</span>
        </footer>
      </div>
    </article>
  );
}
