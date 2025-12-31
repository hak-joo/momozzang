import * as Accordion from '@shared/ui/Accordion';
import styles from './Account.module.css';
import { Box } from '@shared/ui/Box';
import type { Side } from '@entities/WeddingInvitation/model';
import { useContactInfoBySide } from '../hooks/useContactInfoBySide';
import { IconButton } from '@shared/ui/Button';
import { ClipboardIcon } from '@shared/ui/Icon/ClipboardIcon';
import { useToast } from '@shared/ui/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { smoothScrollWithin } from './utils';
import { Decoration } from '@shared/ui/Decoration/Decoration';
import brideImg from '@shared/assets/images/bride.png';
import groomImg from '@shared/assets/images/groom.png';
import { DdayBadge } from '@shared/ui/DdayBadge';

const SECTIONS: Array<{ side: Side; triggerLabel: string; imageSrc: string }> = [
  { side: 'groom', triggerLabel: '신랑측에게', imageSrc: groomImg },
  { side: 'bride', triggerLabel: '신부측에게', imageSrc: brideImg },
];

export function Account() {
  const contactInfoBySide = useContactInfoBySide();
  const { info, error } = useToast();
  const itemRefs = useRef<Record<Side, HTMLDivElement | null>>({ bride: null, groom: null });
  const [openSections, setOpenSections] = useState<Side[]>([]);
  const pendingScrollSideRef = useRef<Side | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const handleOpenValuesChange = useCallback((values: string[] | string) => {
    const nextValues = Array.isArray(values) ? (values as Side[]) : ([values] as Side[]);
    setOpenSections((prev) => {
      const newlyOpened = nextValues.find((side) => !prev.includes(side));
      if (newlyOpened) {
        pendingScrollSideRef.current = newlyOpened;
      }
      return nextValues;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pendingScrollSideRef.current) return;

    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    const side = pendingScrollSideRef.current;
    pendingScrollSideRef.current = null;

    scrollTimeoutRef.current = window.setTimeout(() => {
      const target = side ? itemRefs.current[side] : null;
      if (!target) return;

      const container = document.getElementById('main-wrapper');
      if (container instanceof HTMLElement) {
        smoothScrollWithin(container, target);
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }, 300);

    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [openSections]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyAccount = async (accountNumber: string) => {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API not available');
      }
      const cleanedAccountNumber = accountNumber.replace('-', '');
      await navigator.clipboard.writeText(cleanedAccountNumber);
      info({
        title: '계좌번호가 복사되었습니다.',
        duration: 3200,
      });
    } catch {
      error({
        title: '복사할 수 없어요',
        description: '잠시 후 다시 시도해주세요.',
      });
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p className={styles.title}>마음을 전하실 곳</p>
        <div className={styles.description}>
          <p>참석이 어려우신 분들을 위해 안내드립니다.</p>
          <p>너그러운 마음으로 이해해주시면 감사하겠습니다.</p>
        </div>
      </div>
      <Accordion.Root
        type="multiple"
        className={styles.accordion}
        value={openSections}
        onValueChange={handleOpenValuesChange}
        data-invitation-scroll-container="true"
      >
        {SECTIONS.map(({ side, triggerLabel, imageSrc }) => {
          const sideData = contactInfoBySide[side];
          const hasAccounts = sideData.accounts.length > 0;

          return (
            <Accordion.Item
              key={side}
              value={side}
              className={styles.accordionItem}
              ref={(node) => {
                itemRefs.current[side] = node;
              }}
            >
              <Accordion.Trigger className={styles.trigger}>
                <div className={styles.triggerInner}>
                  <div className={styles.triggerContent}>
                    <img src={imageSrc} width={28} height={28} alt={side} />
                    <span className={styles.triggerLabel}>{triggerLabel}</span>
                  </div>
                </div>
              </Accordion.Trigger>
              <Accordion.Content className={styles.content}>
                {hasAccounts && (
                  <ul className={styles.accountList}>
                    {sideData.accounts.map(({ relationLabel, account }) => (
                      <li key={account.id}>
                        <Box variant="reversed" className={styles.box} shape="rounded">
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
                                onClick={() => handleCopyAccount(account.accountNumber)}
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
        <DdayBadge />
        <p> 화환은 감사히 마음으로 받겠습니다.</p>
        <p> 저희를 생각해 주시는 마음만으로도 감사드립니다.</p>
      </div>

      <Decoration variant="sparkle" width={29} top={140} left={12} />
      <Decoration variant="sparkle" width={36} bottom={240} left={12} />
      <Decoration variant="sparkle" width={50} bottom={220} right={32} />
    </div>
  );
}
