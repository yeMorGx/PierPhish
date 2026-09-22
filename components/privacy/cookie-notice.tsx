"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const dismissedStorageKey = "pierphish-cookie-notice-dismissed";

export function CookieNotice() {
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(dismissedStorageKey) !== "true");
    setHydrated(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(dismissedStorageKey, "true");
    setVisible(false);
  }

  function reopen() {
    window.localStorage.removeItem(dismissedStorageKey);
    setVisible(true);
  }

  if (!hydrated) return null;

  return (
    <>
      {visible ? (
        <aside className="cookie-notice" aria-label="Aviso de cookies">
          <div className="cookie-notice-copy">
            <span className="cookie-notice-eyebrow">Privacidade</span>
            <h2>Cookies e armazenamento</h2>
            <p>
              Usamos tecnologias essenciais para manter sua sessão e suas
              preferências. Não usamos cookies de publicidade ou análise neste
              momento.
            </p>
            <Link href="/politica-de-cookies">Ler política de cookies</Link>
          </div>
          <div className="cookie-notice-actions">
            <button type="button" onClick={dismiss}>
              Entendi
            </button>
          </div>
        </aside>
      ) : (
        <button className="cookie-notice-reopen" type="button" onClick={reopen}>
          Cookies
        </button>
      )}
    </>
  );
}
