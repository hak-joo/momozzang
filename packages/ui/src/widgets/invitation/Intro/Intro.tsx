import { useEffect, useMemo } from 'react';
import styles from './Intro.module.css';
import introAnimation from '@shared/assets/images/intro.webp';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { PixelHeart } from '@shared/ui/Icon/PixelHeart';
import dayjs from 'dayjs';
import { ThemedImage } from '@shared/ui/ThemedImage/ThemedImage';
import { getThemeHue } from '@shared/styles/utils';

import { toHour24 } from '@shared/util/date';

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
    const { date, ampm, hour, minute } = weddingHallInfo;
    const hour24 = toHour24(hour, ampm);
    const weddingDay = dayjs(date).hour(hour24).minute(minute);
    const formattedDate = weddingDay.format('YYYY.MM.DD');
    const formattedAMPM = ampm;
    const formattedTime = weddingDay.format('HH:mm');
    const formattedDay = dayMap[weddingDay.format('dd')];

    const weddingDate = `${formattedDate} ${formattedDay} ${formattedTime} ${formattedAMPM}`;
    return weddingDate;
  }, [weddingHallInfo]);

  return (
    <div className={styles.intro}>
      <img src={introAnimation} alt={label} className={styles.video} loading="eager" decoding="async" />

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
