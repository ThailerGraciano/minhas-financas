"use client";

import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

type QuickTab = "expense" | "income" | "transfer";

function QuickActionListenerInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const expenseTriggerRef = useRef<HTMLButtonElement | null>(null);
  const incomeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const transferTriggerRef = useRef<HTMLButtonElement | null>(null);

  const action = searchParams.get("action");

  useEffect(() => {
    if (!action) return;

    let targetTab: QuickTab | null = null;
    if (action === "new-expense") targetTab = "expense";
    else if (action === "new-income") targetTab = "income";
    else if (action === "new-transfer") targetTab = "transfer";

    if (!targetTab) return;

    const timer = window.setTimeout(() => {
      if (targetTab === "expense") expenseTriggerRef.current?.click();
      else if (targetTab === "income") incomeTriggerRef.current?.click();
      else if (targetTab === "transfer") transferTriggerRef.current?.click();

      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [action, pathname, router, searchParams]);

  return (
    <>
      <TransactionFormDialog
        initialTab="expense"
        trigger={
          <button
            ref={expenseTriggerRef}
            type="button"
            aria-label="Nova transação"
            className="fixed bottom-20 right-4 z-40 md:hidden flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-6 w-6" />
          </button>
        }
      />
      <TransactionFormDialog
        initialTab="income"
        trigger={<button ref={incomeTriggerRef} type="button" className="sr-only" aria-label="Nova receita rápida" />}
      />
      <TransactionFormDialog
        initialTab="transfer"
        trigger={
          <button ref={transferTriggerRef} type="button" className="sr-only" aria-label="Nova transferência rápida" />
        }
      />
    </>
  );
}

export function QuickActionListener() {
  return (
    <Suspense fallback={null}>
      <QuickActionListenerInner />
    </Suspense>
  );
}

