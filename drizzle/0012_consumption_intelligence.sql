ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "consumption_nature" varchar(32),
  ADD COLUMN IF NOT EXISTS "consumption_nature_source" varchar(32),
  ADD COLUMN IF NOT EXISTS "consumption_classified_at" timestamp;
--> statement-breakpoint
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "default_consumption_nature" varchar(32);
--> statement-breakpoint
ALTER TABLE "subcategories"
  ADD COLUMN IF NOT EXISTS "default_consumption_nature" varchar(32);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_consumption_nature_check') THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_consumption_nature_check"
      CHECK ("consumption_nature" IS NULL OR "consumption_nature" IN ('recurring', 'fixed', 'extraordinary', 'financial_movement', 'individual_withdrawal', 'unclassified'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_consumption_nature_source_check') THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_consumption_nature_source_check"
      CHECK ("consumption_nature_source" IS NULL OR "consumption_nature_source" IN ('auto', 'manual', 'inherited_installment'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_default_consumption_nature_check') THEN
    ALTER TABLE "categories" ADD CONSTRAINT "categories_default_consumption_nature_check"
      CHECK ("default_consumption_nature" IS NULL OR "default_consumption_nature" IN ('recurring', 'fixed', 'extraordinary', 'financial_movement', 'individual_withdrawal'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subcategories_default_consumption_nature_check') THEN
    ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_default_consumption_nature_check"
      CHECK ("default_consumption_nature" IS NULL OR "default_consumption_nature" IN ('recurring', 'fixed', 'extraordinary', 'financial_movement', 'individual_withdrawal'));
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_user_launch_type"
  ON "transactions" ("user_id", "launch_date", "type")
  WHERE "status" <> 'ignored';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_user_installment_parent"
  ON "transactions" ("user_id", "installment_parent_id")
  WHERE "installment_parent_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_user_manual_nature"
  ON "transactions" ("user_id", "consumption_nature_source")
  WHERE "consumption_nature_source" = 'manual';
