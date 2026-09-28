import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "cn";

export function CampaignSectionHeader({
  imageSrc,
  children,
  className,
}: {
  imageSrc: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden border-b border-[var(--line-soft)]",
        className,
      )}
    >
      <Image
        src={imageSrc}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="scale-105 object-cover object-center blur-[3px]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-black/45" />
      <div
        className="relative z-10 flex min-h-[92px] w-full flex-col items-center justify-center gap-1 px-5 py-4 text-center text-white"
        style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.6)" }}
      >
        {children}
      </div>
    </div>
  );
}
