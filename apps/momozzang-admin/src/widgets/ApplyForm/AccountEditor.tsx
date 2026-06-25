import { Input } from '@momozzang/ui/src/shared/ui/Input/Input';
import { Select } from '@momozzang/ui/src/shared/ui/Select';
import { Checkbox } from '@momozzang/ui/src/shared/ui/Checkbox';
import { Button } from '@momozzang/ui/src/shared/ui/Button';
import type { Account, DepositTarget } from '@momozzang/ui/src/entities/WeddingInvitation/model';
import type { AccountOwner } from '../../features/apply/useApplyForm';
import styles from './ApplyForm.module.css';

interface Props {
  idPrefix: string;
  owner: AccountOwner;
  accounts: Account[];
  onAdd: (owner: AccountOwner) => void;
  onRemove: (owner: AccountOwner, accountId: string) => void;
  onUpdate: (owner: AccountOwner, accountId: string, patch: Partial<Account>) => void;
}

const TARGET_OPTIONS: Array<{ value: DepositTarget; label: string }> = [
  { value: 'self', label: '본인' },
  { value: 'parent', label: '부모' },
  { value: 'custom', label: '직접 입력' },
];

/**
 * 계좌 추가/삭제/편집 에디터. F4(신랑·신부)와 F5(혼주)에서 재사용한다.
 * - target === 'custom' 일 때만 커스텀 라벨 입력 노출
 * - kakaoPayEnabled === true 일 때만 카카오페이 코드 입력 노출
 */
export function AccountEditor({ idPrefix, owner, accounts, onAdd, onRemove, onUpdate }: Props) {
  return (
    <div className={styles.accountEditor}>
      <div className={styles.accountEditorHeader}>
        <span className={styles.subLabel}>계좌</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => onAdd(owner)}>
          + 계좌 추가
        </Button>
      </div>

      {accounts.length === 0 && <p className={styles.hint}>등록된 계좌가 없습니다.</p>}

      <ul className={styles.accountList}>
        {accounts.map((account, index) => {
          const aid = `${idPrefix}-acct-${account.id}`;
          return (
            <li key={account.id} className={styles.accountCard}>
              <div className={styles.accountCardHeader}>
                <span className={styles.subLabel}>계좌 {index + 1}</span>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => onRemove(owner, account.id)}
                  aria-label={`계좌 ${index + 1} 삭제`}
                >
                  삭제
                </button>
              </div>

              <div className={styles.grid3}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${aid}-bank`}>
                    은행
                  </label>
                  <Input
                    id={`${aid}-bank`}
                    value={account.bank}
                    onChange={(e) => onUpdate(owner, account.id, { bank: e.target.value })}
                    placeholder="은행명"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${aid}-number`}>
                    계좌번호
                  </label>
                  <Input
                    id={`${aid}-number`}
                    value={account.accountNumber}
                    onChange={(e) => onUpdate(owner, account.id, { accountNumber: e.target.value })}
                    placeholder="000-0000-000000"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${aid}-holder`}>
                    예금주
                  </label>
                  <Input
                    id={`${aid}-holder`}
                    value={account.accountHolder}
                    onChange={(e) => onUpdate(owner, account.id, { accountHolder: e.target.value })}
                    placeholder="예금주명"
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${aid}-target`}>
                    대상
                  </label>
                  <Select
                    id={`${aid}-target`}
                    value={account.target}
                    onChange={(e) =>
                      onUpdate(owner, account.id, { target: e.target.value as DepositTarget })
                    }
                  >
                    {TARGET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                {account.target === 'custom' && (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`${aid}-customlabel`}>
                      커스텀 라벨
                    </label>
                    <Input
                      id={`${aid}-customlabel`}
                      value={account.customLabel ?? ''}
                      onChange={(e) =>
                        onUpdate(owner, account.id, { customLabel: e.target.value })
                      }
                      placeholder="예: 신랑에게"
                    />
                  </div>
                )}
              </div>

              <Checkbox
                checked={account.kakaoPayEnabled}
                onChange={(e) =>
                  onUpdate(owner, account.id, { kakaoPayEnabled: e.target.checked })
                }
                label="카카오페이 사용"
              />
              {account.kakaoPayEnabled && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${aid}-kakaocode`}>
                    카카오페이 코드
                  </label>
                  <Input
                    id={`${aid}-kakaocode`}
                    value={account.kakaoPayCode ?? ''}
                    onChange={(e) => onUpdate(owner, account.id, { kakaoPayCode: e.target.value })}
                    placeholder="카카오페이 송금 코드"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
