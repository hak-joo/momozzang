import type { Menu } from '../shared/types';
import '../styles/Header.css';

type Props = {
  currentMenu: Menu;
  onMenuClick?: (menu: Menu) => void;
};

function Header({ currentMenu, onMenuClick }: Props) {
  return (
    <header className="header">
      <nav>
        <button
          className={currentMenu === 'home' ? 'active' : ''}
          onClick={() => onMenuClick?.('home')}
        >
          홈
        </button>
        <button
          className={currentMenu === 'guestbook' ? 'active' : ''}
          onClick={() => onMenuClick?.('guestbook')}
        >
          방명록
        </button>
        <button
          className={currentMenu === 'gallery' ? 'active' : ''}
          onClick={() => onMenuClick?.('gallery')}
        >
          사진첩
        </button>
        <button
          className={currentMenu === 'directions' ? 'active' : ''}
          onClick={() => onMenuClick?.('directions')}
        >
          오시는 길
        </button>
      </nav>
    </header>
  );
}
export default Header;
