"use client";

import { animate } from "motion";
import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

export function AnimatedNumber({
  value,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const controls = animate(previousValue.current, value, {
      duration: 0.9,
      ease: "circOut",
      onUpdate: (latest) => {
        setDisplayValue(
          decimals ? Number(latest.toFixed(decimals)) : Math.round(latest),
        );
      },
    });

    previousValue.current = value;
    return () => controls.stop();
  }, [decimals, value]);

  return (
    <span className={className} aria-label={`${prefix}${value}${suffix}`}>
      {prefix}
      {displayValue.toLocaleString("pt-BR", {
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
