/** Latar belakang: gradasi burgundy, siluet bunga yang berpendar, dan vinyet. */
function Bloom({ petals = 12, id }: { petals?: number; id: string }) {
  const arr = Array.from({ length: petals }, (_, i) => (i * 360) / petals);
  const inner = Array.from({ length: petals }, (_, i) => (i * 360) / petals + 360 / petals / 2);
  return (
    <svg viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff6a8e" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#a5123a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#3a0614" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      {arr.map((a) => (
        <path key={`o${a}`} transform={`rotate(${a})`} d="M0 -8 C 38 -60, 46 -140, 0 -190 C -46 -140, -38 -60, 0 -8Z" fill={`url(#${id}-g)`} />
      ))}
      {inner.map((a) => (
        <path key={`i${a}`} transform={`rotate(${a})`} d="M0 -6 C 26 -40, 30 -100, 0 -130 C -30 -100, -26 -40, 0 -6Z" fill={`url(#${id}-g)`} opacity="0.85" />
      ))}
      <circle r="16" fill="#f6c978" opacity="0.7" />
    </svg>
  );
}

export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-glow" />
      <div className="bloom bloom-a">
        <Bloom id="a" petals={14} />
      </div>
      <div className="bloom bloom-b">
        <Bloom id="b" petals={10} />
      </div>
    </div>
  );
}
