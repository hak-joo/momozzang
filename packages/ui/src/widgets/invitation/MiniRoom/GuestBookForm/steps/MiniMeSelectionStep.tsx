import { useRef } from 'react';
import { Box } from '@shared/ui/Box';
import { MiniMe } from '@shared/ui/MiniMe';
import { PixelHeart } from '@shared/ui/Icon/PixelHeart';
import { Button } from '@shared/ui/Button';
import { useGuestBookFormContext } from '../context';
import styles from '../GuestBookForm.module.css';

export function MiniMeSelectionStep() {
  const {
    miniMePages,
    currentPage,
    setCurrentPage,
    selectedMiniMeId,
    selectMiniMe,
    canProceedSelect,
    setStep,
  } = useGuestBookFormContext();
  const swipeStartRef = useRef<number | null>(null);

  const handleSwipeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = event.clientX;
  };

  const handleSwipeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartRef.current === null) return;
    const delta = event.clientX - swipeStartRef.current;
    swipeStartRef.current = null;
    if (Math.abs(delta) < 30) return;
    const direction = delta < 0 ? 1 : -1;
    setCurrentPage((prev) => Math.max(0, Math.min(miniMePages.length - 1, prev + direction)));
  };

  const miniMesInPage = miniMePages[currentPage] ?? [];

  const handleNext = () => {
    if (!canProceedSelect) return;
    setStep('message');
  };

  return (
    <>
      <header className={styles.header}>
        <h2 className={styles.title}>미니미 선택</h2>
        <p className={styles.description}>방명록에 남길 미니미를 선택해 주세요.</p>
      </header>

      <Box
        variant="reversed"
        wrapperClassName={styles.boxWrapper}
        className={styles.boxInner}
        dotOffset={24}
      >
        <div
          className={styles.miniGrid}
          onPointerDown={handleSwipeStart}
          onPointerUp={handleSwipeEnd}
          onPointerLeave={handleSwipeEnd}
          onPointerCancel={handleSwipeEnd}
        >
          {miniMesInPage.map((miniMeId) => {
            const isSelected = selectedMiniMeId === miniMeId;
            const isDimmed = selectedMiniMeId !== null && !isSelected;

            return (
              <button
                key={miniMeId}
                type="button"
                className={styles.miniButton}
                data-selected={isSelected ? 'true' : undefined}
                data-dimmed={isDimmed ? 'true' : undefined}
                onClick={() => selectMiniMe(miniMeId)}
              >
                <PixelHeart className={styles.miniHeart} />
                <MiniMe miniMeId={miniMeId} size={30} />
              </button>
            );
          })}
        </div>

        <div className={styles.pageDots}>
          {miniMePages.map((_, index) => (
            <button
              key={index}
              type="button"
              className={styles.dotButton}
              data-active={index === currentPage ? 'true' : undefined}
              onClick={() => setCurrentPage(index)}
              aria-label={`${index + 1}번째 페이지`}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <Button fullWidth disabled={!canProceedSelect} onClick={handleNext}>
            미니미로 방명록 남기기
          </Button>
        </div>
      </Box>
    </>
  );
}
