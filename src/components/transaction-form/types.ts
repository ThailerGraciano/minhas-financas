import { getTransactionFormData } from "@/app/actions/form-data";
import { type AccentColorConfig, type TransactionTab } from "@/components/transaction-theme";

export type FormData = NonNullable<Awaited<ReturnType<typeof getTransactionFormData>>>;
export type Category = FormData["categories"][number];
export type Subcategory = Category["subcategories"][number];
export type Account = FormData["accounts"][number];
export type Card = FormData["creditCards"][number];
export type RecurrenceKind = "single" | "fixed" | "installment";

export type TransactionFormField =
  | "amount"
  | "description"
  | "categoryId"
  | "subcategoryId"
  | "originId"
  | "destinationId"
  | "accountId"
  | "incomeAccountId"
  | "cardId"
  | "invoiceMonth"
  | "installment"
  | "totalInstallments";

export type TransactionFormErrors = Partial<Record<TransactionFormField, string>>;

export interface TransactionFormPropsContext {
  tab: TransactionTab;
  accent: AccentColorConfig;
}
