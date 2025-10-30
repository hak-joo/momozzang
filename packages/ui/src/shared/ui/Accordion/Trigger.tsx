import {
  Trigger as TriggerPrimitive,
  Header as HeaderPrimitive,
  type AccordionTriggerProps,
} from '@radix-ui/react-accordion';
import { PixelChevronDownIcon } from '../Icon/PixelChevronDown';
import styles from './Accordion.module.css';

export function Trigger({ children, className, ...props }: AccordionTriggerProps) {
  return (
    <HeaderPrimitive>
      <TriggerPrimitive className={`${styles.trigger} ${className}`} {...props}>
        {children}
        <PixelChevronDownIcon className={styles.chevron} aria-hidden />
      </TriggerPrimitive>
    </HeaderPrimitive>
  );
}
