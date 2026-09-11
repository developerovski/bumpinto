-- V23__instant_plans.sql — B-18: "Buradayım" penceresi, kitle, Keşfet'in kaba yer adı.
--
-- open_until: pencereli ("buradayım") plan; null = noktasal plan (B-17 davranışı).
-- audience : PUBLIC (Keşfet) | FRIENDS (B-19, sunucu o ize kadar reddeder) | NONE (yalnız link).
-- locality : herkese açık KABA yer adı (semt). midpoint_label host'un etiketi ve üyelere özeldir;
--            Keşfet kartı artık onu değil bunu basar (K-B38 sızıntısı).
alter table sessions add column open_until timestamptz;
alter table sessions add column audience   text;
alter table sessions add column locality   text;

-- Pencere yalnız açık planda ve en çok 3 saat: "buradayım" TTL'siz süremez (OpenPlan.MAX_WINDOW).
alter table sessions add constraint sessions_open_until_check
    check (open_until is null
           or (meet_at is not null and open_until > meet_at
               and open_until <= meet_at + interval '3 hours'));

-- Kitle açık planın parçası: V20 satırları Keşfet'teydi, PUBLIC kalır. Backfill kısıttan ÖNCE.
update sessions set audience = 'PUBLIC' where meet_at is not null;
alter table sessions add constraint sessions_audience_check
    check ((meet_at is null) = (audience is null)
           and (audience is null or audience in ('PUBLIC', 'FRIENDS', 'NONE')));

-- Keşfet yalnız PUBLIC okur; kısmi indeks daralır (FRIENDS/NONE hiç girmez).
drop index sessions_discover_idx;
create index sessions_discover_idx on sessions (meet_at) where audience = 'PUBLIC';
