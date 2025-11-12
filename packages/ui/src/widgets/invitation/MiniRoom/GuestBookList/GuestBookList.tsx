import * as BottomSheet from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';
import styles from './GuestBook.module.css';
import { GuestBook } from './GuestBook';
import { MOCK_GUEST_BOOK_ENTRIES } from '../constants';

export function GuestBookList({ entries = MOCK_GUEST_BOOK_ENTRIES }) {
  return (
    <BottomSheet.Root>
      <BottomSheet.Trigger asChild>
        <Button variant="plain">{'전체 보기 >>'}</Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content height="90vh" className={styles.bottomSheetContent}>
        <BottomSheet.Close />
        <p className={styles.title}>방명록 전체보기</p>

        <div className={styles.guestBookList}>
          {entries.map(({ id, content, from, miniMeId }) => (
            <GuestBook id={id} key={id} content={content} from={from} miniMeId={miniMeId} />
          ))}
        </div>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
