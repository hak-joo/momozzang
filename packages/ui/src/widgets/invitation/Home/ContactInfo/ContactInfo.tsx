import * as Dialog from '@shared/ui/Dialog';
import { Button } from '@shared/ui/Button';
import styles from './ContactInfo.module.css';
import { useMemo, useState } from 'react';
import { PixelHeart } from '@shared/ui/Icon/PixelHeart';
import clsx from 'clsx';
import { useInvitation } from '@entities/WeddingInvitation/Context';
import type { GiftAccount, Person } from '@entities/WeddingInvitation/model';
import { Box } from '@shared/ui/Box';

type Tab = 'bride' | 'groom';
type ContactRelation = {
  label: string;
  person: Person;
};

type ContactSideData = {
  main: ContactRelation;
  parents: ContactRelation[];
  relatives: ContactRelation[];
  accounts: GiftAccount[];
};

type ContactInfoBySide = Record<Tab, ContactSideData>;

export function ContactInfo() {
  const [activeTab, setActiveTab] = useState<Tab>('bride');

  const metadata = useInvitation();

  const contactInfoBySide = useMemo<ContactInfoBySide>(() => {
    const {
      couple: { bride, groom },
      parents,
      congratulatoryMoneyInfo,
    } = metadata;

    const getParents = (side: Tab): ContactRelation[] => {
      if (!parents?.enabled) return [];

      const entries: ContactRelation[] = [];
      const father = side === 'groom' ? parents.groomFather : parents.brideFather;
      const mother = side === 'groom' ? parents.groomMother : parents.brideMother;

      if (father) entries.push({ label: '아버지', person: father });
      if (mother) entries.push({ label: '어머니', person: mother });

      return entries;
    };

    const getRelatives = (side: Tab): ContactRelation[] =>
      parents?.others
        ?.filter(({ side: relationSide }) => relationSide === side)
        .map(({ relationLabel, person }) => ({
          label: relationLabel,
          person,
        })) ?? [];

    const getAccounts = (side: Tab): GiftAccount[] => {
      if (!congratulatoryMoneyInfo?.enabled) return [];
      return congratulatoryMoneyInfo.accounts.filter((account) => account.side === side);
    };

    return {
      groom: {
        main: { label: '신랑', person: groom },
        parents: getParents('groom'),
        relatives: getRelatives('groom'),
        accounts: getAccounts('groom'),
      },
      bride: {
        main: { label: '신부', person: bride },
        parents: getParents('bride'),
        relatives: getRelatives('bride'),
        accounts: getAccounts('bride'),
      },
    };
  }, [metadata]);

  const activeContactInfo = contactInfoBySide[activeTab];
  const contactRelations = [
    activeContactInfo.main,
    ...activeContactInfo.parents,
    ...activeContactInfo.relatives,
  ];

  const formatPhoneHref = (phone: Person['phone'], action: 'sms' | 'tel') => {
    const sanitizedNumber = phone.number.replace(/\D/g, '');
    const baseNumber = phone.isInternational
      ? `${phone.countryCode}${sanitizedNumber}`
      : sanitizedNumber;
    return `${action}:${baseNumber}`;
  };

  const handleContact = (phone: Person['phone'], action: 'sms' | 'tel') => () => {
    if (typeof window === 'undefined') return;
    const href = formatPhoneHref(phone, action);
    window.location.href = href;
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="primary">{`축하의 말 전하기 ${'>'}`}</Button>
      </Dialog.Trigger>
      <Dialog.Content className={styles.content} useOverlay useAutoClose usePortal>
        <Dialog.Close />
        <div className={styles.header}>
          <h1 className={styles.title}>축하의 말 전하기</h1>
          <p className={styles.desc}>직접 축하의 마음을 전해보세요.</p>
        </div>

        <div className={styles.tabList}>
          <Button
            variant="plain"
            className={clsx(styles.tab, { [styles.active]: activeTab === 'groom' })}
            onClick={() => setActiveTab('groom')}
            aria-label={`${contactInfoBySide.groom.main.person.name}에게 축하의 말을 전하기`}
          >
            <PixelHeart className={styles.icon} />
            <span className={styles.name}>신랑에게</span>
          </Button>

          <Button
            variant="plain"
            className={clsx(styles.tab, { [styles.active]: activeTab === 'bride' })}
            onClick={() => setActiveTab('bride')}
            aria-label={`${contactInfoBySide.bride.main.person.name}에게 축하의 말을 전하기`}
          >
            <PixelHeart className={styles.icon} />
            <span className={styles.name}>신부에게</span>
          </Button>
        </div>

        <div className={styles.contactList}>
          {contactRelations.map(({ label, person }) => (
            <Box
              key={`${label}-${person.phone.number}`}
              variant="reversed"
              className={styles.contactCard}
            >
              <span className={styles.contactLabel}>{label}</span>
              <strong className={styles.contactName}>{person.name}</strong>
              <div className={styles.actionRow}>
                <Button
                  size="sm"
                  variant="primary"
                  className={styles.actionButton}
                  onClick={handleContact(person.phone, 'sms')}
                >
                  문자 보내기
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className={styles.actionButton}
                  onClick={handleContact(person.phone, 'tel')}
                >
                  전화 하기
                </Button>
              </div>
            </Box>
          ))}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
