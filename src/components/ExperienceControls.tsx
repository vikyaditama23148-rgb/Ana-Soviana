import { RotateCcw } from 'lucide-react';
import { experience } from '../config/experience';
import AudioControl from './AudioControl';

interface Props {
  showReplay: boolean;
  onReplay: () => void;
  audio: { available: boolean; playing: boolean; toggle: () => void };
}

/** Kontrol kecil di sudut layar: ulangi (kiri) dan musik (kanan). */
export default function ExperienceControls({ showReplay, onReplay, audio }: Props) {
  return (
    <div className="corner-controls">
      <div>
        {showReplay && (
          <button
            type="button"
            className="icon-btn fade-in"
            onClick={onReplay}
            aria-label={experience.labels.replayShort}
            title={experience.labels.replayShort}
          >
            <RotateCcw size={19} strokeWidth={1.5} />
          </button>
        )}
      </div>
      <AudioControl available={audio.available} playing={audio.playing} onToggle={audio.toggle} />
    </div>
  );
}
