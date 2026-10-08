import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./docs-content.module.css";

export type DocsTopic =
  | "inicio"
  | "primeiros-passos"
  | "campanhas"
  | "resultados"
  | "administracao"
  | "ajuda";

const topics: Array<{
  href: string;
  id: DocsTopic;
  label: string;
  description: string;
}> = [
  {
    href: "/docs",
    id: "inicio",
    label: "Visão geral",
    description: "Escolha por onde começar.",
  },
  {
    href: "/docs/primeiros-passos",
    id: "primeiros-passos",
    label: "Primeiros passos",
    description: "Acesso, workspace e painel.",
  },
  {
    href: "/docs/campanhas",
    id: "campanhas",
    label: "Campanhas",
    description: "Prepare, revise e confirme.",
  },
  {
    href: "/docs/resultados",
    id: "resultados",
    label: "Resultados",
    description: "Indicadores, atividade e leitura dos eventos.",
  },
  {
    href: "/docs/administracao",
    id: "administracao",
    label: "Administração",
    description: "Pessoas, empresas e preferências.",
  },
  {
    href: "/docs/ajuda",
    id: "ajuda",
    label: "Ajuda",
    description: "Diagnóstico e próximos passos.",
  },
];

const pageCopy: Record<
  Exclude<DocsTopic, "inicio">,
  { title: string; intro: string }
> = {
  "primeiros-passos": {
    title: "Primeiros passos",
    intro: "Entre no ambiente certo antes de consultar ou alterar informações.",
  },
  campanhas: {
    title: "Criar uma campanha",
    intro:
      "Prepare os recursos, confira o público e revise tudo antes de confirmar.",
  },
  resultados: {
    title: "Acompanhar resultados",
    intro: "Entenda o que cada estado confirma e onde consultar os detalhes.",
  },
  administracao: {
    title: "Administração",
    intro:
      "Organize o acesso e as preferências do ambiente em que está trabalhando.",
  },
  ajuda: {
    title: "Resolver problemas comuns",
    intro:
      "Confira o ambiente, a atualização dos dados e a causa antes de repetir uma ação.",
  },
};

function DocsFrame({
  current,
  children,
}: {
  current: DocsTopic;
  children: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <nav className={styles.sidebar} aria-label="Assuntos da documentação">
        <h2>Documentação</h2>
        <ul>
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                href={topic.href}
                aria-current={topic.id === current ? "page" : undefined}
                className={
                  topic.id === current ? styles.activeNavLink : undefined
                }
              >
                <span>{topic.label}</span>
                <span className={styles.navDescription}>
                  {topic.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

function PageHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className={styles.pageHeader}>
      <p className={styles.breadcrumb}>
        <Link href="/docs">Documentação</Link>
        <span aria-hidden="true">/</span>
        {title}
      </p>
      <h2>{title}</h2>
      <p className={styles.lead}>{intro}</p>
    </header>
  );
}

function TopicLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link className={styles.topicLink} href={href}>
      <span>
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <ArrowRight aria-hidden="true" size={17} />
    </Link>
  );
}

function CampaignFlow() {
  const steps = [
    ["01", "Público", "Grupos autorizados"],
    ["02", "Conteúdo", "Modelo e página"],
    ["03", "Envio", "Perfil e agenda"],
    ["04", "Revisão", "Confirmação final"],
  ];

  return (
    <figure className={styles.flowFigure}>
      <ol className={styles.flow} aria-label="Etapas da criação da campanha">
        {steps.map(([number, title, description]) => (
          <li className={styles.flowStep} key={number}>
            <span className={styles.flowNumber}>{number}</span>
            <strong>{title}</strong>
            <span>{description}</span>
          </li>
        ))}
      </ol>
      <figcaption>
        O fluxo no PierSec separa configuração, público, agenda e revisão.
      </figcaption>
    </figure>
  );
}

