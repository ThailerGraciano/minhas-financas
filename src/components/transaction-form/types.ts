import { getTransactionFormData } from "@/app/actions/form-data";
import { type AccentColorConfig, type TransactionTab } from "@/components/transaction-theme";

export type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;
export type Category = FormData["categories"][number];
export type Subcategory = Category["subcategories"][number];
export type Account = FormData["accounts"][number];
export type Card = FormData["creditCards"][number];
export type RecurrenceKind = "single" | "fixed" | "installment";

export interface TransactionFormPropsContext {
  tab: TransactionTab;
  accent: AccentColorConfig;
}
