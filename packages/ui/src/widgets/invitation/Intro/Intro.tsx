import { useEffect, useRef, useState } from 'react';
import styles from './Intro.module.css';
import introVideo from '@shared/assets/videos/intro.mp4';

type IntroProps = {
  next: () => void;
  label?: string;
};

export function Intro({ next, label = 'Wedding day' }: IntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsUserAction, setNeedsUserAction] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;

    const tryPlay = async () => {
      if (!video) return;
      try {
        await video.play();
        setNeedsUserAction(false);
      } catch {
        setNeedsUserAction(true);
      }
    };

    const handleFirstInteraction = () => {
      void tryPlay();
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('pointerup', handleFirstInteraction);
    };

    window.addEventListener('touchend', handleFirstInteraction, { passive: true });
    window.addEventListener('pointerup', handleFirstInteraction, { passive: true });

    if (video.readyState >= 3) {
      void tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => {
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('pointerup', handleFirstInteraction);
      video.removeEventListener('canplay', tryPlay);
    };
  }, []);

  return (
    <div className={styles.intro}>
      <video
        ref={videoRef}
        src={introVideo}
        autoPlay
        muted
        playsInline
        controls={needsUserAction}
        preload="auto"
        className={styles.video}
        onEnded={next}
      />
    </div>
  );
}
