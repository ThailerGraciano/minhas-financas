DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'date'
  ) THEN
    ALTER TABLE "transactions" RENAME COLUMN "date" TO "due_date";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "launch_date" date;
--> statement-breakpoint
UPDATE "transactions"
SET "launch_date" = CASE
  WHEN "paid_at" IS NOT NULL AND DATE("paid_at") < "due_date" THEN DATE("paid_at")
  ELSE "due_date"
END
WHERE "launch_date" IS NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "launch_date" SET NOT NULL;

