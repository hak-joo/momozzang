import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import styles from './Panel.module.css';

interface PanelProps {
  /** 좌측 정렬 섹션 제목 슬롯. 주면 `h3` 로 렌더한다. */
  title?: ReactNode;
  /** 한 행에 묶이는 액션 영역. `data-admin-toolbar` 를 달아 측정 훅으로도 쓴다. */
  toolbar?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * 어드민 전용 표면(카드) 컴포넌트.
 * 뷰어 자산인 `Box`(컬러 면 + 흰 하이라이트 보더 + inset 젤리 그림자)를 어드민에서 쓰지 않기 위해
 * 신설했다 — 그 결과 `Box` 는 순수 뷰어 자산이 되어 뷰어 무회귀 위험이 0 이 된다(계약 §4.2·§4.4).
 * 표면 값은 전부 `--admin-surface-*` 토큰만 소비하므로 `/apply` 의 `.section` 과 SSOT 가 같다.
 */
export function Panel({ title, toolbar, className, children }: PanelProps) {
  return (
    <div data-admin-panel="" className={clsx(styles.panel, className)}>
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      {toolbar ? (
        <div data-admin-toolbar="" className={styles.toolbar}>
          {toolbar}
        </div>
      ) : null}
      {children}
    </div>
  );
}
