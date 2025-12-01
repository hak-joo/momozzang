import * as BottomSheet from '@shared/ui/BottomSheet';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchGuestBookList, guestBookQueryKeys } from '../api/guestBook';
import { useParams } from 'react-router-dom';
import { Button } from '@shared/ui/Button';
import styles from './GuestBook.module.css';
import { GuestBook } from './GuestBook';

export function TotalGuestBookList() {
  const { invitationId } = useParams();
  const isMock = !invitationId;

  const { data: guestBookEntries = [] } = useSuspenseQuery({
    queryKey: guestBookQueryKeys.list(invitationId, isMock),
    queryFn: () =>
      fetchGuestBookList({
        invitationId,
        isMock,
      }),
  });
  return (
    <BottomSheet.Root>
      <BottomSheet.Trigger asChild>
        <Button variant="plain" className={styles.totalButton}>
          {'전체 보기'}
        </Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content height="90vh" className={styles.bottomSheetContent}>
        <BottomSheet.Close />
        <p className={styles.title}>방명록 전체보기</p>

        <div className={styles.guestBookList}>
          {guestBookEntries.map(({ id, contents: content, writer: from, miniMeId }) => (
            <GuestBook id={id} key={id} contents={content} writer={from} miniMeId={miniMeId} />
          ))}
        </div>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
