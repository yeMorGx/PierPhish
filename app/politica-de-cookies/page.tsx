import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <main className="cookie-policy-page theme-canvas">
      <div className="cookie-policy-shell">
        <header className="cookie-policy-header">
          <Link href="/login">Voltar ao login</Link>
          <span>Privacidade</span>
        </header>

        <article className="cookie-policy-card">
          <p className="cookie-policy-eyebrow">PierPhish · Transparência</p>
          <h1>Política de cookies</h1>
          <p className="cookie-policy-lead">
            Esta página explica como o PierPhish usa cookies e tecnologias
            semelhantes para manter o produto seguro e lembrar escolhas feitas
            no navegador.
          </p>

          <div className="cookie-policy-updated">
            Última atualização: setembro de 2026
          </div>

          <section>
            <h2>1. O que usamos</h2>
            <p>
              O PierPhish usa armazenamento no navegador para manter a sessão de
              acesso, aplicar preferências visuais e preservar escolhas de uso,
              como tema, tamanho do texto e configurações do painel. Dependendo
              da configuração do ambiente, o Supabase Auth também pode persistir
              informações técnicas da sessão no navegador.
            </p>
          </section>

          <section>
            <h2>2. Categorias e finalidades</h2>
            <div className="cookie-policy-table" role="list">
              <div role="listitem">
                <strong>Essenciais</strong>
                <span>
                  Sessão, autenticação, segurança e funcionamento básico do
                  produto. Não podem ser desativados enquanto você usa o
                  PierPhish.
                </span>
              </div>
              <div role="listitem">
                <strong>Preferências</strong>
                <span>
                  Tema, acessibilidade, aparência do painel e escolhas feitas
                  por você. Servem para o produto lembrar como você prefere
                  utilizá-lo.
                </span>
              </div>
              <div role="listitem">
                <strong>Análise e publicidade</strong>
                <span>
                  Não estão ativos nesta versão. O PierPhish não usa cookies de
                  publicidade nem ferramentas de análise comportamental no
                  momento.
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2>3. Como controlar</h2>
            <p>
              Você pode apagar os dados armazenados pelo navegador nas
              configurações do seu navegador. O botão “Cookies”, disponível no
              canto inferior da aplicação depois que o aviso é fechado, abre
              novamente este aviso e esta política.
            </p>
          </section>

          <section>
            <h2>4. Alterações</h2>
            <p>
              Podemos atualizar esta política quando houver mudança nas
              tecnologias utilizadas ou nas finalidades de tratamento. Caso
              sejam adicionados cookies não essenciais, eles deverão ser
              informados antes de serem ativados.
            </p>
          </section>

          <p className="cookie-policy-note">
            Esta política é uma descrição informativa da configuração atual do
            PierPhish e deve ser revisada pelo responsável jurídico da
            organização antes da publicação definitiva.
          </p>
        </article>
      </div>
    </main>
  );
}
