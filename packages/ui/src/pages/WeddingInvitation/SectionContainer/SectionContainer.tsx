import styles from './SectionContainer.module.css';
import type { PropsWithChildren, RefObject } from 'react';

interface Props {
  ref: RefObject<HTMLDivElement | null>;
}
export function SectionContainer({ ref, children }: PropsWithChildren<Props>) {
  return (
    <div className={styles.sectionContainer} ref={ref}>
      {children}
    </div>
  );
}
