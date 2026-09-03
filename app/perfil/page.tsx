"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

function ProfileContent() {
  const { user } = useAuth();
  const email = user?.email ?? "demo@beephish.local";
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <DashboardShell activeSection="profile" title="Perfil">
      <div className="mx-auto grid max-w-[1180px] gap-[var(--cards-gap)] pb-8">
        <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface)] p-8 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px] max-[720px]:p-6">
          <div className="absolute -top-24 -right-16 size-64 rounded-full border border-[#e8edef] shadow-[0_0_0_30px_rgba(120,146,160,0.04),0_0_0_60px_rgba(120,146,160,0.025)]" />
          <div className="relative z-[1] flex items-center gap-5 max-[520px]:flex-col max-[520px]:items-start">
            <div className="grid size-24 flex-none place-items-center rounded-full bg-[var(--ink)] text-3xl font-extrabold text-white shadow-[0_15px_30px_rgba(24,32,43,0.14)]">
              {initial}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
                CONTA CONECTADA
              </p>
              <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-none font-[680] tracking-[-0.07em]">
                Seu acesso ao Lens.
              </h2>
              <p className="mt-3 mb-0 text-[13px] text-[#7b838d]">{email}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-[var(--cards-gap)] max-[720px]:grid-cols-1">
          <article className="rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px]">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
              E-MAIL
            </p>
            <strong className="block overflow-hidden text-[17px] text-ellipsis whitespace-nowrap text-[#34404a]">
              {email}
            </strong>
            <span className="mt-2 block text-[11px] text-[#87919a]">
              Identidade usada no acesso interno.
            </span>
          </article>
          <article className="rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[0_10px_30px_rgba(25,34,45,0.02)] max-[720px]:rounded-[23px]">
            <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#9299a2] uppercase">
              PERMISSÃO
            </p>
            <strong className="block text-[17px] text-[#34404a]">
              Administrador interno
            </strong>
            <span className="mt-2 block text-[11px] text-[#87919a]">
              Acesso às campanhas e sinais sincronizados.
            </span>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
