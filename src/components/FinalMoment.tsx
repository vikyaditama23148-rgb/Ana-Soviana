import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { experience } from '../config/experience';

export default function FinalMoment({ onReplay }: { onReplay: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => btn.current?.focus({ preventScroll: true }), 2600);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="final">
      <p className="final-message">{experience.finalMessage}</p>
      <button ref={btn} type="button" className="btn btn-quiet final-replay" onClick={onReplay}>
        <RotateCcw size={17} strokeWidth={1.5} />
        <span>{experience.labels.replay}</span>
      </button>
    </div>
  );
}
