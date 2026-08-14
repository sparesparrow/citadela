const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Ikony jsou pojmenované podle motivu, ne podle klíče vybavení —
 *  mapování zajišťuje `amenityIcons` v src/lib/site.ts. */
const paths: Record<string, React.ReactNode> = {
  pool: (
    <>
      <path d="M3 15q3-2 6 0t6 0 6 0M3 19q3-2 6 0t6 0 6 0" {...s} />
      <path d="M8 12V5.5A2.5 2.5 0 0 1 13 5.5M16 12V5.5" {...s} />
      <path d="M8 8.5h8" {...s} />
    </>
  ),
  sauna: (
    <>
      <rect x="3" y="10" width="18" height="10" rx="2" {...s} />
      <path d="M7 7c0-1.3 1-1.7 1-2.8M11 7c0-1.3 1-1.7 1-2.8M15 7c0-1.3 1-1.7 1-2.8" {...s} />
      <path d="M6 20v-4h12v4" {...s} />
    </>
  ),
  whirlpool: (
    <>
      <path d="M3 12h18v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" {...s} />
      <path d="M7 12V7.5A2.5 2.5 0 0 1 12 7.5" {...s} />
      <circle cx="8" cy="16" r=".9" fill="currentColor" />
      <circle cx="12" cy="16.6" r=".9" fill="currentColor" />
      <circle cx="16" cy="16" r=".9" fill="currentColor" />
      <path d="M5 22l1-2M19 22l-1-2" {...s} />
    </>
  ),
  wifi: (
    <>
      <path d="M2 8.8a15 15 0 0 1 20 0" {...s} />
      <path d="M5.5 12.4a10 10 0 0 1 13 0" {...s} />
      <path d="M9 16a5 5 0 0 1 6 0" {...s} />
      <circle cx="12" cy="19.5" r="1.1" fill="currentColor" />
    </>
  ),
  parking: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" {...s} />
      <path d="M9.5 17V7.5h3a2.75 2.75 0 0 1 0 5.5h-3" {...s} />
    </>
  ),
  grill: (
    <>
      <path d="M4 5h16l-1.6 7.5a5 5 0 0 1-4.9 4H10.5a5 5 0 0 1-4.9-4z" {...s} />
      <path d="M9 17l-1.5 5M15 17l1.5 5" {...s} />
      <path d="M7 9h10" {...s} />
    </>
  ),
  firePit: (
    <>
      <path d="M12 14c1.9 0 3-1.3 3-2.8 0-2.1-2.3-2.9-1.9-5.5-1.8.9-3.2 2.7-3.2 4.8C9.9 12.6 10.8 14 12 14z" {...s} />
      <path d="M4 18l16 0" {...s} />
      <path d="M6.5 21l11-4M17.5 21l-11-4" {...s} />
    </>
  ),
  kitchen: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" {...s} />
      <path d="M3 11h18M8 4v7M7 15h3" {...s} />
      <circle cx="16" cy="15.5" r="2" {...s} />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h13a4 4 0 0 1 0 8H8a4 4 0 0 1-4-4z" {...s} />
      <path d="M17 10h1.6a2.4 2.4 0 0 1 0 4.8H17" {...s} />
      <path d="M8 6.5c0-1 1-1.2 1-2.2M12 6.5c0-1 1-1.2 1-2.2" {...s} />
      <path d="M5 20h13" {...s} />
    </>
  ),
  billiards: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" {...s} />
      <circle cx="9" cy="12" r="1.9" {...s} />
      <circle cx="15" cy="10" r="1.9" {...s} />
      <path d="M5 8.2h.01M19 15.8h.01" {...s} />
    </>
  ),
  sound: (
    <>
      <path d="M4 9v6h3l5 4V5L7 9z" {...s} />
      <path d="M16 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" {...s} />
    </>
  ),
  tv: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" {...s} />
      <path d="M8 21h8M12 17v4" {...s} />
    </>
  ),
  lakeView: (
    <>
      <circle cx="12" cy="8" r="3.4" {...s} />
      <path d="M2 15q5 2 10 0t10 0M2 19q5 2 10 0t10 0" {...s} />
    </>
  ),
  garden: (
    <>
      <path d="M12 21v-7" {...s} />
      <path d="M12 14c-3.5 0-5-2-5-4.5S9 5 12 5s5 2 5 4.5S15.5 14 12 14z" {...s} />
      <path d="M4 21h16" {...s} />
    </>
  ),
  nonSmoking: (
    <>
      <circle cx="12" cy="12" r="9" {...s} />
      <path d="M5.6 5.6l12.8 12.8M8 13h8" {...s} />
    </>
  ),
  laundry: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" {...s} />
      <circle cx="12" cy="14" r="4.2" {...s} />
      <path d="M7 6.5h.01M10 6.5h.01" {...s} />
    </>
  ),
  scooter: (
    <>
      <circle cx="5.5" cy="18" r="2.6" {...s} />
      <circle cx="18.5" cy="18" r="2.6" {...s} />
      <path d="M16.5 18H8.5L15 6h-2" {...s} />
      <path d="M15 6h3" {...s} />
    </>
  ),
  chopper: (
    <>
      <circle cx="5.5" cy="17" r="3.2" {...s} />
      <circle cx="18.5" cy="17" r="3.2" {...s} />
      <path d="M8.7 17h6.6M9 13h5l2-4h2" {...s} />
      <path d="M14 9l-3.5 4M6 13l2-3h4" {...s} />
    </>
  ),
};

export function AmenityIcon({ name, size = 24 }: { name: string; size?: number }) {
  const node = paths[name];
  if (!node) return <CheckIcon size={size} />;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {node}
    </svg>
  );
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M4 12.5l5 5L20 6.5" {...s} />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M23 12.2c0-.8-.1-1.6-.2-2.3H12v4.5h6.1a5.2 5.2 0 0 1-2.3 3.4v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.2z" />
      <path fill="#34A853" d="M12 23.5c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v3A11.5 11.5 0 0 0 12 23.5z" />
      <path fill="#FBBC05" d="M5.8 14.6a6.9 6.9 0 0 1 0-4.4v-3H2.1a11.5 11.5 0 0 0 0 10.4z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11.5 11.5 0 0 0 2.1 7.2l3.7 3a6.8 6.8 0 0 1 6.2-4.8z" />
    </svg>
  );
}
