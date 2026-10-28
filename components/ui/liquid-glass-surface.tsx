"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import LiquidGlass from "liquid-glass-react";

const stillPointer = { x: 0, y: 0 };

export function LiquidGlassSurface({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => setMounted(true), []);

  return (
    <div className="piersec-liquid-glass">
      {mounted ? (
        <LiquidGlass
          className="piersec-liquid-glass-panel"
          style={{
            position: "relative",
            top: "0px",
            left: "0px",
            width: "100%",
          }}
          padding="16px"
          cornerRadius={16}
          displacementScale={24}
          blurAmount={0.08}
          saturation={105}
          aberrationIntensity={0.35}
          elasticity={0}
          mode="standard"
          globalMousePos={reducedMotion ? stillPointer : undefined}
          mouseOffset={reducedMotion ? stillPointer : undefined}
        >
          {children}
        </LiquidGlass>
      ) : (
        <div className="piersec-liquid-glass-fallback">{children}</div>
      )}
    </div>
  );
}
