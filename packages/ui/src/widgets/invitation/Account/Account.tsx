import * as Accordion from '@shared/ui/Accordion';
import styles from './Account.module.css';
import { Box } from '@shared/ui/Box';
import type { Side } from '@entities/WeddingInvitation/model';
import { useContactInfoBySide } from '../hooks/useContactInfoBySide';
import { IconButton } from '@shared/ui/Button';
import { ClipboardIcon } from '@shared/ui/Icon/ClipboardIcon';

const SECTIONS: Array<{ side: Side; triggerLabel: string }> = [
  { side: 'groom', triggerLabel: '신랑측에게' },
  { side: 'bride', triggerLabel: '신부측에게' },
];

export function Account() {
  const contactInfoBySide = useContactInfoBySide();

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p className={styles.title}>마음을 전하실 곳</p>
        <div className={styles.description}>
          <p>참석이 어려우신 분들을 위해 안내드립니다.</p>
          <p>너그러운 마음으로 이해해주시면 감사하겠습니다.</p>
        </div>
      </div>
      <Accordion.Root type="multiple">
        {SECTIONS.map(({ side, triggerLabel }) => {
          const sideData = contactInfoBySide[side];
          const hasAccounts = sideData.accounts.length > 0;

          return (
            <Accordion.Item key={side} value={side}>
              <Accordion.Trigger className={styles.trigger}>
                <div className={styles.triggerInner}>
                  <span className={styles.triggerLabel}>{triggerLabel}</span>
                </div>
              </Accordion.Trigger>
              <Accordion.Content className={styles.content}>
                {hasAccounts && (
                  <ul className={styles.accountList}>
                    {sideData.accounts.map(({ relationLabel, account }) => (
                      <li key={account.id}>
                        <Box variant="reversed" className={styles.box}>
                          <p className={styles.accountRelation}>{relationLabel}</p>
                          <div className={styles.accountDetails}>
                            <p className={styles.accountOwner}>{account.accountHolder}</p>
                            <span className={styles.accountDetailValue}>
                              {account.bank} {account.accountNumber}
                              <IconButton
                                icon={<ClipboardIcon />}
                                size="sm"
                                variant="plain"
                                aria-label="계좌번호 복사"
                              />
                            </span>
                          </div>
                        </Box>
                      </li>
                    ))}
                  </ul>
                )}
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>

      <div className={styles.footer}>
        <p> 화한은 감사히 마음으로 받겠습니다.</p>
        <p> 저희를 생각해 주시는 마음만으로도 감사드립니다.</p>
      </div>
    </div>
  );
}
