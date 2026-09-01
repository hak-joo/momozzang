import { Box } from '@shared/ui/Box';
import styles from './Introduction.module.css';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import { formatPersonName, type Person } from '@entities/WeddingInvitation/model';
import { ContactInfo } from '../ContactInfo';
import { PixelHeart } from '@shared/ui/Icon/PixelHeart';
import pixelWeddingImg from '@shared/assets/images/groom-bride.png';

const formatParentsLabel = (father?: Person, mother?: Person, relationLabel?: string) => {
  const fatherName = father ? formatPersonName(father) : '';
  const motherName = mother ? formatPersonName(mother) : '';
  const names = [fatherName, motherName].filter(Boolean).join(' · ');
  return names ? `${names}의 ${relationLabel}` : '';
};

export function Introduction() {
  const metadata = useInvitation();
  const {
    invitationInfo: { message },
    couple: { bride, groom },
    parents: { brideFather, brideMother, groomFather, groomMother },
  } = metadata;
  return (
    <div className={styles.wrapper}>
      <Box
        hasBalloon
        hasDecoration
        variant="secondary"
        wrapperClassName={styles.boxWrapper}
        className={styles.box}
      >
        <p className={styles.title}>모시는 글</p>
        <p className={styles.message}>{message.replaceAll('\\n', '\n')}</p>

        <img
          className={styles.coupleMinime}
          src={pixelWeddingImg}
          width={113}
          height={113}
          alt="픽셀 웨딩 사진"
          loading="lazy"
          decoding="async"
        />

        <div className={styles.couple}>
          <div className={styles.person}>
            <p>{formatParentsLabel(groomFather, groomMother, '아들')}</p>
            <p className={styles.name}>
              <span>신랑</span>
              <span>{formatPersonName(groom)}</span>
            </p>
          </div>
          <PixelHeart width={28} height={27} className={styles.pixelHeart} />
          <div className={styles.person}>
            <p>{formatParentsLabel(brideFather, brideMother, '딸')}</p>
            <p className={styles.name}>
              <span>신부</span>
              <span>{formatPersonName(bride)}</span>
            </p>
          </div>
        </div>

        <ContactInfo />
      </Box>
    </div>
  );
}
