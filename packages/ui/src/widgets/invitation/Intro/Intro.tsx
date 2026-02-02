import { useEffect, useMemo } from 'react';
import styles from './Intro.module.css';
import introPng from '@shared/assets/images/intro.png';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { PixelHeart } from '@shared/ui/Icon/PixelHeart';
import dayjs from 'dayjs';
import { ThemedImage } from '@shared/ui/ThemedImage/ThemedImage';
import { getThemeHue } from '@shared/styles/utils';

type IntroProps = {
  next: () => void;
  label?: string;
};

const ANIMATION_DURATION = 4000;
const dayMap: Record<string, string> = {
  일: 'SUN',
  월: 'MON',
  화: 'TUE',
  수: 'WED',
  목: 'THU',
  금: 'FRI',
  토: 'SAT',
};

const AMPMMap: Record<string, string> = {
  오전: 'AM',
  오후: 'PM',
};

export function Intro({ next, label = 'Wedding day' }: IntroProps) {
  useEffect(() => {
    const timer = setTimeout(next, ANIMATION_DURATION);
    return () => clearTimeout(timer);
  }, [next]);

  const {
    couple: { bride, groom },
    customization,
    weddingHallInfo,
  } = useInvitation();
  const themeHue = getThemeHue(customization?.themeColor);

  const weddingDate = useMemo(() => {
    if (!weddingHallInfo) return '';
    const { date, hour, minute } = weddingHallInfo;
    const formattedDate = dayjs(date).format('YYYY.MM.DD');
    const formattedAMPM = AMPMMap[dayjs().hour(hour).minute(minute).format('A')];
    const formattedTime = dayjs().hour(hour).minute(minute).format(`HH:mm`);
    const formattedDay = dayMap[dayjs(date).format('dd')];

    const weddingDate = `${formattedDate} ${formattedDay} ${formattedTime} ${formattedAMPM}`;
    return weddingDate;
  }, [weddingHallInfo]);

  return (
    <div className={styles.intro}>
      <ThemedImage src={introPng} alt={label} className={styles.video} targetHue={themeHue} />

      {bride && groom && (
        <div className={styles.contents}>
          <div>
            {`신랑 ${groom.name}`} <PixelHeart className={styles.heart} /> {`신부 ${bride.name}`}
          </div>
          {weddingDate && <div>{weddingDate}</div>}
        </div>
      )}
    </div>
  );
}
