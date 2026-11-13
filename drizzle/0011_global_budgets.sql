DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'month'
  ) THEN
    DELETE FROM "budgets" b
    WHERE b."id" NOT IN (
      SELECT DISTINCT ON ("user_id", "category_id", "subcategory_id") "id"
      FROM "budgets"
      ORDER BY
        "user_id",
        "category_id",
        "subcategory_id",
        ("month" = 'global') DESC,
        "month" DESC,
        "updated_at" DESC,
        "id" DESC
    );

    DELETE FROM "budgets" p
    WHERE p."subcategory_id" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "budgets" s
        WHERE s."user_id" = p."user_id"
          AND s."category_id" = p."category_id"
          AND s."subcategory_id" IS NOT NULL
      );

    DROP INDEX IF EXISTS "idx_budgets_user_month";
    ALTER TABLE "budgets" DROP COLUMN "month";
  ELSE
    DELETE FROM "budgets" b
    WHERE b."id" NOT IN (
      SELECT DISTINCT ON ("user_id", "category_id", "subcategory_id") "id"
      FROM "budgets"
      ORDER BY
        "user_id",
        "category_id",
        "subcategory_id",
        "updated_at" DESC,
        "id" DESC
    );

    DELETE FROM "budgets" p
    WHERE p."subcategory_id" IS NULL
      AND EXISTS (
        SELECT 1
        FROM "budgets" s
        WHERE s."user_id" = p."user_id"
          AND s."category_id" = p."category_id"
          AND s."subcategory_id" IS NOT NULL
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'budget_month_configs' AND column_name = 'month'
  ) THEN
    DELETE FROM "budget_month_configs" c
    WHERE c."id" NOT IN (
      SELECT DISTINCT ON ("user_id") "id"
      FROM "budget_month_configs"
      ORDER BY
        "user_id",
        ("month" = 'global') DESC,
        "month" DESC,
        "updated_at" DESC,
        "id" DESC
    );

    DROP INDEX IF EXISTS "idx_budget_month_configs_user_month";
    ALTER TABLE "budget_month_configs" DROP COLUMN "month";
  ELSE
    DELETE FROM "budget_month_configs" c
    WHERE c."id" NOT IN (
      SELECT DISTINCT ON ("user_id") "id"
      FROM "budget_month_configs"
      ORDER BY
        "user_id",
        "updated_at" DESC,
        "id" DESC
    );
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_budgets_user_cat_parent"
  ON "budgets" ("user_id", "category_id")
  WHERE "subcategory_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_budgets_user_cat_sub"
  ON "budgets" ("user_id", "category_id", "subcategory_id")
  WHERE "subcategory_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_budget_month_configs_user"
  ON "budget_month_configs" ("user_id");
