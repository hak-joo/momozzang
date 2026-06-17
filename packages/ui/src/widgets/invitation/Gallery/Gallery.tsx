import styles from './Gallery.module.css';
import { SwipeStack } from './SwipeStack';
import { PixelBadge } from '@shared/ui/PixelBadge';
import { MOCK_GALLERY_LIST } from './constants';
import { Decoration } from '@shared/ui/Decoration/Decoration';
import { useParams } from 'react-router-dom';
import { useInvitation, useIsPreviewMode } from '@entities/WeddingInvitation/Context';

export function Gallery() {
  const { invitationId } = useParams();
  const { album } = useInvitation();
  const isPreview = useIsPreviewMode();
  // 미리보기 모드(신청 폼)에서는 라우트 파라미터가 없어도 실제 폼 album을 렌더한다(G1).
  const isMock = !invitationId && !isPreview;
  const images = isMock ? MOCK_GALLERY_LIST : album;
  return (
    <>
      <div className={styles.title}>
        <PixelBadge text="Photo" />
      </div>

      <SwipeStack images={images} />

      <Decoration variant="sparkleCross" width={35} top={20} right={50} />
      <Decoration variant="sparkleCrossDashed" color="purple" width={25} top={150} left={0} />
      <Decoration variant="pixelHeart" color="purple" width={32} top={250} left={16} />
      <Decoration variant="sparkleCross" width={50} top={270} left={-5} />
      <Decoration variant="pixelHeart" color="purple" width={32} top={480} right={30} />
    </>
  );
}
