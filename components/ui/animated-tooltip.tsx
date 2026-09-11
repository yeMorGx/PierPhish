"use client";

import Image from "next/image";
import React, { useState } from "react";
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
};

export function AnimatedTooltip({
  items,
  className,
  numPeople,
}: AnimatedTooltipProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

  function handleMouseMove(event: React.MouseEvent<HTMLImageElement>) {
    const halfWidth = event.currentTarget.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-label={`${items.length + (numPeople ?? 0)} participantes`}
    >
      {items.map((item) => (
        <div
          className="group relative -mr-4"
          key={item.id}
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence mode="popLayout">
            {hoveredIndex === item.id && (
              <motion.div
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
                className="absolute -top-[58px] -left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center rounded-[10px] border border-[#dfe5e8] bg-white px-3 py-2 text-left text-xs"
              >
                <div className="relative z-30 text-[12px] font-bold text-[#202831]">
                  {item.name}
                </div>
                <div className="relative z-30 text-[10px] text-[#7c8795]">
                  {item.designation}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
        <span
          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#202831] text-center text-[10px] font-medium text-white"
          aria-label={`Mais ${numPeople} participantes`}
        >
          +{numPeople}
        </span>
      ) : null}
    </div>
  );
}
