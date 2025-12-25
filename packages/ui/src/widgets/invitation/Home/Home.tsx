import type { WeddingInvitation } from '@entities/WeddingInvitation/model';

import { PixelBadge } from '@shared/ui/PixelBadge';
import styles from './Home.module.css';
import { WeddingDay } from './WeddingDay';
import { WeddingCalendar } from './WeddingCalendar';
import { Introduction } from './Introduction';
import { Decoration } from '@shared/ui/Decoration/Decoration';
import { RingPhoto } from './RingPhoto';

interface Props {
  data: WeddingInvitation;
}
export function Home({ data }: Props) {
  const {
    weddingHallInfo: { date, ampm, hour, minute },
    customization,
  } = data;

  return (
    <div className={styles.homeWrapper}>
      <RingPhoto src={customization?.mainImageUrl} />

      <div className={styles.weddingDayContainer}>
        <PixelBadge text="Save the Date" />
        <WeddingDay date={date} ampm={ampm} hour={hour} minute={minute} />
      </div>

      <Introduction />

      <WeddingCalendar />

      <Decoration variant="sparkle" width={50} left={70} />
      <Decoration variant="sparkleCrossDashed" width={43} right={44} top={40} />
      <Decoration variant="sparkle" width={29} left={-30} top={130} />
      <Decoration variant="sparkle" width={36} left={-20} top={320} />
      <Decoration variant="sparkleCross" width={50} left={20} top={390} />
      <Decoration variant="sparkle" width={50} right={48} top={665} />
    </div>
  );
}
