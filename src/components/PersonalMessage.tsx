import { useEffect, useMemo, useRef, useState } from 'react';
import { Flower2 } from 'lucide-react';
import { experience } from '../config/experience';
import { prefersReducedMotion } from '../lib/utils';

interface Props {
  onContinue: () => void;
}

/** Surat pribadi: kata-kata muncul perlahan; ketuk untuk menampilkan semuanya. */
export default function PersonalMessage({ onContinue }: Props) {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const paragraphs = useMemo(
    () =>
      experience.letter
        .trim()
        .split(/\n\s*\n/)
        .map((p) => p.trim().replace(/\s*\n\s*/g, ' ')),
    [],
  );
  const wordCount = useMemo(() => paragraphs.reduce((n, p) => n + p.split(/\s+/).length, 0), [paragraphs]);
  const [done, setDone] = useState(reduced);
  const [skipped, setSkipped] = useState(reduced);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (done) return;
    const total = wordCount * experience.animation.letterWordDelayMs + 1200;
    const id = window.setTimeout(() => setDone(true), total);
    return () => window.clearTimeout(id);
  }, [done, wordCount]);

  useEffect(() => {
    if (done) btn.current?.focus({ preventScroll: true });
  }, [done]);

  let counter = 0;
  return (
    <section className="letter" aria-label={`Pesan untuk ${experience.recipientName}`}>
      <div
        className={`letter-scroll${skipped ? ' revealed' : ''}`}
        onClick={() => {
          setSkipped(true);
          setDone(true);
        }}
      >
        {paragraphs.map((p, pi) => (
          <p key={pi} className={pi === 0 ? 'letter-salute' : pi === paragraphs.length - 1 ? 'letter-sign' : 'letter-body'}>
            {p.split(/\s+/).map((w, wi) => {
              const i = counter++;
              return (
                <span key={wi} className="word" style={{ ['--i' as string]: i }}>
                  {w}{' '}
                </span>
              );
            })}
          </p>
        ))}
      </div>
      <div className={`letter-actions${done ? ' show' : ''}`}>
        <button ref={btn} type="button" className="btn" onClick={onContinue} tabIndex={done ? 0 : -1} disabled={!done}>
          <Flower2 size={18} strokeWidth={1.5} />
          <span>{experience.labels.continue}</span>
        </button>
      </div>
      {!done && <p className="letter-hint">{experience.labels.skipTyping}</p>}
    </section>
  );
}
