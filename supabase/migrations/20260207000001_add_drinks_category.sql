-- Phase 2: Add Drinks category (bars) as a first-class taxonomy value.

ALTER TYPE public.category_enum ADD VALUE IF NOT EXISTS 'Drinks';
