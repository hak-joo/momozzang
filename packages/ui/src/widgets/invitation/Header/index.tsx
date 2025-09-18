import type { Menu } from '@entities/WeddingInvitation/menu';
import styles from './header.module.css';

type Props = {
  currentMenu: Menu;
  onMenuClick?: (menu: Menu) => void;
};

function Header({ currentMenu, onMenuClick }: Props) {
  return (
    <header className={styles.header}>
      <nav>
        <button
          className={currentMenu === 'home' ? styles.active : ''}
          onClick={() => onMenuClick?.('home')}
        >
          홈
        </button>
        <button
          className={currentMenu === 'guestbook' ? styles.active : ''}
          onClick={() => onMenuClick?.('guestbook')}
        >
          방명록
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
      </nav>
    </header>
  );
}
export default Header;
