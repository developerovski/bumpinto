-- V21__user_interests.sql — B-17: profil ilgi alanları, Keşfet'in VARSAYILAN filtresi.
--
-- CSV, ayrı tablo değil: `sessions.activity_types` ile aynı gerekçe (V8). Bu sütun üstünde
-- sorgu YOK — yalnız profil okunurken alınıp Keşfet filtresinin başlangıç değeri olur.
-- En çok 5 tür: filtre "her şey"e dönerse Keşfet listesi kişiselleşmez.
alter table users add column interests text;
alter table users add constraint users_interests_shape_check
    check (interests is null or interests ~ '^[A-Z_]+(,[A-Z_]+){0,4}$');
