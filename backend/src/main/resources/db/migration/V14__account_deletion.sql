-- Apple 5.1.1(v) + Play hesap silme. Semantik (§2): erisim ANINDA kapanir (deleted_at),
-- fiziksel satir 30 gunde gider (purge_after). O supurme BU planin Task 12'si: B-3'un
-- RetentionJob'ina ikinci bir sweep olarak takilir (K-B33).
alter table users add column deleted_at  timestamptz;
alter table users add column purge_after timestamptz;
create index idx_users_purge_after on users (purge_after) where purge_after is not null;
-- Baskasinin oturumundaki katilim SILINMEZ, anonimlesir: satir silinseydi o oturumun orta
-- noktasi, deste geometrisi ve oy populasyonu geriye donuk degisir, katilan herkesin
-- ekranindaki sayilar bozulurdu.
alter table participants add column anonymized_at timestamptz;
