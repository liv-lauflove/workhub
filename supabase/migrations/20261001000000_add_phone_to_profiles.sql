-- =====================================================================
-- Migration: Add phone column to profiles
-- Supports employee mobile contact from HR employee data
-- =====================================================================

alter table public.profiles
  add column if not exists phone text;
