/**
 * Originální zlato-na-černi grafika místo licencovaných fotografií.
 * Každá plocha je navržená tak, aby se dala nahradit skutečným snímkem —
 * stačí předat `photo` a komponenta se odsune.
 */
let artId = 0;

function useIds() {
  const n = ++artId;
  return { fill: `af${n}`, glow: `ag${n}`, clip: `ac${n}` };
}

function Defs({ fill, glow }: { fill: string; glow: string }) {
  return (
    <defs>
      <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E7CE84" />
        <stop offset="55%" stopColor="#C9A84C" />
        <stop offset="100%" stopColor="#9A7E32" />
      </linearGradient>
      <radialGradient id={glow} cx="50%" cy="60%" r="60%">
        <stop offset="0%" stopColor="#E7CE84" stopOpacity="0.5" />
        <stop offset="50%" stopColor="#C9A84C" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Vodní hladina — vrstvy slábnoucích odlesků. */
function Ripples({ fill, y, width, count = 8 }: { fill: string; y: number; width: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const yy = y + 8 + i * 15;
        const inset = (i % 3) * 40 + 90;
        return (
          <line
            key={i}
            x1={inset}
            y1={yy}
            x2={width - inset}
            y2={yy}
            stroke={`url(#${fill})`}
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity={Math.max(0.06, 0.55 - i * 0.065)}
          />
        );
      })}
    </>
  );
}

