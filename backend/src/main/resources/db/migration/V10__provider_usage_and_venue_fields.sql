-- Aylik cagri sayaci: replica'dan ve pod yeniden baslatmasindan BAGIMSIZ olmali.
create table provider_usage (
    provider text not null,
    month    date not null,          -- saglayicinin faturalama ayinin ilk gunu (descriptor.billingZone)
    calls    integer not null default 0,
    primary key (provider, month)
);

-- Premium alanlar geri geldi (spec §5.1): popularite 0-1, puan olcegi saglayicinin kendi
-- olcegi, photo_ref saklanabilir foto kimligi, fetched_at saklama kuralinin saydigi an.
alter table venues add column popularity real;
alter table venues add column rating_scale smallint;
alter table venues add column photo_ref text;
alter table venues add column fetched_at timestamptz not null default now();

-- Saklama indirgemesi (spec §11) kaybeden satirin adini bosaltir; V1'deki not null kalkar.
alter table venues alter column name drop not null;
