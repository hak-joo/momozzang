import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import styles from './Panel.module.css';

/**
 * 어드민 신규 화면(`LoginPage`·`RequireAdmin`·`ApprovalsPage`)이 공통으로 쓰는 카드 컨테이너.
 * 스타일은 CSS Modules + 기존 디자인 토큰만 사용하고, 신규 색상 리터럴을 만들지 않는다.
 */
export interface PanelProps {
  title?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, className, children }: PanelProps) {
  return (
    <section className={clsx(styles.panel, className)}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div className={styles.body}>{children}</div>
    </section>
  );
}

/** 화면 전체를 채우고 자식을 가운데 정렬하는 래퍼. LoginPage·RequireAdmin 이 쓴다. */
export function PanelScreen({ children }: { children: ReactNode }) {
  return <div className={styles.screen}>{children}</div>;
}
