import * as BottomSheet from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';

export function GuestBookForm() {
  return (
    <BottomSheet.Root>
      <BottomSheet.Trigger asChild>
        <Button>방명록 남기기</Button>
      </BottomSheet.Trigger>

      <BottomSheet.Content height="90vh">
        <BottomSheet.Close />
        <p>방명록 작성</p>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
