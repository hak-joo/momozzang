import styles from './style.module.css';
import type { PropsWithChildren, RefObject } from 'react';

interface Props {
  ref: RefObject<HTMLDivElement | null>;
  name: string;
}
function SectionContainer({ name, ref, children }: PropsWithChildren<Props>) {
  return (
    <div className={styles.sectionContainer} ref={ref}>
      <h2 className={styles.title}>{name}</h2>
      {children}
    </div>
  );
}

export default SectionContainer;
