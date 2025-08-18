import styles from './Intro.module.css';

type IntroProps = {
  onEnter?: () => void;
};

function Intro({ onEnter }: IntroProps) {
  return (
    <div className={styles.introWrap}>
      <div className={styles.logo}>💌</div>
      <h1 className={styles.title}>김철수 & 이영희의 결혼식</h1>
      <p className={styles.date}>2025년 10월 10일 토요일 오후 1시</p>
      <button className={styles.enterButton} onClick={onEnter}>
        모바일 청첩장 보기
      </button>
    </div>
  );
}

export default Intro;
