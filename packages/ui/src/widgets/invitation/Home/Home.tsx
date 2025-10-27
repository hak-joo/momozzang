import type { WeddingInvitation } from '@entities/WeddingInvitation/model';
import photoInRingImg from '@shared/assets/images/photo-in-ring.png';
import weddingDayImg from '@shared/assets/images/wedding-day.png';
import { PixelBadge } from '@shared/ui/PixelBadge';
import styles from './Home.module.css';
import { WeddingDay } from './WeddingDay';
import { WeddingCalendar } from './WeddingCalendar';
import { Introduction } from './Introduction';

interface Props {
  data: WeddingInvitation;
}
export function Home({ data }: Props) {
  const {
    weddingHallInfo: { date, ampm, hour, minute },
  } = data;

  return (
    <div className={styles.homeWrapper}>
      <div className={styles.imgContainer}>
        <img className={styles.photoInRingImg} src={photoInRingImg} alt="반지 속 사진" />
        <img className={styles.weddingDayImg} src={weddingDayImg} alt="웨딩데이" />
      </div>

      <div className={styles.weddingDayContainer}>
        <PixelBadge text="Save the date" />
        <WeddingDay date={date} ampm={ampm} hour={hour} minute={minute} />
      </div>

      <Introduction />

      <WeddingCalendar />
    </div>
  );
}
