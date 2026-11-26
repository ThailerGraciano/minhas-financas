ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_consumption_nature_check";
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_consumption_nature_check"
  CHECK ("consumption_nature" IS NULL OR "consumption_nature" IN ('recurring', 'installment', 'fixed', 'extraordinary', 'financial_movement', 'individual_withdrawal', 'unclassified'));
