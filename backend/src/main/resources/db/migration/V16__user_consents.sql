-- KVKK m.5/1 acik riza + Play Data safety. Ayri tablo DEGIL users kolonlari: kayit hesap basina
-- TEK satirdir, join'in getirisi yok (§2 "ya da users kolonlari").
alter table users add column consent_location    boolean     not null default false;
alter table users add column consent_microphone  boolean     not null default false;
alter table users add column consent_analytics   boolean     not null default false;
alter table users add column consents_updated_at timestamptz;
-- Riza metni degisince surum artar; istemci eski surumu gorunce ekrani yeniden sorar.
alter table users add column consents_version    int         not null default 1;
