-- Phase 3: orders + menu (run once in Supabase SQL Editor)
-- No changes to existing tables. Safe to re-run: uses IF NOT EXISTS where possible.

DO $$ BEGIN
  CREATE TYPE order_station AS ENUM ('KITCHEN', 'KEBAB');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_item_status AS ENUM ('NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  name varchar(100) NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  category_id uuid REFERENCES menu_categories(id),
  name varchar(150) NOT NULL,
  price integer DEFAULT 0 NOT NULL,
  station order_station DEFAULT 'KITCHEN' NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- orders.status is intentionally NOT stored: derived from order_items.
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  table_id uuid REFERENCES tables(id),
  customer_id uuid REFERENCES customers(id),
  note text,
  source varchar(50) DEFAULT 'WAITER' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  name varchar(150) NOT NULL,
  station order_station NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  note text,
  status order_item_status DEFAULT 'NEW' NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_station_status_idx ON order_items(station, status);
CREATE INDEX IF NOT EXISTS orders_table_id_idx ON orders(table_id);
CREATE INDEX IF NOT EXISTS orders_restaurant_created_idx ON orders(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS menu_items_restaurant_idx ON menu_items(restaurant_id);
