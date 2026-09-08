-- B-3 (spec §6 GDPR): suresi dolan oturumlar 30 gun sonra KALICI silinir. Purge her kosuda
-- expires_at uzerinden tarar; index yoksa tablo buyudukce her kosu seq-scan olur.
--
-- Kismi degil tam index: ayni sutunu VenueContentRetention'in saatlik indirgeme sorgulari da
-- okuyor (venues x sessions join'i), sabit bir cutoff yok.
create index idx_sessions_expires_at on sessions (expires_at);
