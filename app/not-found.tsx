import { Montserrat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import styles from "./not-found.module.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: "600" });

export const metadata: Metadata = {
  title: "Página não encontrada | PierPhish",
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.artwork}
        fill
        priority
        sizes="100vw"
        src="/not-found-ocean-artwork.png"
        unoptimized
      />

      <h1 className={styles.visuallyHidden}>404 — Página não encontrada</h1>
      <Link className={`${styles.homeLink} ${montserrat.className}`} href="/">
        <Image
          alt=""
          aria-hidden="true"
          className={styles.backIcon}
          height={19}
          src="/not-found-back-arrow.svg"
          unoptimized
          width={9}
        />
        <span className={styles.label}>Voltar ao Inicio</span>
      </Link>
    </main>
  );
}
