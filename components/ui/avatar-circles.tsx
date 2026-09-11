"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AvatarCirclesProps {
  className?: string;
  numPeople?: number;
  avatarUrls: string[];
}

const AvatarCircles = ({
  numPeople,
  className,
  avatarUrls,
}: AvatarCirclesProps) => {
  return (
    <div
      className={cn("z-10 flex -space-x-4 rtl:space-x-reverse", className)}
      aria-label={`${avatarUrls.length + (numPeople ?? 0)} participantes`}
    >
      {avatarUrls.map((url, index) => (
        <img
          key={`${url}-${index}`}
          className="h-10 w-10 rounded-full border-2 border-white object-cover dark:border-gray-800"
          src={url}
          width={40}
          height={40}
          alt={`Participante ${index + 1}`}
          loading="lazy"
        />
      ))}
      {numPeople && numPeople > 0 ? (
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#202831] text-center text-xs font-medium text-white dark:border-gray-800 dark:bg-white dark:text-black"
          aria-label={`Mais ${numPeople} participantes`}
        >
          +{numPeople}
        </span>
      ) : null}
    </div>
  );
};

export { AvatarCircles };
