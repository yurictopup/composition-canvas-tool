-- =============================================
-- Yuric Topup: shared request limits (2026-10-29 review).
-- The old limit lived in each Cloudflare Worker's memory, so every Worker
-- copy counted on its own and a spread-out flood went through. These
-- counters live in Postgres, so every Worker sees the same numbers.
--
-- Token bucket per key: `capacity` calls at once, refilled at
-- `refill_per_sec`. One row per key, locked while it is updated, so two
-- requests at the same moment can't both take the last token.
-- Only the server (service role) can call it; the table is not in the API.
-- =============================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.rate_limits (
  key        text PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 200),
  tokens     double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS rate_limits_updated_at_idx ON private.rate_limits (updated_at);

REVOKE ALL ON private.rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rate_limit_take(
  p_key            text,
  p_capacity       integer,
  p_refill_per_sec double precision,
  p_cost           integer DEFAULT 1
)
RETURNS TABLE (allowed boolean, remaining integer, retry_after_ms integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tokens double precision;
  v_at     timestamptz;
  v_now    timestamptz := clock_timestamp();
  v_avail  double precision;
BEGIN
  IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 200
     OR p_capacity NOT BETWEEN 1 AND 100000
     OR p_refill_per_sec IS NULL OR p_refill_per_sec <= 0
     OR p_cost NOT BETWEEN 1 AND p_capacity THEN
    RAISE EXCEPTION 'rate_limit_take: bad arguments' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO private.rate_limits (key, tokens, updated_at)
  VALUES (p_key, p_capacity, v_now)
  ON CONFLICT (key) DO NOTHING;

  SELECT r.tokens, r.updated_at INTO v_tokens, v_at
  FROM private.rate_limits r
  WHERE r.key = p_key
  FOR UPDATE;

  v_avail := least(
    p_capacity::double precision,
    v_tokens + greatest(0, extract(epoch FROM (v_now - v_at))) * p_refill_per_sec
  );

  IF v_avail >= p_cost THEN
    allowed := true;
    v_avail := v_avail - p_cost;
    retry_after_ms := 0;
  ELSE
    allowed := false;
    retry_after_ms := ceil((p_cost - v_avail) / p_refill_per_sec * 1000)::integer;
  END IF;

  UPDATE private.rate_limits SET tokens = v_avail, updated_at = v_now WHERE key = p_key;
  remaining := floor(v_avail)::integer;
  RETURN NEXT;
END;
$$;

-- Keys idle for a day are full again anyway; the 2-minute cron removes them.
CREATE OR REPLACE FUNCTION public.rate_limit_prune()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH gone AS (
    DELETE FROM private.rate_limits
    WHERE updated_at < clock_timestamp() - interval '1 day'
    RETURNING 1
  )
  SELECT count(*)::integer FROM gone;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_take(text, integer, double precision, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rate_limit_prune() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_take(text, integer, double precision, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_prune() TO service_role;
GRANT USAGE ON SCHEMA private TO service_role;

-- Replay guard: one bank transaction can pay for one order only.
-- (payment_md5 is already unique; this also covers the transaction hash.)
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_hash_idx
  ON public.orders (payment_hash) WHERE payment_hash IS NOT NULL;
