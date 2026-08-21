-- ============================================================================
-- SiteKhata — extensions
-- ============================================================================

-- Fuzzy search for the vendor picker ("ABC Trad" → "ABC Traders") and for
-- expense description search on the all-entries screen.
create extension if not exists pg_trgm with schema extensions;

-- bcrypt, for hashing the 6-digit action PIN.
create extension if not exists pgcrypto with schema extensions;
