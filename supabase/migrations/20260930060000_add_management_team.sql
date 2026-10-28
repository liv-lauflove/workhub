-- =====================================================================
-- Migration: Add 'Management' team to teams check constraint
-- Allows Head of Tech to have a dedicated team separate from squads
-- =====================================================================

alter table teams drop constraint if exists teams_name_check;
alter table teams add constraint teams_name_check
  check (name in ('Aegis', 'Sentinel', 'Management'));
