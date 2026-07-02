'use client';

import { useState, useEffect } from 'react';
import { getCreditCardsWithSummary } from '@/app/actions/credit-cards';
import { CompetencyFilter } from '@/components/competency-filter';
import { CreditCardList, CreditCardType } from './credit-card-list';
import { format } from 'date-fns';

export function CreditCardsClientPage({ closingDay, initialCards }: { closingDay: number; initialCards: CreditCardType[] }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [cards, setCards] = useState<CreditCardType[]>(initialCards);
  const [prevInitialCards, setPrevInitialCards] = useState(initialCards);

  // Sync state when server props change (e.g. after a Server Action)
  if (initialCards !== prevInitialCards) {
    setPrevInitialCards(initialCards);
    const currentMonth = format(new Date(), 'yyyy-MM');
    if (selectedMonth === currentMonth) {
      setCards(initialCards);
    }
  }

  useEffect(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    if (selectedMonth !== currentMonth) {
      let active = true;
      getCreditCardsWithSummary(selectedMonth).then((data) => {
        if (active) {
          setCards(data);
        }
      });
      return () => {
        active = false;
      };
    }
  }, [selectedMonth]);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <CompetencyFilter 
            closingDay={closingDay} 
            value={selectedMonth} 
            onChange={setSelectedMonth} 
          />
        </div>
      </div>
      <CreditCardList cards={cards} selectedMonth={selectedMonth} />
    </>
  );
}
