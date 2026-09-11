-- V20__open_plans.sql — B-17 Keşfet / açık plan.
--
-- Açık plan = sessions'ın VARYANTIDIR, ayrı bir tablo değil: deste, karar, presence ve ses
-- odası bugünkü Session üstünde çalışıyor; ikinci bir "plan" tablosu hepsini ikiye bölerdi.
-- Ayrı `visibility` kolonu da YOK: `meet_at is not null` ⇔ Keşfet'te. Bayrak kolonu olsaydı
-- "public ama meet_at yok" gibi anlamsız bir satır girebilir, Keşfet sorgusu onu sessizce
-- atlardı. Üç kolon ya hep null (gizli oturum) ya hep dolu — kısıt bunu zorlar.
--
-- Kesin buluşma NOKTASI bu kolonlarda değil (anchor / decided_venue_id taşır).
alter table sessions add column meet_at     timestamptz;
alter table sessions add column capacity    smallint;
alter table sessions add column join_policy text;

alter table sessions add constraint sessions_open_plan_check
    check ((meet_at is null) = (capacity is null) and (meet_at is null) = (join_policy is null));
-- [3,8]: 2 kişilik bir "grup" yeter sayıya (3) hiç ulaşamaz, 9 destenin adalet sıralamasını bozar.
alter table sessions add constraint sessions_capacity_check
    check (capacity is null or capacity between 3 and 8);
alter table sessions add constraint sessions_join_policy_check
    check (join_policy is null or join_policy in ('OPEN', 'APPROVAL'));

-- Keşfet sorgusu yalnız açık planlara bakar; KISMİ indeks gizli oturumları hiç taşımaz
-- (bugün satırların ezici çoğunluğu gizli).
create index sessions_discover_idx on sessions (meet_at) where meet_at is not null;

-- Katılım isteği: HESAPLI kullanıcı → açık plan. Anonim istek yok (user_id not null): Keşfet
-- yabancılara açık, sorumluluğu olmayan bir kimliğe açık değil.
-- Onaylanınca participants'a koltuk açılır (participants.user_id ile bağlanır).
-- Oturum silinince istek de gider (cascade) — askıda kalan istek, host'u olmayan bir panel demek.
-- Hesap fiziksel silinince (soft delete + purge) istek ANONİMLEŞTİRİLMEZ, silinir: içinde
-- serbest metin `note` var ve o metin silinen hesabın yazdığı şeydir.
create table seat_requests (
    id             uuid primary key,
    session_id     uuid not null references sessions (id) on delete cascade,
    user_id        uuid not null references users (id) on delete cascade,
    display_name   text not null,
    lat            double precision,
    lng            double precision,
    location_label text,
    travel_mode    text not null default 'CAR',
    note           text,
    status         text not null default 'PENDING',
    created_at     timestamptz not null default now(),
    decided_at     timestamptz,
    constraint seat_requests_status_check check (status in ('PENDING', 'APPROVED', 'DECLINED')),
    constraint seat_requests_location_check check ((lat is null) = (lng is null)),
    -- Not bir MESAJ kutusu değil, tek cümlelik tanıtım. 140 sınırı ürün kararıdır.
    constraint seat_requests_note_len check (note is null or char_length(note) <= 140)
);
-- Kişi başına TEK istek. Olmasaydı reddedilen biri aynı plana defalarca istek atıp host'un
-- panelini doldururdu — engel listesinin kapatmak için var olduğu tacizin aynısı.
create unique index seat_requests_session_user_key on seat_requests (session_id, user_id);
create index seat_requests_session_status_idx on seat_requests (session_id, status);

-- Buluşma sonrası tek soru: "Buluştunuz mu?". 1. aşama kapısının tek ölçümü.
-- Kişi (koltuk) başına tek cevap — birincil anahtar bunu zorlar, ayrı unique indekse gerek yok.
create table meet_checkins (
    session_id     uuid not null references sessions (id) on delete cascade,
    participant_id uuid not null references participants (id) on delete cascade,
    met            boolean not null,
    created_at     timestamptz not null default now(),
    primary key (session_id, participant_id)
);
