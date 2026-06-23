CREATE TABLE "market_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_measure" varchar(10) NOT NULL,
	"category" varchar(255),
	"original_price" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_receipt_transactions" (
	"receipt_id" uuid NOT NULL,
	"transaction_id" integer NOT NULL,
	CONSTRAINT "market_receipt_transactions_receipt_id_transaction_id_pk" PRIMARY KEY("receipt_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "market_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"date" timestamp NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "market_items" ADD CONSTRAINT "market_items_receipt_id_market_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."market_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_receipt_transactions" ADD CONSTRAINT "market_receipt_transactions_receipt_id_market_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."market_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_receipt_transactions" ADD CONSTRAINT "market_receipt_transactions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;