export function HeroScene() {
  const { fill, glow } = useIds();
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs fill={fill} glow={glow} />
      <rect width="1600" height="900" fill="#0A0A0A" />
      <ellipse cx="800" cy="470" rx="800" ry="470" fill={`url(#${glow})`} />
      <circle cx="800" cy="330" r="96" fill={`url(#${fill})`} opacity="0.42" />
      <path
        d="M 640 520 L 640 400 L 662 400 L 662 380 L 690 380 L 690 358 L 712 358 L 712 340 L 740 340 L 740 316 L 770 316 L 770 340 L 800 250 L 830 340 L 860 316 L 860 340 L 888 340 L 888 358 L 910 358 L 910 380 L 938 380 L 938 400 L 960 400 L 960 520 Z"
        fill="none"
        stroke={`url(#${fill})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="800" cy="250" r="5" fill={`url(#${fill})`} />
      <line x1="0" y1="520" x2="1600" y2="520" stroke="#E7CE84" strokeWidth="1.6" opacity="0.7" />
      <Ripples fill={fill} y={520} width={1600} count={12} />
    </svg>
  );
}

export function ArrivalPlate() {
  const { fill, glow } = useIds();
  return (
    <svg viewBox="0 0 640 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs fill={fill} glow={glow} />
      <rect width="640" height="460" fill="#0c0b08" />
      <ellipse cx="320" cy="212" rx="320" ry="230" fill={`url(#${glow})`} />
      <path d="M 192 460 L 294 212 L 346 212 L 448 460 Z" fill="none" stroke={`url(#${fill})`} strokeWidth="2" />
      {[425, 389, 354, 318, 283, 247].map((y, i) => (
        <line key={y} x1={207 + i * 14} y1={y} x2={433 - i * 14} y2={y} stroke={`url(#${fill})`} strokeWidth="1" opacity={0.44 - i * 0.055} />
      ))}
      <line x1="274" y1="212" x2="274" y2="158" stroke={`url(#${fill})`} strokeWidth="2.4" />
      <rect x="267" y="148" width="14" height="10" fill={`url(#${fill})`} />
      <line x1="366" y1="212" x2="366" y2="158" stroke={`url(#${fill})`} strokeWidth="2.4" />
      <rect x="359" y="148" width="14" height="10" fill={`url(#${fill})`} />
      <path d="M 274 158 Q 320 134 366 158" fill="none" stroke={`url(#${fill})`} strokeWidth="2" />
      <line x1="0" y1="212" x2="640" y2="212" stroke="#E7CE84" strokeWidth="1.6" opacity="0.7" />
      <Ripples fill={fill} y={212} width={640} />
    </svg>
  );
}

export function SuitePlate() {
  const { fill, glow, clip } = useIds();
  return (
    <svg viewBox="0 0 640 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs fill={fill} glow={glow} />
      <rect width="640" height="460" fill="#0c0b08" />
      <clipPath id={clip}>
        <rect x="77" y="55" width="486" height="350" rx="6" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x="77" y="55" width="486" height="350" fill="#0e0c08" />
        <circle cx="320" cy="200" r="120" fill={`url(#${glow})`} />
        <circle cx="320" cy="190" r="34" fill={`url(#${fill})`} opacity="0.85" />
        <line x1="77" y1="230" x2="563" y2="230" stroke="#E7CE84" strokeWidth="1.6" opacity="0.7" />
        <Ripples fill={fill} y={230} width={640} count={9} />
      </g>
      <rect x="77" y="55" width="486" height="350" rx="6" fill="none" stroke={`url(#${fill})`} strokeWidth="3" />
      <line x1="320" y1="55" x2="320" y2="405" stroke={`url(#${fill})`} strokeWidth="2.2" />
      <line x1="77" y1="230" x2="563" y2="230" stroke={`url(#${fill})`} strokeWidth="2.2" />
    </svg>
  );
}

export function ScooterPlate() {
  const { fill, glow } = useIds();
  return (
    <svg viewBox="0 0 640 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs fill={fill} glow={glow} />
      <rect width="640" height="460" fill="#0c0b08" />
      <ellipse cx="320" cy="203" rx="320" ry="207" fill={`url(#${glow})`} />
      <circle cx="320" cy="167" r="40" fill={`url(#${fill})`} opacity="0.5" />
      <line x1="0" y1="193" x2="640" y2="193" stroke="#E7CE84" strokeWidth="1.6" opacity="0.7" />
      <Ripples fill={fill} y={193} width={640} count={7} />
      <circle cx="253" cy="320" r="23" stroke={`url(#${fill})`} fill="none" strokeWidth="3" />
      <circle cx="253" cy="320" r="9.2" stroke={`url(#${fill})`} fill="none" strokeWidth="2.1" />
      <circle cx="387" cy="320" r="23" stroke={`url(#${fill})`} fill="none" strokeWidth="3" />
      <circle cx="387" cy="320" r="9.2" stroke={`url(#${fill})`} fill="none" strokeWidth="2.1" />
      <path d="M 269 310 Q 320 319 361 308" stroke={`url(#${fill})`} fill="none" strokeWidth="3" strokeLinecap="round" />
      <path d="M 387 306 L 398 171" stroke={`url(#${fill})`} fill="none" strokeWidth="3.3" strokeLinecap="round" />
      <path d="M 364 173 L 419 166" stroke={`url(#${fill})`} fill="none" strokeWidth="3" strokeLinecap="round" />
      <circle cx="364" cy="173" r="4.6" fill={`url(#${fill})`} />
    </svg>
  );
}

/** Grafika pokoje — variace podle indexu, aby karty nebyly identické. */
export function RoomPlate({ variant }: { variant: number }) {
  const { fill, glow } = useIds();
  const towers = 2 + (variant % 3);
  return (
    <svg viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Defs fill={fill} glow={glow} />
      <rect width="640" height="480" fill="#0c0b08" />
      <ellipse cx="320" cy="250" rx="300" ry="230" fill={`url(#${glow})`} />
      <circle cx={220 + variant * 60} cy="150" r={30 + variant * 6} fill={`url(#${fill})`} opacity="0.38" />
      {Array.from({ length: towers }, (_, i) => {
        const x = 180 + i * (280 / towers);
        const h = 120 + ((i + variant) % 3) * 46;
        return (
          <g key={i}>
            <rect x={x} y={270 - h} width="72" height={h} fill="none" stroke={`url(#${fill})`} strokeWidth="2" />
            <line x1={x + 36} y1={270 - h} x2={x + 36} y2={270 - h - 26} stroke={`url(#${fill})`} strokeWidth="2" />
            <rect x={x + 29} y={270 - h - 34} width="14" height="9" fill={`url(#${fill})`} />
          </g>
        );
      })}
      <line x1="0" y1="270" x2="640" y2="270" stroke="#E7CE84" strokeWidth="1.6" opacity="0.7" />
      <Ripples fill={fill} y={270} width={640} count={10} />
    </svg>
  );
}

export const plates = [ArrivalPlate, SuitePlate, ScooterPlate];
