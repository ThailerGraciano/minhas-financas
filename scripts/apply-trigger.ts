import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Applying balance trigger...");
  try {
    await db.execute(sql`
CREATE OR REPLACE FUNCTION _get_balance_delta(
  p_status  VARCHAR,
  p_type    VARCHAR,
  p_amount  NUMERIC,
  p_parent_id INTEGER
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_status IS DISTINCT FROM 'paid' THEN
    RETURN 0;
  END IF;

  IF p_type = 'income' THEN
    RETURN p_amount;
  ELSIF p_type IN ('expense', 'credit_card_expense') THEN
    RETURN -p_amount;
  ELSIF p_type = 'transfer' THEN
    IF p_parent_id IS NULL THEN
      RETURN -p_amount;
    ELSE
      RETURN p_amount;
    END IF;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION trg_sync_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_delta NUMERIC := 0;
  v_new_delta NUMERIC := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      v_old_delta := _get_balance_delta(OLD.status, OLD.type, OLD.amount, OLD.parent_transaction_id);
      IF v_old_delta <> 0 THEN
        UPDATE accounts SET current_balance = current_balance - v_old_delta WHERE id = OLD.account_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.account_id IS NOT NULL THEN
      v_new_delta := _get_balance_delta(NEW.status, NEW.type, NEW.amount, NEW.parent_transaction_id);
      IF v_new_delta <> 0 THEN
        UPDATE accounts SET current_balance = current_balance + v_new_delta WHERE id = NEW.account_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.account_id IS NOT NULL THEN
      v_old_delta := _get_balance_delta(OLD.status, OLD.type, OLD.amount, OLD.parent_transaction_id);
      IF v_old_delta <> 0 THEN
        UPDATE accounts SET current_balance = current_balance - v_old_delta WHERE id = OLD.account_id;
      END IF;
    END IF;

    IF NEW.account_id IS NOT NULL THEN
      v_new_delta := _get_balance_delta(NEW.status, NEW.type, NEW.amount, NEW.parent_transaction_id);
      IF v_new_delta <> 0 THEN
        UPDATE accounts SET current_balance = current_balance + v_new_delta WHERE id = NEW.account_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_balance_sync ON transactions;
CREATE TRIGGER trg_transactions_balance_sync
AFTER INSERT OR UPDATE OR DELETE
ON transactions
FOR EACH ROW
EXECUTE FUNCTION trg_sync_account_balance();
    `);
    console.log("Trigger applied successfully!");
  } catch (error) {
    console.error("Error applying trigger:", error);
  }
  process.exit(0);
}
main();
