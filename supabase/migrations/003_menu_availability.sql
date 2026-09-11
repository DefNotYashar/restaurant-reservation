-- Phase 3b: per-item availability (run once in Supabase SQL Editor)
-- `active` = item exists in menu. `available` = can be ordered right now.

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS available boolean DEFAULT true NOT NULL;

-- Backfill: currently disabled items stay unavailable.
UPDATE menu_items SET available = active WHERE available IS NOT DISTINCT FROM true;
