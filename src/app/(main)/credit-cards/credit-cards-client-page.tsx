'use client';

import { getCreditCardsWithSummary } from '@/app/actions/credit-cards';
import { CreditCardList, CreditCardType } from './credit-card-list';
import { CreditCardsSummary } from './credit-cards-summary';
import { ClientDataLoader } from '@/components/client-data-loader';

export function CreditCardsClientPage({ closingDay, initialCards }: { closingDay: number; initialCards: CreditCardType[] }) {
  return (
    <ClientDataLoader
      closingDay={closingDay}
      initialData={initialCards}
      fetchAction={getCreditCardsWithSummary}
    >
      {(cards, selectedMonth) => (
        <>
          {cards.length > 0 && (
            <CreditCardsSummary cards={cards} selectedMonth={selectedMonth} />
          )}
          <CreditCardList cards={cards} selectedMonth={selectedMonth} />
        </>
      )}
    </ClientDataLoader>
  );
}
