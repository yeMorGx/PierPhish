"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        !containerRef.current
      )
        return;

      gsap.fromTo(
        containerRef.current,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          clearProps: "opacity,transform,visibility",
          duration: 0.34,
          ease: "power2.out",
          y: 0,
        },
      );
    },
    { dependencies: [pathname], revertOnUpdate: true, scope: containerRef },
  );

  return <div ref={containerRef}>{children}</div>;
}
