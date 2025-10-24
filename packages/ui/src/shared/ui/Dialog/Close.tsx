import * as DialogPrimitives from '@radix-ui/react-dialog';
import { IconButton } from '../Button';
import IconX from '../Icon/XIcon';
import styles from './style.module.css';

function Close() {
  return (
    <DialogPrimitives.Close asChild>
      <IconButton variant="plain" className={styles.close} icon={<IconX />} />
    </DialogPrimitives.Close>
  );
}

export default Close;
