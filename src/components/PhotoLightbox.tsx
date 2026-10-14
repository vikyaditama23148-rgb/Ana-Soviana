import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { experience } from '../config/experience';
import { photos } from '../lib/photos';

interface Props {
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}

/** Tampilan besar foto dengan caption opsional. Esc / ketuk latar untuk menutup. */
export default function PhotoLightbox({ index, onClose, onChange }: Props) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const total = photos.length;
  const photo = photos[index];
  const go = (d: number) => onChange((index + d + total) % total);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && total > 1) go(1);
      else if (e.key === 'ArrowLeft' && total > 1) go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  if (!photo) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={experience.labels.memories} onClick={onClose}>
      <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img key={photo.url} src={photo.url} alt={photo.caption ?? `${experience.labels.memories} ${index + 1}`} />
        {(photo.caption || total > 1) && (
          <figcaption>
            {photo.caption && <span className="lightbox-caption">{photo.caption}</span>}
            {total > 1 && (
              <span className="lightbox-count">
                {index + 1} / {total}
              </span>
            )}
          </figcaption>
        )}
      </figure>
      <button ref={closeBtn} type="button" className="icon-btn lightbox-close" onClick={onClose} aria-label={experience.labels.close}>
        <X size={20} strokeWidth={1.5} />
      </button>
      {total > 1 && (
        <>
          <button
            type="button"
            className="icon-btn lightbox-nav lightbox-prev"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label={experience.labels.prevPhoto}
          >
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="icon-btn lightbox-nav lightbox-next"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label={experience.labels.nextPhoto}
          >
            <ChevronRight size={22} strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  );
}