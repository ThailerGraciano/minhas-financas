-- Migration: 0001_balance_trigger
-- Adds a trigger on `transactions` to automatically maintain `accounts.current_balance`.
--
-- Rules:
--   - Fires AFTER INSERT, UPDATE or DELETE.
--   - Only affects balance when status = 'paid'.
--   - 'income'  → adds amount to account balance.
--   - 'expense' | 'credit_card_expense' → subtracts amount from account balance.
--   - UPDATE: reverts OLD row impact, then applies NEW row impact.
--   - DELETE: reverts OLD row impact.

--> statement-breakpoint

-- 1. Helper function: returns the signed delta for a single transaction row.
--    Positive value = credit to balance; negative = debit.
CREATE OR REPLACE FUNCTION _get_balance_delta(
  p_status  VARCHAR,
  p_type    VARCHAR,
  p_amount  NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Only 'paid' transactions affect the balance.
  IF p_status IS DISTINCT FROM 'paid' THEN
    RETURN 0;
  END IF;

  IF p_type = 'income' THEN
    RETURN p_amount;
  ELSIF p_type IN ('expense', 'credit_card_expense') THEN
    RETURN -p_amount;
  END IF;

  -- 'transfer' and any other types are handled elsewhere; no delta here.
  RETURN 0;
END;
$$;

--> statement-breakpoint

-- 2. Trigger function: orchestrates the balance update for each DML event.
CREATE OR REPLACE FUNCTION trg_sync_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_delta NUMERIC := 0;
  v_new_delta NUMERIC := 0;
BEGIN
  -- ── DELETE ──────────────────────────────────────────────────────────────────
  IF TG_OP = 'DELETE' THEN
    -- Only act when the deleted row had an account linked.
    IF OLD.account_id IS NOT NULL THEN
      v_old_delta := _get_balance_delta(OLD.status, OLD.type, OLD.amount);

      IF v_old_delta <> 0 THEN
        UPDATE accounts
           SET current_balance = current_balance - v_old_delta
         WHERE id = OLD.account_id;
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  -- ── INSERT ──────────────────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_id IS NOT NULL THEN
      v_new_delta := _get_balance_delta(NEW.status, NEW.type, NEW.amount);

      IF v_new_delta <> 0 THEN
        UPDATE accounts
           SET current_balance = current_balance + v_new_delta
         WHERE id = NEW.account_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- ── UPDATE ──────────────────────────────────────────────────────────────────
  IF TG_OP = 'UPDATE' THEN
    -- Revert OLD row impact (if it had an account).
    IF OLD.account_id IS NOT NULL THEN
      v_old_delta := _get_balance_delta(OLD.status, OLD.type, OLD.amount);

      IF v_old_delta <> 0 THEN
        UPDATE accounts
           SET current_balance = current_balance - v_old_delta
         WHERE id = OLD.account_id;
      END IF;
    END IF;

    -- Apply NEW row impact (if it has an account).
    IF NEW.account_id IS NOT NULL THEN
      v_new_delta := _get_balance_delta(NEW.status, NEW.type, NEW.amount);

      IF v_new_delta <> 0 THEN
        UPDATE accounts
           SET current_balance = current_balance + v_new_delta
         WHERE id = NEW.account_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Fallback (should never be reached).
  RETURN NULL;
END;
$$;

--> statement-breakpoint

-- 3. Attach the trigger to the transactions table.
--    DROP first to make the migration idempotent (safe to re-run).
DROP TRIGGER IF EXISTS trg_transactions_balance_sync ON transactions;

CREATE TRIGGER trg_transactions_balance_sync
AFTER INSERT OR UPDATE OR DELETE
ON transactions
FOR EACH ROW
EXECUTE FUNCTION trg_sync_account_balance();
