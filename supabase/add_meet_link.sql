-- ============================================================
-- PsiApp - Adiciona link do Jitsi Meet aos agendamentos
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meet_link TEXT;
