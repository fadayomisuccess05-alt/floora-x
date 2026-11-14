type LogoProps = {
  variant?: "light" | "dark"; // "dark" = for dark backgrounds
  showWordmark?: boolean;
  className?: string;
};

export function LogoMark({
  variant = "light",
  className = "h-9 w-9",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const body = variant === "light" ? "#0B2545" : "#FFFFFF";
  const cross = variant === "light" ? "#0FA3B1" : "#3DD6C6";
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 6 L32 26 L52 6"
        stroke={cross}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 59 V48 L32 26 L54 48 V59"
        stroke={body}
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="27" y="44" width="10" height="15" rx="3" fill="#FFB020" />
    </svg>
  );
}

export function Logo({
  variant = "light",
  showWordmark = true,
  className = "",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark variant={variant} />
      {showWordmark && (
        <span
          className={`font-display text-xl font-bold tracking-tight ${
            variant === "light" ? "text-navy" : "text-white"
          }`}
        >
          Floora
          <span
            className={variant === "light" ? "text-teal" : "text-teal-light"}
          >
            -X
          </span>
        </span>
      )}
    </span>
  );
}
