-- Create a test pricing rule for landing page calculator
-- Run this SQL in your PostgreSQL database

INSERT INTO pricing_rules (
  id,
  name,
  priority,
  container_type,
  port_origin,
  port_destination,
  shipping_line,
  base_price,
  currency,
  additional_taxes,
  volume_discounts,
  valid_from,
  valid_to,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Default Rule - Shanghai to Constanta',
  10,
  '40ft',
  'Shanghai',
  'Constanta',
  NULL, -- Any shipping line
  '1500.00',
  'USD',
  NULL, -- No additional taxes
  NULL, -- No volume discounts
  NOW(),
  NULL, -- No expiration
  'ACTIVE',
  NOW(),
  NOW()
);

-- Also create rules for other common ports
INSERT INTO pricing_rules (
  id,
  name,
  priority,
  container_type,
  port_origin,
  port_destination,
  shipping_line,
  base_price,
  currency,
  valid_from,
  status,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Default Rule - Ningbo to Constanta',
  10,
  '40ft',
  'Ningbo',
  'Constanta',
  NULL,
  '1550.00',
  'USD',
  NOW(),
  'ACTIVE',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Default Rule - Qingdao to Constanta',
  10,
  '40ft',
  'Qingdao',
  'Constanta',
  NULL,
  '1600.00',
  'USD',
  NOW(),
  'ACTIVE',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Default Rule - 20ft Container',
  10,
  '20ft',
  'Shanghai',
  'Constanta',
  NULL,
  '1200.00',
  'USD',
  NOW(),
  'ACTIVE',
  NOW(),
  NOW()
);

