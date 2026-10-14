/** Cadangan ringan (tanpa WebGL): hati SVG berdenyut dengan percikan cahaya. */
export default function FallbackHeart({ active, raised }: { active: boolean; raised: boolean }) {
  return (
    <div className={`fallback${active ? ' on' : ''}${raised ? ' raised' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <defs>
          <radialGradient id="fh" cx="50%" cy="38%" r="70%">
            <stop offset="0" stopColor="#ff8fb1" />
            <stop offset="0.55" stopColor="#d4183d" />
            <stop offset="1" stopColor="#5a0a1c" />
          </radialGradient>
        </defs>
        <path
          d="M32 56 C10 40 5 29 5 22 C5 14 11 9 18 9 C25 9 30 13 32 18 C34 13 39 9 46 9 C53 9 59 14 59 22 C59 29 54 40 32 56Z"
          fill="url(#fh)"
        />
      </svg>
    </div>
  );
}
