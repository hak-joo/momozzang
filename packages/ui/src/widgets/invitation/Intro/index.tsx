import styles from './style.module.css';

type IntroProps = {
  label?: string;
  next: () => void;
};

export default function Intro({ label = 'Wedding day', next }: IntroProps) {
  return (
    <div className={styles.intro}>
      {label && <div className={styles.label}>{label}</div>}

      <button onClick={next}>보러가기</button>
    </div>
  );
}
