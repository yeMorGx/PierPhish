"use client";

import { createElement, useRef } from "react";

type SpotlightCardProps = React.HTMLAttributes<HTMLElement> & {
  as?: "article" | "div" | "section";
};

export function SpotlightCard({
  as = "div",
  children,
  className,
  style,
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const Component = as;

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty(
      "--spotlight-x",
      `${event.clientX - rect.left}px`,
    );
    cardRef.current.style.setProperty(
      "--spotlight-y",
      `${event.clientY - rect.top}px`,
    );
    cardRef.current.style.setProperty("--spotlight-opacity", "1");
  }

  function handlePointerLeave() {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--spotlight-opacity", "0");
  }

  return createElement(
    Component,
    {
      ...props,
      className: ["spotlight-card", className].filter(Boolean).join(" "),
      ref: (node: HTMLElement | null) => {
        cardRef.current = node;
      },
      style: {
        "--spotlight-opacity": "0",
        "--spotlight-x": "50%",
        "--spotlight-y": "50%",
        ...style,
      } as React.CSSProperties,
      onPointerLeave: handlePointerLeave,
      onPointerMove: handlePointerMove,
    },
    children,
  );
}
