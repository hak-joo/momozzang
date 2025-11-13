import styles from './Intro.module.css';
import introVideo from '@shared/assets/videos/intro.mp4';

type IntroProps = {
  label?: string;
  next: () => void;
};

export function Intro({ label = 'Wedding day', next }: IntroProps) {
  return (
    <video src={introVideo} autoPlay muted playsInline className={styles.intro} onEnded={next} />
    // <div className={styles.intro}>
    //   {label && <div className={styles.label}>{label}</div>}

    //   <button onClick={next}>보러가기</button>
    // </div>
  );
}
