import { MiniMe } from '@shared/ui/MiniMe';
import styles from './GuestBook.module.css';
import type { GuestBook } from '../types';

export function GuestBook({ content, from, miniMeId = 1 }: GuestBook) {
  const writer = from?.trim().length ? from : '익명';
  return (
    <div className={styles.guestBookItem}>
      <div className={styles.miniMe}>
        <MiniMe miniMeId={miniMeId} size={40} />
      </div>
      <div className={styles.guestBook}>
        <p className={styles.content}>{content}</p>
        <p className={styles.from}>from. {writer}</p>
      </div>
    </div>
  );
}
