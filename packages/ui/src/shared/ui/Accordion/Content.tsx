import { Content as ContentPrimitive, type AccordionContentProps } from '@radix-ui/react-accordion';
import styles from './Accordion.module.css';
export function Content({ children, className, ...props }: AccordionContentProps) {
  return (
    <ContentPrimitive className={`${styles.Content} ${className}`} {...props}>
      {children}
    </ContentPrimitive>
  );
}
