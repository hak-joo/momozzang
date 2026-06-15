import { clsx } from 'clsx';
import styles from './Stepper.module.css';

export interface StepItem {
  id: number;
  label: string;
}

interface Props {
  steps: StepItem[];
  current: number;
  onStepClick?: (id: number) => void;
}

export function Stepper({ steps, current, onStepClick }: Props) {
  return (
    <nav className={styles.stepper} aria-label="제작 단계">
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const isActive = step.id === current;
          const isDone = step.id < current;
          return (
            <li key={step.id} className={styles.item}>
              <button
                type="button"
                className={clsx(styles.step, {
                  [styles.active]: isActive,
                  [styles.done]: isDone,
                })}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => onStepClick?.(step.id)}
              >
                <span className={styles.index}>{step.id}</span>
                <span className={styles.label}>{step.label}</span>
              </button>
              {index < steps.length - 1 && <span className={styles.connector} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