function CampaignFormMap() {
  return (
    <figure className={styles.screenFigure}>
      <div className={styles.screenTopline}>
        <span>Campanhas / Nova campanha</span>
        <span>Etapa 1 de 4</span>
      </div>
      <div className={styles.screenTitle}>Configure a campanha</div>
      <div className={styles.screenSteps}>
        <span className={styles.currentStep}>1 Conteúdo</span>
        <span>2 Público</span>
        <span>3 Agenda</span>
        <span>4 Revisão</span>
      </div>
      <div className={styles.formMap}>
        <div>
          <span>Nome da campanha</span>
          <span className={styles.fakeInput} aria-hidden="true" />
        </div>
        <div>
          <span>Modelo de e-mail</span>
          <span className={styles.fakeInput} aria-hidden="true" />
        </div>
        <div>
          <span>Página de destino</span>
          <span className={styles.fakeInput} aria-hidden="true" />
        </div>
        <div>
          <span>Perfil de envio</span>
          <span className={styles.fakeInput} aria-hidden="true" />
        </div>
        <div className={styles.fullField}>
          <span>Endereço público de rastreamento · HTTPS</span>
          <span className={styles.fakeInput} aria-hidden="true" />
        </div>
      </div>
      <figcaption>
        Referência dos campos exibidos na primeira etapa. A imagem é um esquema
        da tela, sem dados de campanha.
      </figcaption>
    </figure>
  );
}

function HomeContent() {
  return (
    <>
      <header className={styles.homeHeader}>
        <h2>Como usar o PierSec</h2>
        <p className={styles.lead}>
          Escolha um assunto para ver o caminho dentro do produto, com
          instruções curtas e referências das telas.
        </p>
      </header>
      <section className={styles.startPanel}>
        <div>
          <span className={styles.panelLabel}>Caminho recomendado</span>
          <h2>Preparar e revisar uma campanha</h2>
          <p>
            Comece pelas etapas do público e do conteúdo. O fluxo só entra na
            fila depois da revisão e da confirmação explícita.
          </p>
        </div>
        <Link href="/docs/campanhas" className={styles.primaryLink}>
          Abrir o passo a passo <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>
      <section className={styles.topicSection} aria-labelledby="topics-title">
        <h2 id="topics-title">Assuntos</h2>
        <div className={styles.topicList}>
          <TopicLink
            href="/docs/primeiros-passos"
            label="Primeiros passos"
            description="Acesso, seleção de workspace e leitura do painel."
          />
          <TopicLink
            href="/docs/campanhas"
            label="Campanhas"
            description="Grupos, modelos, páginas, envio e confirmação."
          />
          <TopicLink
            href="/docs/resultados"
            label="Resultados"
            description="Gráficos, detalhes individuais e histórico de ações."
          />
          <TopicLink
            href="/docs/administracao"
            label="Administração"
            description="Pessoas, empresas, workspaces e conta."
          />
          <TopicLink
            href="/docs/ajuda"
            label="Ajuda"
            description="O que conferir quando algo não aparece ou falha."
          />
        </div>
      </section>
      <aside className={styles.callout}>
        <strong>Antes de começar</strong>
        <p>
          Use o workspace indicado para sua tarefa. Os dados de teste e produção
          são separados.
        </p>
      </aside>
    </>
  );
}

function FirstStepsContent() {
  return (
    <>
      <PageHeader {...pageCopy["primeiros-passos"]} />
      <section className={styles.section}>
        <h2>Entrar e escolher o ambiente</h2>
        <ol className={styles.stepsList}>
          <li>
            <span>
              Entre com seu e-mail e senha. No primeiro acesso, abra o convite
              enviado por e-mail para confirmar a conta e definir a senha.
            </span>
          </li>
          <li>
            <span>
              Se sua conta pedir autenticação em duas etapas, conclua a
              verificação para continuar.
            </span>
          </li>
          <li>
            <span>
              No menu do perfil, abra <strong>Workspaces</strong> e selecione o
              ambiente indicado. Confira se ele está marcado como{" "}
              <strong>Teste</strong> ou <strong>Produção</strong>.
            </span>
          </li>
          <li>
            <span>
              Volte ao painel e confira o workspace e a empresa selecionados
              antes de interpretar os dados.
            </span>
          </li>
        </ol>
        <p className={styles.inlineLinks}>
          <Link href="/workspaces">
            Gerenciar workspaces <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <Link href="/status">
            Ver status do ambiente <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </p>
      </section>
      <section className={styles.section}>
        <h2>Ler o painel</h2>
        <p>
          O painel reúne indicadores de campanhas e sinais de risco do workspace
          ativo. Selecione a empresa, quando houver essa opção, e confira o
          período indicado nos dados.
        </p>
        <p>
          Use <strong>Atualizar</strong> quando precisar buscar uma leitura
          nova. Em <Link href="/configuracoes">Configurações</Link>, ajuste o
          modo visual e a ordem dos blocos; essas preferências ficam neste
          navegador.
        </p>
      </section>
      <aside className={styles.callout}>
        <strong>Confira o ambiente antes de agir</strong>
        <p>
          O workspace define os dados e as permissões disponíveis. Se não
          encontrar algo, confirme a seleção antes de pedir acesso ou repetir
          uma operação.
        </p>
      </aside>
    </>
  );
}

