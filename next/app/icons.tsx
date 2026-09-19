/**
 * Small inline stroke icons. Inline rather than an icon font or a package:
 * eight glyphs do not justify a dependency or a webfont request, and stroke
 * SVG inherits currentColor so it follows the theme for free.
 */
const COMMON = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export type IconName =
  | "counselling"
  | "family"
  | "crisis"
  | "confidential"
  | "qualified"
  | "compassionate"
  | "place"
  | "video";

const PATHS: Record<IconName, React.ReactNode> = {
  counselling: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.2-.6L3 21l1.7-5a8.2 8.2 0 0 1-.7-3.4 8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8 7.3Z" />
    </>
  ),
  family: (
    <>
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3.2" />
      <path d="M22 20v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.6a4 4 0 0 1 0 6.8" />
    </>
  ),
  crisis: (
    <>
      <path d="M20.8 9.6c0 5.4-5.7 9.1-8.1 10.2a1.7 1.7 0 0 1-1.4 0C8.9 18.7 3.2 15 3.2 9.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z" />
    </>
  ),
  confidential: (
    <>
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </>
  ),
  qualified: (
    <>
      <path d="M12 3 2.5 8 12 13l9.5-5L12 3Z" />
      <path d="M6.5 10.4V15c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.6" />
    </>
  ),
  compassionate: (
    <>
      <path d="M12 20.5s-7-4.3-7-9.2A3.9 3.9 0 0 1 12 8.6a3.9 3.9 0 0 1 7 2.7c0 4.9-7 9.2-7 9.2Z" />
    </>
  ),
  place: (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="6.5" width="13" height="11" rx="2" />
      <path d="m15.5 11 6-3v8l-6-3" />
    </>
  ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg {...COMMON} className={className}>
      {PATHS[name]}
    </svg>
  );
}
