import { useEffect, useId, useState } from 'react';
import styles from './IntroOverlay.module.css';

function IntroOverlay() {
  const [animationEnded, setAnimationEnded] = useState<boolean>(false);
  const maskId = useId().replace(/:/g, '_');
  const filterId = `${maskId}_blur`;
  useEffect(() => {
    const total = 1500;
    const timeout = setTimeout(() => {
      setAnimationEnded(true);
    }, total);
    return () => clearTimeout(timeout);
  }, []);

  if (animationEnded) return;

  return (
    <div className={styles.overlay}>
      <svg className={styles.svg}>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <circle className={styles.circle} cx="50%" cy="50%" r="0" fill="black" />
          </mask>

          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="black" mask={`url(#${maskId})`} />

        <circle
          className={styles.shadow}
          cx="50%"
          cy="50%"
          r="0"
          style={{ filter: `url(#${filterId})` }}
        />
      </svg>
    </div>
  );
}
export default IntroOverlay;
