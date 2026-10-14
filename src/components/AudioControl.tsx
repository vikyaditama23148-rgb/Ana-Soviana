import { Volume2, VolumeX } from 'lucide-react';
import { experience } from '../config/experience';

interface Props {
  available: boolean;
  playing: boolean;
  onToggle: () => void;
}

/** Tombol musik. Tidak dirender sama sekali bila tidak ada file musik. */
export default function AudioControl({ available, playing, onToggle }: Props) {
  if (!available) return null;
  const label = playing ? experience.audio.labelOn : experience.audio.labelOff;
  return (
    <button type="button" className="icon-btn" onClick={onToggle} aria-label={label} aria-pressed={playing} title={label}>
      {playing ? <Volume2 size={20} strokeWidth={1.5} /> : <VolumeX size={20} strokeWidth={1.5} />}
    </button>
  );
}
