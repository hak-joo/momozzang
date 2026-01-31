import { useInvitation } from '@entities/WeddingInvitation/Context';
import styles from './AboutUs.module.css';
import clsx from 'clsx';
import * as BottomSheet from '@shared/ui/BottomSheet';
import photoBookCover from '@shared/assets/images/photo-book-cover.png';
import heartBalloon from '@shared/assets/images/heart-balloon.png';
import { getThemeHue, PURPLE_HUE } from '@shared/styles/utils';
import { ThemedImage } from '@shared/ui/ThemedImage/ThemedImage';
import { useImageHueShift } from '@shared/hooks/useImageHueShift';

interface Props {
  className?: string;
}
export function AboutUs({ className }: Props) {
  const { aboutUs, couple, customization } = useInvitation();

  const themeHue = getThemeHue(customization?.themeColor);
  const themedPhotoBookCover = useImageHueShift(photoBookCover, themeHue);
  if (!aboutUs) return null;

  return (
    <BottomSheet.Root>
      <BottomSheet.Trigger asChild>
        <button className={clsx(styles.triggerButton, className)}>
          <span>About Us!</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="12"
            viewBox="0 0 13 12"
            fill="none"
          >
            <path
              d="M6.0625 9.5L1.29883 1.25L0.866212 0.499999L12.124 0.5L11.6914 1.25L6.92773 9.5L6.49512 10.25L6.0625 9.5Z"
              fill="#484848"
              stroke="white"
            />
          </svg>
        </button>
      </BottomSheet.Trigger>
      <BottomSheet.Content height={'80vh'}>
        <BottomSheet.Close />
        <section className={styles.aboutUs}>
          <header className={styles.header}>About Us</header>
          <p className={styles.title}>{aboutUs.title}</p>
          <div
            className={styles.photoBookCover}
            style={{ backgroundImage: `url(${themedPhotoBookCover})` }}
          >
            <ThemedImage
              aria-hidden="true"
              src={heartBalloon}
              alt=""
              className={styles.balloonLeft}
              targetHue={themeHue}
              originalHue={PURPLE_HUE}
            />
            <ThemedImage
              aria-hidden="true"
              src={heartBalloon}
              alt=""
              className={styles.balloonRight}
              targetHue={themeHue}
              originalHue={PURPLE_HUE}
            />
            <div className={styles.photoGrid}>
              <figure className={styles.photoSlot}>
                <img
                  src={aboutUs.groomImageUrl}
                  alt={couple.groom.name}
                  className={styles.photoImage}
                />
              </figure>

              <figure className={styles.photoSlot}>
                <img
                  src={aboutUs.brideImageUrl}
                  alt={couple.bride.name}
                  className={styles.photoImage}
                />
              </figure>
            </div>
          </div>

          <div className={styles.contents}>
            <div className={styles.item}>
              <div className={styles.contentTitle}>
                <span className={styles.relation}>신랑</span>
                <span className={styles.name}>{couple.groom.name}</span>
              </div>
              <div className={styles.message}>{aboutUs.groomDesc.replaceAll('\\n', '\n')}</div>
            </div>

            <div className={styles.item}>
              <div className={styles.contentTitle}>
                <span className={styles.relation}>신부</span>
                <span className={styles.name}>{couple.bride.name}</span>
              </div>

              <div className={styles.message}>{aboutUs.brideDesc.replaceAll('\\n', '\n')}</div>
            </div>
          </div>
        </section>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