function CampaignsContent() {
  return (
    <>
      <PageHeader {...pageCopy.campanhas} />
      <CampaignFlow />
      <section className={styles.section}>
        <h2>Prepare os recursos</h2>
        <div className={styles.resourceRows}>
          <div>
            <span className={styles.resourceNumber}>01</span>
            <div>
              <h3>Público · grupos</h3>
              <p>
                Em <Link href="/campanhas/grupos">Grupos</Link>, crie um grupo
                com destinatários autorizados. Para importar, use CSV com uma
                coluna de e-mail e, se necessário, nome, sobrenome e cargo.
                Cabeçalhos aceitos incluem <code>email</code>,{" "}
                <code>first_name</code>, <code>last_name</code> e{" "}
                <code>position</code>.
              </p>
            </div>
          </div>
          <div>
            <span className={styles.resourceNumber}>02</span>
            <div>
              <h3>Mensagem · modelo de e-mail</h3>
              <p>
                Em <Link href="/campanhas/modelos">Modelos de e-mail</Link>,
                configure assunto, texto e HTML. A prévia é isolada. As
                variáveis incluem <code>{"{{.FirstName}}"}</code>,{" "}
                <code>{"{{.LastName}}"}</code> e <code>{"{{.Email}}"}</code>;
                use <code>{'href="{{.URL}}"'}</code> para o clique ser
                rastreável.
              </p>
            </div>
          </div>
          <div>
            <span className={styles.resourceNumber}>03</span>
            <div>
              <h3>Destino · página</h3>
              <p>
                Em <Link href="/campanhas/paginas">Páginas de destino</Link>,
                configure o conteúdo estático que abre após o clique. É
                diferente do modelo: o modelo é a mensagem; a página é o destino
                do link.
              </p>
            </div>
          </div>
          <div>
            <span className={styles.resourceNumber}>04</span>
            <div>
              <h3>Entrega · perfil de envio</h3>
              <p>
                Em <Link href="/campanhas/envio">Perfis de envio</Link>, escolha
                remetente e servidor autorizados. Os dados de autenticação ficam
                no ambiente conectado; o formulário da campanha mostra apenas o
                nome do perfil.
              </p>
            </div>
          </div>
        </div>
      </section>
      <CampaignFormMap />
      <section className={styles.section}>
        <h2>Configure, revise e confirme</h2>
        <ol className={styles.stepsList}>
          <li>
            <span>
              Abra <Link href="/campanhas/nova">Nova campanha</Link>. Informe o
              nome, selecione modelo, página, perfil e o endereço público HTTPS
              usado nos links.
            </span>
          </li>
          <li>
            <span>
              Selecione os grupos e confira a quantidade estimada de
              destinatários.
            </span>
          </li>
          <li>
            <span>
              Escolha iniciar quando o serviço receber a ordem ou agende uma
              data e hora.
            </span>
          </li>
          <li>
            <span>
              Na revisão, confira todos os itens e confirme a autorização. A
              campanha só entra na fila depois da confirmação deslizante.
            </span>
          </li>
        </ol>
      </section>
      <aside className={`${styles.callout} ${styles.calloutCaution}`}>
        <strong>Confirme somente em ambiente autorizado</strong>
        <p>
          A confirmação pode iniciar o envio no horário escolhido. Use grupos e
          destinatários controlados e não solicite nem colete senhas reais.
        </p>
      </aside>
    </>
  );
}

