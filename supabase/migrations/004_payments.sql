-- 004: web reservation deposit payments (run once in Supabase SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS and duplicate guards.
-- Do NOT run drizzle/0000_nervous_virginia_dare.sql against an existing
-- production database: it is a full baseline CREATE script and will conflict
-- with tables/types that already exist.

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  reservation_id uuid REFERENCES reservations(id),
  amount integer NOT NULL,
  currency varchar(3) DEFAULT 'IRT' NOT NULL,
  status payment_status DEFAULT 'PENDING' NOT NULL,
  authority varchar(50),
  reference_id varchar(100),
  metadata jsonb,
  created_at timestamp DEFAULT now() NOT NULL,
  paid_at timestamp,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  restaurant_id uuid NOT NULL,
  deposit_amount integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE payments
    ADD CONSTRAINT payments_reservation_id_reservations_id_fk
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS payments_reservation_id_idx ON payments (reservation_id);
CREATE INDEX IF NOT EXISTS restaurant_settings_restaurant_id_idx ON restaurant_settings (restaurant_id);
