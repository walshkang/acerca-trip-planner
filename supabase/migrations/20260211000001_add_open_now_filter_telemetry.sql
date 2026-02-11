-- Lightweight server-side telemetry sink for deterministic open_now fallback usage.
-- Stores daily aggregated counts so we can apply threshold gates (<1%, 1-5%, >5%).

CREATE TABLE IF NOT EXISTS public.open_now_filter_telemetry_daily (
  day date NOT NULL,
  mode text NOT NULL CHECK (mode IN ('places', 'list_items')),
  expected boolean NOT NULL,
  evaluated_count bigint NOT NULL DEFAULT 0 CHECK (evaluated_count >= 0),
  utc_fallback_count bigint NOT NULL DEFAULT 0 CHECK (utc_fallback_count >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (day, mode, expected)
);

CREATE OR REPLACE FUNCTION public.record_open_now_filter_telemetry(
  p_day date,
  p_mode text,
  p_expected boolean,
  p_evaluated_count integer,
  p_utc_fallback_count integer
)
RETURNS TABLE (
  day date,
  mode text,
  expected boolean,
  evaluated_count bigint,
  utc_fallback_count bigint,
  fallback_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := COALESCE(p_day, timezone('utc', now())::date);
  v_evaluated_delta bigint := GREATEST(COALESCE(p_evaluated_count, 0), 0);
  v_utc_fallback_delta bigint := GREATEST(COALESCE(p_utc_fallback_count, 0), 0);
BEGIN
  IF v_evaluated_delta = 0 OR v_utc_fallback_delta = 0 THEN
    RETURN;
  END IF;

  IF v_utc_fallback_delta > v_evaluated_delta THEN
    v_utc_fallback_delta := v_evaluated_delta;
  END IF;

  RETURN QUERY
  INSERT INTO public.open_now_filter_telemetry_daily (
    day,
    mode,
    expected,
    evaluated_count,
    utc_fallback_count
  )
  VALUES (
    v_day,
    p_mode,
    p_expected,
    v_evaluated_delta,
    v_utc_fallback_delta
  )
  ON CONFLICT (day, mode, expected)
  DO UPDATE SET
    evaluated_count =
      public.open_now_filter_telemetry_daily.evaluated_count + EXCLUDED.evaluated_count,
    utc_fallback_count =
      public.open_now_filter_telemetry_daily.utc_fallback_count +
      EXCLUDED.utc_fallback_count,
    updated_at = timezone('utc', now())
  RETURNING
    public.open_now_filter_telemetry_daily.day,
    public.open_now_filter_telemetry_daily.mode,
    public.open_now_filter_telemetry_daily.expected,
    public.open_now_filter_telemetry_daily.evaluated_count,
    public.open_now_filter_telemetry_daily.utc_fallback_count,
    (
      public.open_now_filter_telemetry_daily.utc_fallback_count::numeric /
      NULLIF(public.open_now_filter_telemetry_daily.evaluated_count, 0)::numeric
    ) AS fallback_rate;
END;
$$;

REVOKE ALL ON TABLE public.open_now_filter_telemetry_daily
FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.open_now_filter_telemetry_daily
TO service_role;

REVOKE ALL ON FUNCTION public.record_open_now_filter_telemetry(
  date,
  text,
  boolean,
  integer,
  integer
)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_open_now_filter_telemetry(
  date,
  text,
  boolean,
  integer,
  integer
)
TO service_role;