function ResultsContent() {
  return (
    <>
      <PageHeader {...pageCopy.resultados} />
      <section className={styles.section}>
        <h2>Visão geral e lista</h2>
        <ol className={styles.stepsList}>
          <li>
            <span>
              Em <Link href="/campanhas/visao-geral">Visão geral</Link>, compare
              destinatários, enviados, falhas, aberturas e cliques nos gráficos
              agregados. A atualização ocorre automaticamente; também pode ser
              feita manualmente.
            </span>
          </li>
          <li>
            <span>
              Em <Link href="/campanhas">Campanhas</Link>, localize uma campanha
              e abra os detalhes. Use a paginação para percorrer a lista.
            </span>
          </li>
          <li>
            <span>
              Solicite a atividade individual para ver destinatários e horários
              de envio, abertura, clique ou falha quando esses eventos estiverem
              disponíveis.
            </span>
          </li>
          <li>
            <span>
              Na atividade da campanha, use{" "}
              <strong>Extrair clicados · Excel</strong>
              para baixar uma pessoa por e-mail com clique registrado. As
              colunas de departamento e gestor ficam vazias quando esses dados
              não são fornecidos. A extração não é oferecida se a consulta
              estiver limitada aos primeiros 500 destinatários.
            </span>
          </li>
          <li>
            <span>
              Para campanhas importadas da BeePhish, abra o detalhe da campanha
              na visão geral e use <strong>Extrair clicados · Excel</strong> no
              cabeçalho. A extração consulta todos os resultados e eventos da
              campanha, mesmo que a lista na tela mostre só os primeiros 500.
              Nome, sobrenome, e-mail, cargo e departamento vêm da
              sincronização; gestor e e-mail do gestor ficam em branco porque
              não são sincronizados atualmente.
            </span>
          </li>
          <li>
            <span>
              Em <Link href="/campanhas/atividade">Atividade</Link>, consulte
              quem solicitou cada operação, o grupo, a quantidade, o agendamento
              e o resultado.
            </span>
          </li>
        </ol>
      </section>
      <section className={styles.section}>
        <h2>O que cada estado indica</h2>
        <dl className={styles.definitionList}>
          <div>
            <dt>Enviado</dt>
            <dd>
              O servidor de e-mail aceitou a mensagem. Isso não confirma que ela
              chegou à caixa de entrada ou ao spam.
            </dd>
          </div>
          <div>
            <dt>Abertura</dt>
            <dd>
              Depende do carregamento do pixel de acompanhamento pelo cliente de
              e-mail; bloqueio de imagens pode impedir o registro.
            </dd>
          </div>
          <div>
            <dt>Clique</dt>
            <dd>
              Depende de um link rastreável no modelo, como{" "}
              <code>{'href="{{.URL}}"'}</code>, e do endereço HTTPS disponível.
            </dd>
          </div>
          <div>
            <dt>Falha</dt>
            <dd>
              Abra o detalhe para ler a causa técnica disponível e corrigir o
              perfil ou o ambiente antes de repetir a ação.
            </dd>
          </div>
        </dl>
      </section>
      <aside className={styles.callout}>
        <strong>Uma campanha antiga não ganha cliques retroativamente</strong>
        <p>
          Se o modelo foi enviado com um link direto à página, os cliques
          anteriores não aparecem como eventos rastreáveis no PierSec.
        </p>
      </aside>
    </>
  );
}

