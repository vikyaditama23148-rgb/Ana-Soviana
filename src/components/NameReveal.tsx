import { experience } from '../config/experience';

/** Nama penerima dengan kemunculan huruf demi huruf dan cahaya lembut. */
export default function NameReveal({ small = false }: { small?: boolean }) {
  const name = experience.recipientName;
  return (
    <h1 className={`name${small ? ' name-small' : ''}`} aria-label={name}>
      <span aria-hidden="true">
        {Array.from(name).map((ch, i) => (
          <span key={i} className="name-letter" style={{ ['--i' as string]: i }}>
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        ))}
      </span>
    </h1>
  );
}
