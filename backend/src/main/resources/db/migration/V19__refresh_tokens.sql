-- B-16: yenileme jetonu. Deger OPAK ve rastgeledir, JWT DEGIL (bilincli): imzali-durumsuz bir
-- jeton suresi dolana dek geri alinamaz, oysa hirsizlik sinyalinde aileyi KAPATABILMEK zorundayiz.
create table refresh_tokens (
    id           uuid        primary key,
    user_id      uuid        not null references users (id) on delete cascade,
    -- Jetonun KENDISI degil SHA-256 ozeti: DB dokumu ele gecse bile jetonlar kullanilamaz.
    -- V6'da katilimci jetonu icin ayni ders alinmisti (duz metin bearer sirri kolonu dusuruldu).
    token_hash   text        not null,
    -- Aile = TEK bir girisin rotasyon zinciri. Yeniden kullanim tespitinde aile tek indeksli
    -- UPDATE ile kapanir; `rotated_from` uzerinden ozyinelemeli CTE yazmaya gerek kalmaz.
    family_id    uuid        not null,
    -- Denetim izi: bu jeton hangi jetonun yerine gecti. Aile iptali icin KULLANILMAZ.
    rotated_from uuid        references refresh_tokens (id),
    -- Cihaz ipucu: 'web' | 'mobile'. Guvenlik gunlugu ve teshis icin; yetki karari VERMEZ.
    client       text,
    issued_at    timestamptz not null,
    expires_at   timestamptz not null,
    revoked_at   timestamptz
);

-- Rotasyonun TEK KULLANIMLIK olmasi buna dayanir: ayni ozet ikinci kez yazilamaz.
create unique index refresh_tokens_token_hash_key on refresh_tokens (token_hash);
-- Cikis ve hesap silme kullaniciyi toplu iptal eder.
create index idx_refresh_tokens_user on refresh_tokens (user_id) where revoked_at is null;
-- Yeniden kullanim tespitinde ailenin tamami tek sorguda kapanir.
create index idx_refresh_tokens_family on refresh_tokens (family_id) where revoked_at is null;