function AdministrationContent() {
  return (
    <>
      <PageHeader {...pageCopy.administracao} />
      <section className={styles.section}>
        <h2>Pessoas por risco</h2>
        <ol className={styles.stepsList}>
          <li>
            <span>
              Abra <Link href="/riscos">Pessoas por risco</Link> e confira o
              workspace ativo.
            </span>
          </li>
          <li>
            <span>
              Pesquise por nome, e-mail ou campanha. Use os filtros de nível de
              risco e área para restringir a lista.
            </span>
          </li>
          <li>
            <span>
              Abra uma pessoa para ver os sinais e campanhas relacionados. Use{" "}
              <strong>Atualizar leitura</strong> para buscar dados recentes.
            </span>
          </li>
        </ol>
      </section>
      <section className={styles.section}>
        <h2>Empresas e usuários</h2>
        <div className={styles.resourceRows}>
          <div>
            <span className={styles.resourceNumber}>01</span>
            <div>
              <h3>Workspaces</h3>
              <p>
                Abra <Link href="/workspaces">Workspaces</Link> no menu do
                perfil. Ao criar um, informe nome, descrição e se é Teste ou
                Produção. Mantenha os dados separados.
              </p>
            </div>
          </div>
          <div>
            <span className={styles.resourceNumber}>02</span>
            <div>
              <h3>Empresas</h3>
              <p>
                Em <Link href="/empresas">Empresas</Link>, adicione ou edite uma
                empresa do workspace selecionado. Os dados de conexão devem
                seguir a orientação da pessoa responsável pela infraestrutura.
              </p>
            </div>
          </div>
          <div>
            <span className={styles.resourceNumber}>03</span>
            <div>
              <h3>Usuários e permissões</h3>
              <p>
                Em <Link href="/usuarios">Usuários</Link>, escolha o workspace,
                informe o e-mail e atribua o papel adequado. A pessoa recebe
                convite para confirmar a conta e definir a senha.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <h2>Conta e preferências</h2>
        <p>
          Em <Link href="/configuracoes">Configurações</Link>, atualize o nome e
          a foto. Na aba <strong>Estilo</strong>, escolha o tema, a
          visualização, a ordem dos blocos e o tamanho do texto. Na aba{" "}
          <strong>Status</strong>, confira o estado dos dados.
        </p>
        <p>
          Para redefinir uma senha esquecida, use{" "}
          <Link href="/esqueci-senha">Esqueci minha senha</Link> e siga o link
          recebido por e-mail. A exclusão da conta, quando disponível nas
          configurações, é permanente.
        </p>
      </section>
    </>
  );
}

function HelpContent() {
  return (
    <>
      <PageHeader {...pageCopy.ajuda} />
      <dl className={styles.helpList}>
        <div>
          <dt>Não vejo campanhas ou pessoas</dt>
          <dd>
            Confira workspace e empresa selecionados. Na área de campanhas,
            confira também a conexão e atualize os dados antes de repetir a
            consulta.
          </dd>
        </div>
        <div>
          <dt>O clique não aparece</dt>
          <dd>
            Verifique se o modelo usa <code>{'href="{{.URL}}"'}</code> e se o
            endereço HTTPS configurado está acessível. Um link direto à página
            não registra o clique.
          </dd>
        </div>
        <div>
          <dt>O envio falhou</dt>
          <dd>
            Abra o resultado da campanha e leia a causa disponível. Revise
            credenciais e permissões do perfil com a pessoa responsável.
          </dd>
        </div>
        <div>
          <dt>O e-mail foi aceito, mas não chegou à entrada</dt>
          <dd>
            “Enviado” confirma aceitação pelo servidor, não a pasta de destino.
            Confira remetente, autenticação, registros do provedor e políticas
            do destinatário.
          </dd>
        </div>
        <div>
          <dt>Não consigo entrar</dt>
          <dd>
            Use o fluxo de redefinição de senha. Se sua conta exigir duas
            etapas, conclua a verificação após o login.
          </dd>
        </div>
      </dl>
      <p className={styles.inlineLinks}>
        <Link href="/status">
          Abrir status <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
        <Link href="/campanhas/conexao">
          Ver conexão de campanhas <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}

export function DocsContent({ topic }: { topic: DocsTopic }) {
  const content =
    topic === "inicio" ? (
      <HomeContent />
    ) : topic === "primeiros-passos" ? (
      <FirstStepsContent />
    ) : topic === "campanhas" ? (
      <CampaignsContent />
    ) : topic === "resultados" ? (
      <ResultsContent />
    ) : topic === "administracao" ? (
      <AdministrationContent />
    ) : (
      <HelpContent />
    );

  return (
    <DocsFrame current={topic}>
      {content}
      <footer className={styles.footer}>
        <Link href="/docs">Índice da documentação</Link>
        <span>Guia de funcionalidades do PierSec</span>
      </footer>
    </DocsFrame>
  );
}
