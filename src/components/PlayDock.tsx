import { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { experience } from '../config/experience';
import { sceneEvents } from '../lib/sceneState';

interface Props {
  onFinish: () => void;
}

/** Adegan interaktif: petunjuk sentuh, pesan kecil bergantian, dan tombol menuju akhir. */
export default function PlayDock({ onFinish }: Props) {
  const [whisper, setWhisper] = useState<{ text: string; key: number } | null>(null);
  const [next, setNext] = useState(0);

  const showWhisper = () => {
    const list = experience.whispers;
    setWhisper({ text: list[next % list.length], key: Date.now() });
    setNext((n) => n + 1);
    sceneEvents.emit('burstRandom');
  };

  return (
    <div className="play-dock">
      <p className="whisper" aria-live="polite" key={whisper?.key ?? 'hint'}>
        {whisper ? whisper.text : experience.labels.touchHint}
      </p>
      <div className="btn-row">
        <button type="button" className="btn" onClick={showWhisper}>
          <Sparkles size={18} strokeWidth={1.5} />
          <span>{experience.labels.whisperButton}</span>
        </button>
        <button type="button" className="btn btn-quiet" onClick={onFinish}>
          <Heart size={18} strokeWidth={1.5} />
          <span>{experience.labels.finish}</span>
        </button>
      </div>
    </div>
  );
}
