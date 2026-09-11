type PersonAvatarProps = {
  avatar?: string | null;
  className?: string;
  name: string;
  size?: "sm" | "md" | "lg";
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?"
  );
}

export function PersonAvatar({
  avatar,
  className = "",
  name,
  size = "md",
}: PersonAvatarProps) {
  return (
    <span
      className={`person-avatar person-avatar-${size} ${className}`.trim()}
      aria-hidden="true"
    >
      {avatar ? (
        <img className="size-full object-cover" src={avatar} alt="" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
