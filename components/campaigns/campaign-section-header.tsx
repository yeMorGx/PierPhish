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
        className="object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 92%, transparent) 48%, color-mix(in srgb, var(--surface) 78%, transparent) 100%)",
        }}
      />
      <div className="relative z-10 flex min-h-[92px] w-full flex-wrap items-end justify-between gap-3 px-5 py-4">
        {children}
      </div>
    </div>
  );
}
