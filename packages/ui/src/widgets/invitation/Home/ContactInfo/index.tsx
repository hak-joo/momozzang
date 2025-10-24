import * as Dialog from '@shared/ui/Dialog';
import Button from '@shared/ui/Button';
import styles from './style.module.css';
function ContactInfo() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="primary">{`축하의 말 전하기 ${'>'}`}</Button>
      </Dialog.Trigger>
      <Dialog.Content className={styles.dialog} useOverlay useAutoClose usePortal>
        <Dialog.Close />
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default ContactInfo;
