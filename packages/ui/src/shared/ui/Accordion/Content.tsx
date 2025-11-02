import {
  Content as ContentPrimitive,
  type AccordionContentProps,
} from '@radix-ui/react-accordion';
import { clsx } from 'clsx';
import styles from './Accordion.module.css';

export function Content({ children, className, ...props }: AccordionContentProps) {
  return (
    <ContentPrimitive className={clsx(styles.content, className)} {...props}>
      {children}
    </ContentPrimitive>
  );
}
