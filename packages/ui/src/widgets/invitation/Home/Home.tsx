import type { WeddingInvitation } from '@entities/WeddingInvitation/model';
import photoInRingImg from './PhotoInRing.png';
import weddingDayImg from './WeddingDay.png';
import PixelBadge from '@shared/ui/PixelBadge';
import styles from './Home.module.css';
import WeddingDay from './WeddingDay';
import ContactInfo from './ContactInfo';
import WeddingCalendar from './WeddingCalendar';

interface Props {
  data: WeddingInvitation;
}
function Home({ data }: Props) {
  const {
    weddingHallInfo: { date, ampm, hour, minute },
  } = data;

  return (
    <>
      <div className={styles.imgContainer}>
        <img className={styles.photoInRingImg} src={photoInRingImg} alt="반지 속 사진" />
        <img className={styles.weddingDayImg} src={weddingDayImg} alt="웨딩데이" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <PixelBadge text="Save the date" />
      </div>
      <WeddingDay date={date} ampm={ampm} hour={hour} minute={minute} />

      <ContactInfo />

      <WeddingCalendar />
    </>
  );
}

export default Home;
