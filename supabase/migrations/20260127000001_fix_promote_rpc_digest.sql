-- Fix digest() call signature in promote_place_candidate()
-- pgcrypto digest() expects (bytea, text); our prior function passed (text, unknown).

CREATE OR REPLACE FUNCTION public.promote_place_candidate(p_candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  v_place_id uuid;
  v_geohash7 text;
  v_dedupe_key text;
  v_name_normalized text;
  v_address_normalized text;
  v_category category_enum;
  v_category_text text;
BEGIN
  -- Load candidate with auth.uid() check (raises exception if not found or unauthorized)
  SELECT *
  INTO c
  FROM public.place_candidates
  WHERE id = p_candidate_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found or unauthorized';
  END IF;

  -- If already promoted, return existing place_id deterministically
  IF c.status = 'promoted' AND c.promoted_at IS NOT NULL THEN
    -- Try to find existing place by source_id first, then by dedupe_key
    IF c.source_id IS NOT NULL THEN
      SELECT id INTO v_place_id
      FROM public.places
      WHERE user_id = c.user_id
        AND source = c.source
        AND source_id IS NOT DISTINCT FROM c.source_id
      LIMIT 1;
    ELSE
      -- Compute dedupe_key to find by it
      v_geohash7 := ST_GeoHash((c.location)::geometry, 7);
      v_name_normalized := lower(trim(coalesce(c.name, '')));
      v_address_normalized := lower(trim(coalesce(c.address, '')));
      v_dedupe_key := encode(
        digest(
          convert_to(
            v_name_normalized || '|' ||
            coalesce(v_geohash7, '') || '|' ||
            v_address_normalized,
            'utf8'
          ),
          'sha256'
        ),
        'hex'
      );
      
      SELECT id INTO v_place_id
      FROM public.places
      WHERE user_id = c.user_id
        AND dedupe_key = v_dedupe_key
      LIMIT 1;
    END IF;

    IF v_place_id IS NOT NULL THEN
      RETURN v_place_id;
    END IF;
    -- fallthrough if we can't find it for some reason
  END IF;

  -- Compute geohash7 using same logic as table generated column
  v_geohash7 := ST_GeoHash((c.location)::geometry, 7);

  -- Compute normalized fields (matching table generated columns)
  v_name_normalized := lower(trim(coalesce(c.name, '')));
  v_address_normalized := lower(trim(coalesce(c.address, '')));

  -- Compute dedupe_key using same logic as table (SHA-256 hash)
  v_dedupe_key := encode(
    digest(
      convert_to(
        v_name_normalized || '|' ||
        coalesce(v_geohash7, '') || '|' ||
        v_address_normalized,
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );

  -- Derive category from enrichment, enforcing presence/validity
  IF c.enrichment_id IS NULL THEN
    RAISE EXCEPTION 'Candidate must be enriched before promotion';
  END IF;

  SELECT normalized_data->>'category'
  INTO v_category_text
  FROM public.enrichments
  WHERE id = c.enrichment_id;

  IF NOT FOUND OR v_category_text IS NULL THEN
    RAISE EXCEPTION 'Candidate must be enriched before promotion';
  END IF;

  BEGIN
    v_category := v_category_text::category_enum;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Candidate must be enriched before promotion';
  END;

  -- Insert with conflict handling (single branch based on source_id presence)
  IF c.source_id IS NOT NULL THEN
    -- Primary: conflict on (user_id, source, source_id)
    INSERT INTO public.places (
      user_id, name, address, category, energy, location,
      source, source_id, google_place_id,
      dedupe_key, opening_hours,
      enrichment_version, enriched_at, enrichment_source_hash, enrichment_id
    )
    VALUES (
      c.user_id,
      c.name,
      c.address,
      v_category,
      NULL,
      c.location,
      c.source,
      c.source_id,
      CASE 
        WHEN c.source = 'google' AND c.source_id LIKE 'google:%'
        THEN replace(c.source_id, 'google:', '')
        ELSE NULL
      END,
      v_dedupe_key,
      c.raw_payload->'opening_hours',
      1,
      c.created_at,
      coalesce(
        (SELECT source_hash FROM public.enrichments WHERE id = c.enrichment_id),
        ''
      ),
      c.enrichment_id
    )
    ON CONFLICT ON CONSTRAINT places_user_id_source_source_id_unique
    DO UPDATE SET updated_at = now()
    RETURNING id INTO v_place_id;
  ELSE
    -- Fallback: conflict on (user_id, dedupe_key) when source_id is NULL
    INSERT INTO public.places (
      user_id, name, address, category, energy, location,
      source, source_id, google_place_id,
      dedupe_key, opening_hours,
      enrichment_version, enriched_at, enrichment_source_hash, enrichment_id
    )
    VALUES (
      c.user_id,
      c.name,
      c.address,
      v_category,
      NULL,
      c.location,
      c.source,
      c.source_id,
      NULL,
      v_dedupe_key,
      c.raw_payload->'opening_hours',
      1,
      c.created_at,
      coalesce(
        (SELECT source_hash FROM public.enrichments WHERE id = c.enrichment_id),
        ''
      ),
      c.enrichment_id
    )
    ON CONFLICT ON CONSTRAINT places_user_id_dedupe_key_unique
    DO UPDATE SET updated_at = now()
    RETURNING id INTO v_place_id;
  END IF;

  -- Update candidate status only if insert/update succeeds (in-transaction)
  UPDATE public.place_candidates
  SET promoted_at = now(), status = 'promoted'
  WHERE id = p_candidate_id
    AND user_id = auth.uid();

  RETURN v_place_id;
END;
$$;

