import * as BottomSheet from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';
import styles from './GuestBook.module.css';
import { GuestBook } from './GuestBook';
import type { GuestBook as TGuestBook } from '../types';
import { TotalGuestBookList } from './TotalGuestBookList';
interface Props {
  entries: TGuestBook[];
}

export function GuestBookList({ entries }: Props) {
  if (!entries || entries.length === 0) {
    return <div className={styles.empty}>신랑 신부에게 첫 미니미를 남겨보세요 💌</div>;
  }

  return (
    <>
      {entries
        .filter((entry, index) => index < 2)
        .map(({ id, contents: content, writer: from, miniMeId }) => (
          <GuestBook id={id} key={id} contents={content} writer={from} miniMeId={miniMeId} />
        ))}
      <TotalGuestBookList guestBookEntries={entries} />
    </>
  );
}
