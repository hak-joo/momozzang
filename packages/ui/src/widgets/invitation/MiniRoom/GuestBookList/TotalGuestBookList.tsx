import { Button } from '@shared/ui/Button';
import * as BottomSheet from '@shared/ui/BottomSheet';
import { GuestBook } from './GuestBook';
import type { GuestBook as TGuestBook } from '../types';
import styles from './GuestBook.module.css';

interface Props {
  guestBookEntries: TGuestBook[];
}
export function TotalGuestBookList({ guestBookEntries }: Props) {
  return (
    <BottomSheet.Root>
      <BottomSheet.Trigger asChild>
        <Button variant="plain" size="xs" className={styles.totalButton}>
          전체 보기
        </Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content height="90vh" className={styles.bottomSheetContent}>
        <BottomSheet.Close />
        <p className={styles.title}>방명록 전체보기</p>

        <div className={styles.guestBookList}>
          {guestBookEntries.map(({ id, contents: content, writer: from, miniMeId }) => (
            <GuestBook
              id={id}
              key={id}
              contents={content}
              writer={from}
              miniMeId={miniMeId}
              enableDelete
            />
          ))}
        </div>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
