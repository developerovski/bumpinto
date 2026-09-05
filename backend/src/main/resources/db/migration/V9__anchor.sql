alter table sessions add column anchor_lat double precision;
alter table sessions add column anchor_lng double precision;

-- Yarim capa (biri dolu biri bos) domain'de GeoPoint ile imkansiz; kisit ayni degismezi
-- son katmanda da kilitler.
alter table sessions add constraint anchor_both_or_neither
  check ((anchor_lat is null) = (anchor_lng is null));
