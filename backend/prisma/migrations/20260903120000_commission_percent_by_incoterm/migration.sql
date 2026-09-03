-- Forwarding commission as a percentage, configured per Incoterm.
--
-- Until now the commission was a single flat fee (admin_settings.commission = $200)
-- on the backend, while the offer card in the browser charged 10% of a base that
-- included the ocean freight. Under FOB that produced ~$913 on a $6.600 freight,
-- which the client flagged as "fob iese prea mult".
--
-- The percentage is applied to destination handling + the land leg only, never to
-- the ocean freight. NULL means "use the built-in default" (10% for every
-- incoterm), so existing installs keep working until an admin sets real figures.
ALTER TABLE "admin_settings"
  ADD COLUMN IF NOT EXISTS "commission_percent_by_incoterm" TEXT;
