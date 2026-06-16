CREATE TABLE "fixed_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"account_id" integer,
	"credit_card_id" integer,
	"category_id" integer NOT NULL,
	"subcategory_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"description" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_logs" ADD COLUMN "skipped_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "fixed_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "import_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "fixed_transactions" ADD CONSTRAINT "fixed_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_transactions" ADD CONSTRAINT "fixed_transactions_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_transactions" ADD CONSTRAINT "fixed_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_transactions" ADD CONSTRAINT "fixed_transactions_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fixed_transaction_id_fixed_transactions_id_fk" FOREIGN KEY ("fixed_transaction_id") REFERENCES "public"."fixed_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_hash_unique" UNIQUE("import_hash");