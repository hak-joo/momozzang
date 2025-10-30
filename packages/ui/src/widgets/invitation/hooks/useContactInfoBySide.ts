import { useMemo } from 'react';
import type { Account, Person, Side } from '@entities/WeddingInvitation/model';
import { useInvitation } from '@entities/WeddingInvitation/Context';

export type ContactRelation = {
  label: string;
  person: Person;
};

export type ContactAccount = {
  relationLabel: string;
  person: Person;
  account: Account;
};

export type ContactSideData = {
  main: ContactRelation;
  parents: ContactRelation[];
  relatives: ContactRelation[];
  accounts: ContactAccount[];
};

export type ContactInfoBySide = Record<Side, ContactSideData>;

export function useContactInfoBySide(): ContactInfoBySide {
  const metadata = useInvitation();

  return useMemo<ContactInfoBySide>(() => {
    const {
      couple: { bride, groom },
      parents,
      congratulatoryMoneyInfo,
    } = metadata;

    const getParents = (side: Side): ContactRelation[] => {
      if (!parents?.enabled) return [];

      const entries: ContactRelation[] = [];
      const father = side === 'groom' ? parents.groomFather : parents.brideFather;
      const mother = side === 'groom' ? parents.groomMother : parents.brideMother;

      if (father) entries.push({ label: '아버지', person: father });
      if (mother) entries.push({ label: '어머니', person: mother });

      return entries;
    };

    const getRelatives = (side: Side): ContactRelation[] =>
      parents?.others
        ?.filter(({ side: relationSide }) => relationSide === side)
        .map(({ relationLabel, person }) => ({
          label: relationLabel,
          person,
        })) ?? [];

    const buildAccounts = (relations: ContactRelation[]): ContactAccount[] => {
      if (!congratulatoryMoneyInfo?.enabled) return [];

      return relations.flatMap(({ label, person }) => {
        if (!person.accounts?.length) return [];

        return person.accounts.map((account) => ({
          relationLabel: account.customLabel ?? label,
          person,
          account,
        }));
      });
    };

    const buildSideData = (side: Side, main: ContactRelation): ContactSideData => {
      const parentsRelations = getParents(side);
      const relativesRelations = getRelatives(side);
      const relations = [main, ...parentsRelations, ...relativesRelations];

      return {
        main,
        parents: parentsRelations,
        relatives: relativesRelations,
        accounts: buildAccounts(relations),
      };
    };

    return {
      groom: buildSideData('groom', { label: '신랑', person: groom }),
      bride: buildSideData('bride', { label: '신부', person: bride }),
    };
  }, [metadata]);
}
