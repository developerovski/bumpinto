-- Apple 1.2 (canli sesli sohbet + gorunen ad = UGC): bildir + engelle ZORUNLU.
--
-- reporter_user_id NULLABLE + on delete set null: raporu YAZAN hesap 30 gun sonra fiziksel
-- silinince moderasyon kaydi KALIR, kisisel bag kopar (Apple 1.2 denetim izi vs GDPR silme).
-- Cascade olsaydi bir hesabi silmek onun actigi tum raporlari yok ederdi: bildirilen kisi
-- hakkindaki kayit, bildireni susturarak temizlenebilirdi.
create table reports (
    id                    uuid primary key,
    reporter_user_id      uuid        references users (id) on delete set null,
    session_id            uuid        not null references sessions (id) on delete cascade,
    target_participant_id uuid        not null references participants (id) on delete cascade,
    reason                text        not null,
    note                  text,
    created_at            timestamptz not null default now()
);
create index idx_reports_target on reports (target_participant_id);

-- Engel IKI turlu: hesap duzeyinde (blocked_user_id) kalicidir; anonim katilimci icin
-- (blocked_participant_id + session_id) YALNIZ o oturum boyunca yasar -- anonim koltugun kalici
-- kimligi yoktur, kalici engel yanlis kisiyi susturur.
-- Engel kayitlari raporun tersi: ikisi de CASCADE. Engel listesi yalniz sahibine hizmet eder,
-- sahibi gidince anlamsizdir; engellenen hesap gidince de dangling kisisel referans kalirdi.
create table blocks (
    id                     uuid primary key,
    blocker_user_id        uuid        not null references users (id) on delete cascade,
    blocked_user_id        uuid        references users (id) on delete cascade,
    blocked_participant_id uuid        references participants (id) on delete cascade,
    session_id             uuid        references sessions (id) on delete cascade,
    created_at             timestamptz not null default now(),
    constraint blocks_target_is_exclusive check (
        (blocked_user_id is not null and blocked_participant_id is null and session_id is null)
        or (blocked_user_id is null and blocked_participant_id is not null and session_id is not null)),
    constraint blocks_no_self check (blocked_user_id is null or blocked_user_id <> blocker_user_id)
);
create unique index uq_blocks_account on blocks (blocker_user_id, blocked_user_id)
    where blocked_user_id is not null;
create unique index uq_blocks_participant on blocks (blocker_user_id, blocked_participant_id)
    where blocked_participant_id is not null;
create index idx_blocks_blocked_user on blocks (blocked_user_id) where blocked_user_id is not null;
