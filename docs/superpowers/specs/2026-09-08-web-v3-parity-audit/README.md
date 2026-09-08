# Web v3 tasarım-parite denetimi (2026-09-08)

Kaynak: Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosya `Web Ekranlar v3.dc.html`
(5858 satır, 63 artboard). Dosya yerel bir kopyaya indirildi, 12 ekran grubuna bölündü ve her grup
uygulamayla satır satır karşılaştırıldı (Opus ajanları, tek tur).

| Rapor | Kapsam |
|---|---|
| A | W0 Landing · W1 Oturumlar |
| B | W2 / W2b Yeni oturum (çapalı dahil) |
| C | W3 / W3d Lobi |
| D | W4 / W4b Katıl + W11a/b EN-NL |
| E | W3b / W3c / W3e Mekanlar |
| F | W5 Bekle · W6d Gönderildi |
| G | W6 / W6b / W6c Deste |
| H | W7 / W7b Runoff |
| I | W8 Karar |
| J | W9 Profil · W10 Hata · W10b Çevrimdışı · W12 Ses dock'u |
| K | W13-W19 Hesap / yasal / silme / destek |
| L | W20 Bildir-Engelle + W11c/d EN-NL |

Bulgular P1 (göze batan/yapısal), P2 (belirgin ölçü-tipografi-renk), P3 (ince) olarak
derecelendirildi. **P1 ve P2'nin tamamı uygulandı**; P3'ler bu dosyalarda kayıtlı kaldı.

Uydurulmayanlar (API alanı yok, raporlarda hangi alanın gerektiği yazılı):
`VenueDto.photoUrls[]` (foto noktaları), `ParticipantDto.deckIndex` (kişi başı deste ilerlemesi),
`SessionView.runoffVotes` (kim neyi seçti), 409 gövdesinde mesafe/orta nokta (Katıl "çok uzak" kartı).
