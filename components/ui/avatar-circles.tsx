"use client";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

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
      className={cn("z-10 flex -space-x-3 rtl:space-x-reverse", className)}
      aria-label={`${avatarUrls.length + (numPeople ?? 0)} participantes`}
    >
      {avatarUrls.map((url, index) => (
        <img
          key={`${url}-${index}`}
          className="h-8 w-8 rounded-full border-2 border-white object-cover"
          src={url}
          width={32}
          height={32}
          alt={`Participante ${index + 1}`}
          loading="lazy"
        />
      ))}
      {numPeople && numPeople > 0 ? (
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#202831] text-center text-[10px] font-medium text-white"
          aria-label={`Mais ${numPeople} participantes`}
        >
          +{numPeople}
        </span>
      ) : null}
    </div>
  );
};

export { AvatarCircles };
