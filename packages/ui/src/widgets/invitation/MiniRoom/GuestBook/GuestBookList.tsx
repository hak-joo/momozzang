import * as BottomSheet from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';
import styles from './GuestBook.module.css';
import { GuestBook } from './GuestBook';

const MOCK_GUEST_BOOKS = [
  {
    id: 1,
    content: '모모야 결혼 너무 축하해! 두 사람의 앞날에 언제나 행복만 가득하길!',
    from: '이뫄뫄',
    miniMeId: 3,
  },
  {
    id: 2,
    content: '신혼여행도 조심히 잘 다녀오고 사진 많이 공유해줘!',
    from: '김모모',
    miniMeId: 15,
  },
  {
    id: 3,
    content: '늘 서로를 존중하며 사랑하는 부부가 되길 응원할게 :)',
    from: '동기 일동',
    miniMeId: 22,
  },
  {
    id: 4,
    content: '언제나 지금처럼만 웃는 날들만 이어져라!',
    from: '친구들',
    miniMeId: 9,
  },
];

export function GuestBookList() {
  return (
    <BottomSheet.Root>
      <BottomSheet.Trigger asChild>
        <Button>방명록 남기기</Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content height="90vh" className={styles.bottomSheetContent}>
        <BottomSheet.Close />
        <p className={styles.title}>방명록 전체보기</p>

        <div className={styles.guestBookList}>
          {MOCK_GUEST_BOOKS.map(({ id, content, from, miniMeId }) => (
            <GuestBook key={id} content={content} from={from} miniMeId={miniMeId} />
          ))}
        </div>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
