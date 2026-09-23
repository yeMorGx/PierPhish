import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type AuthPageShellProps = {
  ariaBusy?: boolean;
  artwork: ReactNode;
  children: ReactNode;
};

type StaticAuthArtworkProps = {
  alt: string;
  caption: string;
  src: string;
};

export function AuthPageShell({
  ariaBusy,
  artwork,
  children,
}: AuthPageShellProps) {
  return (
    <main className="login-page theme-canvas" aria-busy={ariaBusy}>
      <section className="login-panel">
        <div className="login-panel-inner">
          <LoginBrand />
          {children}
        </div>
      </section>
      <aside className="login-artwork" aria-label="Ilustração do PierPhish">
        {artwork}
      </aside>
    </main>
  );
}

export function LoginBrand() {
  return (
    <Link
      className="login-brand"
      href="/"
      aria-label="PierPhish. Powered by PierSec"
    >
      <span className="login-brand-name">PierPhish</span>
      <span className="login-brand-powered" aria-label="Powered by PierSec">
        <span>Powered by</span>
        <Image src="/piersec-logo.png" alt="PierSec" width={44} height={44} />
      </span>
    </Link>
  );
}

export function StaticAuthArtwork({
  alt,
  caption,
  src,
}: StaticAuthArtworkProps) {
  return (
    <>
      <Image
        alt={alt}
        aria-hidden={alt ? undefined : true}
        className="auth-static-artwork-image"
        fill
        priority
        sizes="(max-width: 860px) 100vw, calc(100vw - 500px)"
        src={src}
      />
      <div className="login-artwork-caption">
        <p>{caption}</p>
      </div>
    </>
  );
}
