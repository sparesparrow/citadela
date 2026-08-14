/**
 * Značka Citadela — art-deco citadela nad třemi slábnoucími vlnami.
 * Gradienty mají unikátní ID podle instance; v původním jednosouborovém
 * webu se id="f" opakovalo ve všech SVG, což je v jednom dokumentu kolize.
 */
let counter = 0;

export function CitadelaMark({
  size = 46,
  ring = true,
  className,
}: {
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const id = `cm${++counter}`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Citadela"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E7CE84" />
          <stop offset="55%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#9A7E32" />
        </linearGradient>
      </defs>
      {ring && (
        <>
          <circle cx="32" cy="32" r="24.32" fill="none" stroke={`url(#${id})`} strokeWidth="1.6" />
          <circle cx="32" cy="32" r="22.19" fill="none" stroke={`url(#${id})`} strokeWidth="0.8" />
        </>
      )}
      <path
        d="M 17.07 39.25 L 17.07 27.31 L 18.77 27.31 L 18.77 25.60 L 20.69 25.60 L 20.69 23.89 L 21.97 23.89 L 21.97 22.61 L 23.25 22.61 L 23.25 21.12 L 24.75 21.12 L 24.75 22.61 L 24.32 22.61 L 24.32 21.12 L 25.81 21.12 L 25.81 22.61 L 25.60 22.61 L 25.60 19.20 L 26.88 19.20 L 26.88 17.07 L 28.37 17.07 L 28.37 15.36 L 29.87 15.36 L 29.87 17.07 L 31.15 17.07 L 31.15 15.79 L 31.47 15.79 L 32.00 11.09 L 32.53 15.79 L 32.85 15.79 L 32.85 17.07 L 34.13 17.07 L 34.13 15.36 L 35.63 15.36 L 35.63 17.07 L 37.12 17.07 L 37.12 19.20 L 38.40 19.20 L 38.40 22.61 L 38.19 22.61 L 38.19 21.12 L 39.68 21.12 L 39.68 22.61 L 39.25 22.61 L 39.25 21.12 L 40.75 21.12 L 40.75 22.61 L 42.03 22.61 L 42.03 23.89 L 43.31 23.89 L 43.31 25.60 L 45.23 25.60 L 45.23 27.31 L 46.93 27.31 L 46.93 39.25 Z"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="11.09" r="0.73" fill={`url(#${id})`} />
      <path d="M 27.73 42.24 Q 32.00 43.73 36.27 42.24" fill="none" stroke={`url(#${id})`} strokeWidth="1.12" strokeLinecap="round" />
      <path d="M 23.47 44.16 Q 32.00 45.97 40.53 44.16" fill="none" stroke={`url(#${id})`} strokeWidth="1.12" strokeLinecap="round" opacity="0.7" />
      <path d="M 18.77 46.08 Q 32.00 48.21 45.23 46.08" fill="none" stroke={`url(#${id})`} strokeWidth="1.12" strokeLinecap="round" opacity="0.45" />
      <path d="M 13.65 48.00 Q 32.00 50.45 50.35 48.00" fill="none" stroke={`url(#${id})`} strokeWidth="1.12" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}
