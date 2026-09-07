-- R-B1 / App Store 4.8: Google girisi sunan uygulama esdeger bir alternatif sunmali.
alter table users add column apple_sub           text;
alter table users add column apple_refresh_token text;
-- Cok degerli saglayici listesi. text[] DEGIL CSV: bu depodaki dizi deseni CSV
-- (sessions.activity_types, runoff_venue_ids). API yine dizi doner.
alter table users add column auth_providers text not null default 'GOOGLE';
update users set auth_providers = upper(auth_provider) where auth_provider is not null;
alter table users drop column auth_provider;
-- Kismi unique: apple_sub'i null olan (yalniz Google) hesaplar disaridadir.
create unique index uq_users_apple_sub on users (apple_sub) where apple_sub is not null;
