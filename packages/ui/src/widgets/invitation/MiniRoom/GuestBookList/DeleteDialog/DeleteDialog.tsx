import { Button, IconButton } from '@shared/ui/Button';
import * as Dialog from '@shared/ui/Dialog';
import { useState } from 'react';
import styles from './DeleteDialog.module.css';
import { Input } from '@shared/ui/Input';

import { Trash } from '@shared/ui/Icon/Trash';
import { deleteGuestBook, guestBookQueryKeys } from '../../api/guestBook';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useParams } from 'react-router-dom';
import { useToast } from '@shared/ui/Toast';

interface Props {
  id: number;
}
export function GuestBookDeleteDialog({ id }: Props) {
  const [password, setPassword] = useState('');
  const { invitationId } = useParams();
  const isMock = !invitationId;

  const queryClient = useQueryClient();
  const { info } = useToast();
  const deleteMutation = useMutation({
    mutationFn: deleteGuestBook,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: guestBookQueryKeys.list(invitationId, isMock),
      });

      await queryClient.invalidateQueries({
        queryKey: guestBookQueryKeys.top(invitationId, isMock),
      });
      info({
        title: '방명록이 삭제되었습니다.',
      });
    },
    onError: (e) => {
      info({
        title: '방명록 삭제에 실패했습니다.',
      });
    },
  });
  const handleOnClickDelete = async () => {
    await deleteMutation.mutateAsync({ id, password });
  };

  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      setPassword('');
    }
  };
  return (
    <Dialog.Root onOpenChange={handleOnOpenChange}>
      <Dialog.Trigger asChild>
        <IconButton
          size="sm"
          variant="plain"
          className={styles.deleteIconButton}
          icon={<Trash className={styles.trashIcon} width={17} height={17} />}
        />
      </Dialog.Trigger>
      <Dialog.Content className={styles.content}>
        <div className={styles.header}>
          <p className={styles.title}>방명록 삭제</p>
          <p className={styles.description}>관리자와 작성자만 글을 삭제할 수 있습니다.</p>
        </div>
        <Input
          value={password}
          placeholder="비밀번호를 입력해주세요"
          maxLength={4}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button
          variant="primary"
          size="sm"
          className={styles.deleteButton}
          onClick={() => handleOnClickDelete()}
        >
          삭제하기
        </Button>
      </Dialog.Content>
    </Dialog.Root>
  );
}
