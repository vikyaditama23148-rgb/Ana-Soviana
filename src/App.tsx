import { Feather } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { experience } from './config/experience';
import { collapseScene, killDirector, playOpening, setLayout } from './lib/director';
import { isWebGLAvailable, prefersReducedMotion } from './lib/utils';
import { sceneState } from './lib/sceneState';
import { useAudio } from './hooks/useAudio';
import Backdrop from './components/Backdrop';
import IntroScreen from './components/IntroScreen';
import NameReveal from './components/NameReveal';
import PersonalMessage from './components/PersonalMessage';
import PlayDock from './components/PlayDock';
import FinalMoment from './components/FinalMoment';
import ExperienceControls from './components/ExperienceControls';
import FallbackHeart from './components/FallbackHeart';
import SceneBoundary from './components/SceneBoundary';
import PhotoLightbox from './components/PhotoLightbox';
import { photoRegistry } from './lib/photoRegistry';
import { photos } from './lib/photos';

const MainScene = lazy(() => import('./scenes/MainScene'));

type Phase = 'intro' | 'opening' | 'name' | 'letter' | 'play' | 'final' | 'collapsing';

export default function App() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [webgl] = useState(() => isWebGLAvailable());
  const [sceneFailed, setSceneFailed] = useState(false);
  const [sceneReady, setSceneReady] = useState(!webgl);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const audio = useAudio();
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  useEffect(() => {
    photoRegistry.onSelect = (i) => setLightbox(i);
    return () => {
      photoRegistry.onSelect = () => {};
    };
  }, []);

  const use3D = webgl && !sceneFailed;
  const ready = use3D ? sceneReady : true;

  useEffect(() => {
    document.title = experience.documentTitle;
    document.documentElement.style.setProperty('--bg', experience.colors.background);
    if (prefersReducedMotion()) sceneState.motion = 0.2;
    return () => killDirector();
  }, []);

  const startOpening = useCallback(() => {
    setPhase('opening');
    playOpening(() => {
      if (phaseRef.current === 'opening') setPhase('name');
    });
  }, []);

  const handleOpen = useCallback(() => {
    if (phaseRef.current !== 'intro') return;
    audio.play(); // dipicu oleh klik pengunjung, sesuai kebijakan autoplay browser
    startOpening();
  }, [audio, startOpening]);

  const handleReplay = useCallback(() => {
    if (phaseRef.current === 'collapsing' || phaseRef.current === 'intro') return;
    setPhase('collapsing');
    collapseScene(startOpening);
  }, [startOpening]);

  const toLetter = () => {
    setPhase('letter');
    setLayout(1);
  };
  const toPlay = () => {
    setPhase('play');
    setLayout(0);
  };
  const toFinal = () => setPhase('final');

  const showName = phase === 'name' || phase === 'play' || phase === 'final';
  const interactive = phase !== 'intro' && phase !== 'collapsing' && lightbox === null;
  const fallbackActive = phase !== 'intro' && phase !== 'collapsing';

  return (
    <div className="app" data-phase={phase}>
      <Backdrop />

      {use3D && (
        <SceneBoundary onError={() => setSceneFailed(true)}>
          <Suspense fallback={null}>
            <MainScene interactive={interactive} onReady={() => setSceneReady(true)} />
          </Suspense>
        </SceneBoundary>
      )}
      {!use3D && <FallbackHeart active={fallbackActive} raised={phase === 'letter'} />}

      <div className="vignette" aria-hidden="true" />

      <IntroScreen leaving={phase !== 'intro'} ready={ready} onOpen={handleOpen} />

      <main className="overlay">
        {showName && (
          <div className={`dock${phase === 'final' ? ' dock-final' : ''}`}>
            <NameReveal small={phase === 'final'} />
            {phase === 'name' && <NameActions onNext={toLetter} />}
            {phase === 'play' && <PlayDock onFinish={toFinal} onOpenPhotos={() => setLightbox(0)} />}
            {phase === 'final' && <FinalMoment onReplay={handleReplay} />}
          </div>
        )}
        {phase === 'letter' && <PersonalMessage onContinue={toPlay} />}
      </main>

      {lightbox !== null && photos.length > 0 && (
        <PhotoLightbox index={Math.min(lightbox, photos.length - 1)} onClose={() => setLightbox(null)} onChange={setLightbox} />
      )}

      {phase !== 'intro' && (
        <ExperienceControls
          showReplay={phase === 'name' || phase === 'letter' || phase === 'play'}
          onReplay={handleReplay}
          audio={audio}
        />
      )}
    </div>
  );
}


function NameActions({ onNext }: { onNext: () => void }) {
  return (
    <div className="name-actions">
      <button type="button" className="btn btn-primary" onClick={onNext} autoFocus>
        <Feather size={18} strokeWidth={1.5} />
        <span>{experience.labels.readLetter}</span>
      </button>
    </div>
  );
}