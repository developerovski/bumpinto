-- R-B8: presence damgalari KALICI. Surec ici presence (InMemoryPresence) 2 sn'lik grace
-- penceresinden sonra koltugu budar; "Son gorulen · 12:38" onun uzerine yazilamaz.
alter table participants add column last_seen_at timestamptz;
alter table participants add column link_opened_at timestamptz;

-- R-B9: 5 haneli oturum kodu; alfabe karisabilen I/O/0/1'i disarida birakir.
alter table sessions add column join_code text;
create unique index sessions_join_code_key on sessions (join_code);
alter table sessions add constraint sessions_join_code_shape_check
    check (join_code is null or join_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$');

-- Backfill: yalniz suresi DOLMAMIS oturumlar. Gecmis oturuma kod uretmek 32^5'lik uzayi bosuna
-- yerdi ve o oturuma kimse kodla katilamaz.
do $$
declare
    row_id uuid;
    candidate text;
begin
    for row_id in select id from sessions where expires_at > now() and join_code is null loop
        loop
            -- 32 = alfabenin uzunlugu (24 harf + 8 rakam). Sabit KISALIRSA burasi da degisir:
            -- 31 yazmak son karakteri ('9') hic uretilmez yapardi.
            select string_agg(
                       substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                              floor(random() * 32)::int + 1, 1), '')
              into candidate
              from generate_series(1, 5);
            exit when not exists (select 1 from sessions where join_code = candidate);
        end loop;
        update sessions set join_code = candidate where id = row_id;
    end loop;
end $$;
