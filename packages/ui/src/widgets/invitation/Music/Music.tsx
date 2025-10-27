import { useState } from 'react';

export const MusicPlayer = () => {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        className="music-floating-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={playing ? '음악 정지' : '음악 재생'}
      >
        {playing ? '⏸️' : '▶️'}
      </button>

      {/* Slide-in Player */}
      <div className={`music-player-panel${open ? ' open' : ''}`}>
        <div className="music-player-header">
          <span>음악 제목</span>
          <button onClick={() => setOpen(false)}>닫기</button>
        </div>
        <div className="music-player-controls">
          <button onClick={() => setPlaying((v) => !v)}>
            {playing ? '⏸️ 일시정지' : '▶️ 재생'}
          </button>
        </div>
        {/* 추가 정보/컨트롤 */}
      </div>
    </>
  );
};
