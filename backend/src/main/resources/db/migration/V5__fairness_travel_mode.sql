-- B-7: adalet cekirdegi + ulasim turu + karar seffafligi + saglayici alanlari.
-- Varsayilan CAR: elle eklenen konumlar ve gec katilanlar da araba sayilir (spec §4.5b).
alter table participants add column travel_mode text not null default 'CAR';
-- null = tercih yok; Katil formu yine CAR ile acilir.
alter table users add column default_travel_mode text;

-- Karar seffafligi (spec §5.A.2). Gecmis oturumlar null kalir: karar turu bilinmiyor demektir.
alter table sessions add column decided_at     timestamptz;
alter table sessions add column decision_kind  text;
alter table sessions add column runoff_reason  text;
-- Orta noktanin kasaba kelimesi (Nominatim, spec §5.A.4). Bir kez find-venues'te yazilir.
alter table sessions add column midpoint_label text;

-- Saglayici alanlari (spec §5.A.5). Hepsi opsiyonel: saglayici vermezse null, UI satiri gizler.
alter table venues add column category     text;
-- address = tam kisa adres ("Kleine Berg 16, Eindhoven"); locality = YALNIZ kasaba/semt kelimesi
-- ("Eindhoven", "Strijp-S") — kart meta satiri bunu basar, adresi degil (spec §4.9).
alter table venues add column address      text;
alter table venues add column locality     text;
alter table venues add column rating_count int;
alter table venues add column place_link   text;
alter table venues add column hours_today  text;
