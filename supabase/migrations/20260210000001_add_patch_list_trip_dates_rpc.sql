-- Atomic trip-date patch for lists:
-- updates lists.start_date/end_date/timezone and moves out-of-range scheduled items
-- back to backlog in the same transaction.

CREATE OR REPLACE FUNCTION public.patch_list_trip_dates(
  p_list_id uuid,
  p_has_start_date boolean DEFAULT false,
  p_start_date date DEFAULT NULL,
  p_has_end_date boolean DEFAULT false,
  p_end_date date DEFAULT NULL,
  p_has_timezone boolean DEFAULT false,
  p_timezone text DEFAULT NULL,
  p_max_trip_days integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  is_default boolean,
  created_at timestamptz,
  start_date date,
  end_date date,
  timezone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list public.lists%ROWTYPE;
  v_final_start date;
  v_final_end date;
  v_day_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_list
  FROM public.lists
  WHERE id = p_list_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT p_has_start_date AND NOT p_has_end_date AND NOT p_has_timezone THEN
    RAISE EXCEPTION 'No updatable fields provided'
      USING ERRCODE = '22023';
  END IF;

  v_final_start := CASE
    WHEN p_has_start_date THEN p_start_date
    ELSE v_list.start_date
  END;
  v_final_end := CASE
    WHEN p_has_end_date THEN p_end_date
    ELSE v_list.end_date
  END;

  IF v_final_start IS NOT NULL
     AND v_final_end IS NOT NULL
     AND v_final_start > v_final_end THEN
    RAISE EXCEPTION 'start_date must be on or before end_date'
      USING ERRCODE = '22023';
  END IF;

  IF v_final_start IS NOT NULL AND v_final_end IS NOT NULL THEN
    v_day_count := (v_final_end - v_final_start) + 1;
    IF v_day_count <= 0 THEN
      RAISE EXCEPTION 'Invalid trip date range'
        USING ERRCODE = '22023';
    END IF;
    IF v_day_count > p_max_trip_days THEN
      RAISE EXCEPTION 'Trip range too long (% days). Max is % days.',
        v_day_count,
        p_max_trip_days
        USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.lists
  SET start_date = CASE
      WHEN p_has_start_date THEN p_start_date
      ELSE start_date
    END,
    end_date = CASE
      WHEN p_has_end_date THEN p_end_date
      ELSE end_date
    END,
    timezone = CASE
      WHEN p_has_timezone THEN p_timezone
      ELSE timezone
    END
  WHERE id = v_list.id
  RETURNING * INTO v_list;

  IF p_has_start_date OR p_has_end_date THEN
    UPDATE public.list_items li
    SET scheduled_date = NULL,
      scheduled_start_time = NULL,
      scheduled_order = 0
    WHERE li.list_id = v_list.id
      AND li.completed_at IS NULL
      AND li.scheduled_date IS NOT NULL
      AND (
        v_list.start_date IS NULL
        OR v_list.end_date IS NULL
        OR li.scheduled_date < v_list.start_date
        OR li.scheduled_date > v_list.end_date
      );
  END IF;

  RETURN QUERY
  SELECT
    v_list.id,
    v_list.name,
    v_list.description,
    v_list.is_default,
    v_list.created_at,
    v_list.start_date,
    v_list.end_date,
    v_list.timezone;
END;
$$;

GRANT EXECUTE ON FUNCTION public.patch_list_trip_dates(
  uuid,
  boolean,
  date,
  boolean,
  date,
  boolean,
  text,
  integer
) TO authenticated;
