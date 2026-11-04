-- ========================================================
-- SWEETBAKE STUDIO - RELATIONAL SCHEMA (3NF / BCNF)
-- PostgreSQL / SQLite / Supabase DDL
-- ========================================================

-- 1. Customers Master Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    default_address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Lookup Tables (Cake Attributes)
CREATE TABLE IF NOT EXISTS cake_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cake_shapes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cake_flavors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    default_price DECIMAL(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Orders Master Table (3NF - eliminates customer and derived financial redundancy)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    cake_type_id UUID NOT NULL REFERENCES cake_types(id),
    shape_id UUID NOT NULL REFERENCES cake_shapes(id),
    flavor_id UUID NOT NULL REFERENCES cake_flavors(id),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Baking', 'Decorating', 'Delivered')),
    quoted_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    down_payment DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    custom_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Order Fulfillments (Separate atomic delivery/pickup entity)
CREATE TABLE IF NOT EXISTS order_fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL DEFAULT 'Pickup' CHECK (method IN ('Pickup', 'Delivery')),
    location_address TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE
);

-- 5. Order Addons Junction Table (Resolves Repeating Addons Array)
CREATE TABLE IF NOT EXISTS order_addons (
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    price_at_order DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, addon_id)
);

-- 6. Order Reference Images Table (Resolves Repeating Images Array)
CREATE TABLE IF NOT EXISTS order_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    image_uri TEXT NOT NULL,
    caption VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Order Reminders Table
CREATE TABLE IF NOT EXISTS order_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reminder_timing VARCHAR(20) NOT NULL CHECK (reminder_timing IN ('on_time', '15_min', '1_hour', '2_hours', '1_day')),
    trigger_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE
);

-- 8. 3NF Computed View (Calculates Remaining Balance dynamically with zero anomaly risk)
CREATE OR REPLACE VIEW view_orders_detailed AS
SELECT 
    o.id AS order_id,
    c.id AS customer_id,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    f.method AS fulfillment_type,
    f.location_address AS location,
    f.scheduled_time AS due_date,
    ct.name AS cake_type,
    cs.name AS shape,
    cf.name AS flavor,
    o.status,
    o.quoted_total,
    o.down_payment,
    (o.quoted_total - o.down_payment) AS remaining_balance,
    CASE 
        WHEN (o.quoted_total - o.down_payment) <= 0 THEN 'Paid'
        ELSE 'Balance Due'
    END AS payment_status,
    r.reminder_timing,
    r.trigger_time AS reminder_time
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_fulfillments f ON o.id = f.order_id
JOIN cake_types ct ON o.cake_type_id = ct.id
JOIN cake_shapes cs ON o.shape_id = cs.id
JOIN cake_flavors cf ON o.flavor_id = cf.id
LEFT JOIN order_reminders r ON o.id = r.order_id;
