-- Katilimci token'i artik imzali bir JWT (TokenService.issueParticipantToken): sir yalniz
-- istemcide yasar. Kolon duz metin bir bearer sirri tutuyordu ve her istekte okunuyordu;
-- birlikte unique index de duser.
--
-- Cutover notu: bu migration sahadaki TUM katilimci cerezlerini gecersiz kilar (eski opak
-- token'lar artik dogrulanamaz). Canli oturum yokken uygulanmali (oturum TTL'i 24 saat).
alter table participants drop column token;
