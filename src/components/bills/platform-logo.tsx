import type { PlatformType } from "@/lib/types";

// A platform's logo as a small rounded square. Falls back to the name's
// first letter when the platform has no logo.
export default function PlatformLogo({
  platform,
  size = 20,
  className = "",
}: {
  platform: PlatformType;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (!platform.logoUrl) {
    return (
      <span
        className={`mk-platformlogo mk-platformlogo--text ${className}`}
        style={{ ...style, fontSize: Math.round(size * 0.5) }}
        title={platform.name}
        aria-label={platform.name}
      >
        {platform.name.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by the /api/v1 file proxy with the session cookie
    <img
      src={platform.logoUrl}
      alt={platform.name}
      title={platform.name}
      width={size}
      height={size}
      loading="lazy"
      className={`mk-platformlogo ${className}`}
      style={style}
    />
  );
}
