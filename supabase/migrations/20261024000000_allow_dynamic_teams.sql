-- =====================================================================
-- Migration: Allow dynamic team creation with valid length
-- Replaces fixed squad name constraint ('Aegis', 'Sentinel', 'Management')
-- with a dynamic length constraint (minimum 2 characters, trimmed).
-- =====================================================================

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_name_check;
ALTER TABLE teams ADD CONSTRAINT teams_name_check
  CHECK (length(trim(name)) >= 2);
