"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export type AnimatedTooltipItem = {
  id: number;
  name: string;
  designation: string;
  image: string;
};

type AnimatedTooltipProps = {
  items: AnimatedTooltipItem[];
  className?: string;
  numPeople?: number;
  remainingItems?: AnimatedTooltipItem[];
};

type TooltipPosition = {
  left: number;
  top: number;
};

const remainingTooltipId = -1;

export function AnimatedTooltip({
  items,
  className,
  numPeople,
  remainingItems = [],
}: AnimatedTooltipProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPosition | null>(null);
  const hoveredElementRef = useRef<HTMLDivElement | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig,
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  function updateTooltipPosition(element: HTMLDivElement | null) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setTooltipPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  }

  useEffect(() => {
    if (hoveredIndex === null) return;

    const updatePosition = () =>
      updateTooltipPosition(hoveredElementRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [hoveredIndex]);

  function showTooltip(id: number, element: HTMLDivElement) {
    hoveredElementRef.current = element;
    setHoveredIndex(id);
    updateTooltipPosition(element);
  }

  function hideTooltip() {
    hoveredElementRef.current = null;
    setHoveredIndex(null);
  }

  function handleMouseMove(event: React.MouseEvent<HTMLImageElement>) {
    const halfWidth = event.currentTarget.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  }

  const hoveredItem = items.find((item) => item.id === hoveredIndex);
  const isShowingRemaining = hoveredIndex === remainingTooltipId;
  const tooltipLayer =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[1000]"
            style={
              tooltipPosition
                ? {
                    left: tooltipPosition.left,
                    top: tooltipPosition.top,
                    transform: "translate(-50%, -100%)",
                  }
                : { left: 0, top: 0, visibility: "hidden" }
            }
          >
            <AnimatePresence mode="popLayout">
              {(hoveredItem || isShowingRemaining) && (
                <motion.div
                  key={hoveredIndex}
                  initial={{ opacity: 0, y: 20, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 260,
                      damping: 10,
                    },
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.6 }}
                  style={{
                    translateX,
                    rotate,
                    whiteSpace: "nowrap",
                  }}
                  className="flex max-w-[250px] flex-col items-center justify-center rounded-[10px] border border-[#dfe5e8] bg-white px-3 py-2 text-left"
                  role="tooltip"
                >
                  {isShowingRemaining ? (
                    <>
                      <div className="text-[12px] font-bold text-[#202831]">
                        Pessoas restantes
                      </div>
                      <div className="mt-1 flex max-h-[180px] max-w-[220px] flex-col gap-1 overflow-y-auto text-[10px] whitespace-normal text-[#7c8795]">
                        {remainingItems.length ? (
                          remainingItems.map((item) => (
                            <span key={item.id}>{item.name}</span>
                          ))
                        ) : (
                          <span>
                            Os nomes ainda não estão disponíveis para esta
                            campanha.
                          </span>
                        )}
                        {numPeople && numPeople > remainingItems.length ? (
                          <span>
                            +{numPeople - remainingItems.length} sem
                            identificação
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : hoveredItem ? (
                    <>
                      <div className="text-[12px] font-bold text-[#202831]">
                        {hoveredItem.name}
                      </div>
                      <div className="text-[10px] text-[#7c8795]">
                        {hoveredItem.designation}
                      </div>
                    </>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className={cn("flex items-center gap-2", className)}
        aria-label={`${items.length + (numPeople ?? 0)} participantes`}
      >
        {items.map((item) => (
          <div
            className="group relative -mr-4"
            key={item.id}
            onFocus={(event) => showTooltip(item.id, event.currentTarget)}
            onMouseEnter={(event) => showTooltip(item.id, event.currentTarget)}
            onMouseLeave={hideTooltip}
            tabIndex={0}
          >
            <Image
              onMouseMove={handleMouseMove}
              height={32}
              width={32}
              src={item.image}
              alt={item.name}
              unoptimized
              className="relative z-10 m-0 h-8 w-8 rounded-full border-2 border-white object-cover object-top transition duration-300 group-hover:z-30 group-hover:scale-110"
            />
          </div>
        ))}
        {numPeople && numPeople > 0 ? (
          <div
            className="group relative -mr-4"
            onFocus={(event) =>
              showTooltip(remainingTooltipId, event.currentTarget)
            }
            onMouseEnter={(event) =>
              showTooltip(remainingTooltipId, event.currentTarget)
            }
            onMouseLeave={hideTooltip}
            tabIndex={0}
          >
            <span
              className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#202831] text-center text-[10px] font-medium text-white transition duration-300 group-hover:z-30 group-hover:scale-110"
              aria-label={`Mais ${numPeople} participantes`}
            >
              +{numPeople}
            </span>
          </div>
        ) : null}
      </div>
      {tooltipLayer}
    </>
  );
}
