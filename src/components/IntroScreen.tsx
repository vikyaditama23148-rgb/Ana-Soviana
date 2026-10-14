import { Sparkles } from 'lucide-react';
import { experience } from '../config/experience';

interface Props {
  leaving: boolean;
  ready: boolean;
  onOpen: () => void;
}

export default function IntroScreen({ leaving, ready, onOpen }: Props) {
  return (
    <section className={`intro${leaving ? ' leaving' : ''}`} aria-hidden={leaving} aria-label="Undangan">
      <div className="intro-inner">
        <p className="intro-message">{experience.intro.message}</p>
        <button type="button" className="btn btn-primary" onClick={onOpen} disabled={!ready || leaving} tabIndex={leaving ? -1 : 0}>
          <Sparkles size={18} strokeWidth={1.5} />
          <span>{ready ? experience.intro.buttonLabel : experience.intro.loadingLabel}</span>
        </button>
      </div>
    </section>
  );
}
