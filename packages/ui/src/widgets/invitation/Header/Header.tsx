import type { Menu } from '@entities/WeddingInvitation/menu';
import styles from './Header.module.css';

type Props = {
  currentMenu: Menu;
  isAtTop: boolean;
  onMenuClick?: (menu: Menu) => void;
};

export function Header({ currentMenu, isAtTop, onMenuClick }: Props) {
  return (
    <header className={styles.header}>
      <nav data-at-top={isAtTop ? 'true' : 'false'}>
        <button
          className={currentMenu === 'home' ? styles.active : ''}
          onClick={() => onMenuClick?.('home')}
        >
          홈
        </button>
        <button
          className={currentMenu === 'miniRoom' ? styles.active : ''}
          onClick={() => onMenuClick?.('miniRoom')}
        >
          미니룸
        </button>
        <button
          className={currentMenu === 'gallery' ? styles.active : ''}
          onClick={() => onMenuClick?.('gallery')}
        >
          사진첩
        </button>
        <button
          className={currentMenu === 'directions' ? styles.active : ''}
          onClick={() => onMenuClick?.('directions')}
        >
          오시는 길
        </button>

        <button
          className={currentMenu === 'info' ? styles.active : ''}
          onClick={() => onMenuClick?.('info')}
        >
          Info
        </button>
      </nav>
    </header>
  );
}
