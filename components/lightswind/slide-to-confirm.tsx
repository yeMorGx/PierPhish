"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface SlideToConfirmProps {
  text?: string;
  successText?: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
  className?: string;
}

export function SlideToConfirm({
  text = "Deslize para confirmar",
  successText = "Confirmação registrada",
  onConfirm,
  disabled = false,
  className,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const x = useMotionValue(0);
  const thumbSize = 40;
  const maxDrag = Math.max(0, trackWidth - thumbSize - 14);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => setTrackWidth(track.getBoundingClientRect().width);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const textOpacity = useTransform(x, (value) => {
    if (maxDrag <= 0) return 1;
    return Math.max(0, 1 - value / (maxDrag * 0.55));
  });
  const progressWidth = useTransform(x, (value) => {
    if (state === "success") return `${trackWidth}px`;
    if (trackWidth <= 0) return `${thumbSize}px`;
    return `${Math.min(trackWidth, value + thumbSize + 8)}px`;
  });

  const confirm = useCallback(async () => {
    if (disabled || state !== "idle" || inFlightRef.current || maxDrag <= 0) {
      return;
    }

    inFlightRef.current = true;
    setState("loading");

    try {
      const confirmation = Promise.resolve(onConfirm());
      await animate(x, maxDrag, {
        type: "spring",
        stiffness: 420,
        damping: 34,
      });
      const result = await confirmation;
      if (result === false) {
        await animate(x, 0, {
          type: "spring",
          stiffness: 420,
          damping: 34,
        });
        setState("idle");
      } else {
        setState("success");
      }
    } catch {
      await animate(x, 0, {
        type: "spring",
        stiffness: 420,
        damping: 34,
      });
      setState("idle");
    } finally {
      inFlightRef.current = false;
    }
  }, [disabled, maxDrag, onConfirm, state, x]);

  const handleDragEnd = () => {
    if (state !== "idle" || disabled) return;
    if (x.get() >= maxDrag * 0.86) {
      void confirm();
    } else {
      void animate(x, 0, {
        type: "spring",
        stiffness: 420,
        damping: 34,
      });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    void confirm();
  };

  const canInteract = !disabled && state === "idle" && maxDrag > 0;

  return (
    <div
      ref={trackRef}
      role="button"
      tabIndex={canInteract ? 0 : -1}
      aria-label={text}
      aria-disabled={!canInteract}
      aria-busy={state === "loading"}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex h-14 w-full touch-none items-center overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface-soft)] p-1.5 transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
        canInteract
          ? "cursor-pointer"
          : state === "success"
            ? "cursor-default border-emerald-500/40"
            : "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-[11px]"
        style={{
          width: progressWidth,
          backgroundColor:
            state === "success"
              ? "rgb(16 185 129 / 15%)"
              : "color-mix(in srgb, var(--accent) 10%, transparent)",
        }}
      />

      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-12 z-0 text-center text-[12px] font-medium text-[var(--text-muted)]"
        style={{ opacity: state === "idle" ? textOpacity : 0 }}
      >
        {text}
      </motion.span>

      {state === "loading" && (
        <span
          aria-live="polite"
          className="pointer-events-none absolute inset-x-12 z-0 text-center text-[12px] font-medium text-[var(--text-muted)]"
        >
          Registrando confirmação…
        </span>
      )}

      {state === "success" && (
        <span
          aria-live="polite"
          className="pointer-events-none absolute inset-x-12 z-0 text-center text-[12px] font-medium text-emerald-700 dark:text-emerald-300"
        >
          {successText}
        </span>
      )}

      <motion.div
        drag={canInteract ? "x" : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.03}
        dragMomentum={false}
        dragPropagation={false}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative z-10 flex shrink-0 items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-sm",
          canInteract ? "cursor-grab active:cursor-grabbing" : "",
          state === "success" && "border-emerald-600 bg-emerald-600 text-white",
        )}
        style={{ width: thumbSize, height: thumbSize, x }}
        whileTap={canInteract ? { scale: 0.96 } : undefined}
        aria-hidden="true"
      >
        {state === "loading" ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : state === "success" ? (
          <Check className="h-5 w-5" />
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
      </motion.div>
    </div>
  );
}
