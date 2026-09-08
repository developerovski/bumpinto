# BumpInto — mağaza yayın kontrol listesi

Kaynak: `docs/superpowers/specs/2026-09-06-mobile-store-compliance.md` §2.
Uygulama tarafı **M-5** ile kapandı; bu liste kodun dışındaki kapılardır.

> **Yayın kapısı:** C bölümündeki tacir bilgisi maddesi işaretlenmeden `frontend/mobile/store/`
> varlıkları yüklenmez. Yer tutucu `[tacir bilgisi — mağazada görünür]`
> (`frontend/mobile/src/content/legal/index.ts`) **bilinçlidir** ve TODO taramasının
> tek istisnasıdır.

## A. App Store Connect

- [ ] **App Privacy**: Location (precise) · Contact Info (name, email) · Identifiers (user id) ·
      User Content (görünen ad, oturum adı, ses — "not stored") · Usage Data (**yalnız** rıza açıksa).
      Hepsi "Linked to you"; **"Used for tracking" = No**.
- [ ] `PrivacyInfo.xcprivacy` derlemede. Doğrula:
      `npx expo prebuild --clean --platform ios && grep -c NSPrivacyTracking ios/*/PrivacyInfo.xcprivacy`
- [ ] Purpose string'ler cihazda O4/O7 metniyle birebir (ekran görüntüsü al).
      Kaynak tek yerde: `app.config.ts` `LOCATION_PURPOSE` / `MIC_PURPOSE`;
      `src/lib/__tests__/appConfig.test.ts` ayrışmayı yakalar.
- [ ] `ITSAppUsesNonExemptEncryption = false` (yalnız HTTPS/TLS).
- [ ] Age rating anketi; **"sosyal medya yeteneği" = Hayır**; hedef 13+.
- [ ] AB **DSA tacir bilgisi** (ad, adres, telefon, e-posta) — `src/content/legal/index.ts`
      Destek belgesindeki değerlerle **aynı**.
- [ ] Review notu + demo hesap (giriş duvarı var) + davet linki senaryosu (`bumpinto.app/j/<slug>`).
- [ ] **Sign in with Apple** capability + Services ID; hesap silmede sunucu tarafı `revoke` (B-14) doğrulandı.
- [ ] Support URL `bumpinto.app/support` · Privacy URL `bumpinto.app/privacy`.
- [ ] **`EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` tanımlı** (iOS OAuth client ID'sinin tersi). Eksikse
      `app.config.ts` production profilinde derlemeyi durdurur — yer tutucuyla imzalanmış bir
      sürüm mağazaya çıkarsa Google girişi sahada sessizce ölür (K-M19).

## B. Google Play Console

- [ ] **Data safety** formu uyumluluk §0 tablosuyla birebir; "Usage data" **opsiyonel** işaretli.
      İzin kapalı listesi `app.config.ts`: yalnız `ACCESS_FINE_LOCATION` + `RECORD_AUDIO`.
- [ ] **Hesap silme URL'si** `https://bumpinto.app/account/delete` — uygulama **kurulu değilken**
      de açılmalı. `/account` bilerek App Links dışında (test bunu garanti eder).
- [ ] Gizlilik politikası URL'si + destek e-postası.
- [ ] **Play App Signing SHA-1'i için Android OAuth client açıldı.** Google bir client'a tek SHA-1
      alır: yerel debug, EAS keystore ve Play imzası için **ayrı client**'lar gerekir (hepsi
      `app.bumpinto.mobile` package'ı ile). Play anahtarı ancak ilk yüklemeden sonra görünür —
      atlanırsa mağazadan inen sürümde giriş `DEVELOPER_ERROR` verir (K-M19).
- [ ] IARC anketi; hedef kitle 13+ (**Families değil**).
- [ ] Target API 36 (`expo-build-properties`); 16 KB page size — WebRTC yerel modülü geldiğinde
      (M-6) **yeniden koş**.
- [ ] Yeni bireysel hesapsa **kapalı test: 12 tester × 14 gün**. Bu M-5 bitmeden **başlatılmalı**
      (kritik yol riski — K-M6).
- [ ] Feature graphic 1024×500 · ikon 512×512 · 2–8 ekran görüntüsü.

## C. Ortak metin ve kapılar

- [ ] Alt başlık 30 (Apple) · kısa açıklama 80 (Play) · açıklama 4000 · anahtar kelime 100.
- [ ] **Tacir telefonu ve adresi kesinleşti** ve `src/content/legal/index.ts` içindeki
      `TRADER_PLACEHOLDER` **gerçek değerle** değiştirildi. *(yayın kapısı — bkz. üst not)*
- [ ] `bumpinto.app/{privacy,terms,data-rights,attributions,support,account/delete}` anonim `200`:
      ```sh
      for p in privacy terms data-rights attributions support account/delete; do \
        printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "https://bumpinto.app/$p"; done
      ```
- [ ] Uygulama içi yasal okuyucu ile web sayfası **aynı metni** gösteriyor
      (ortak kaynak: `frontend/shared/src/content/legal/`).
- [ ] `.maestro/store-compliance.yaml` cihazda bir kez koşuldu (izin akışı: ön-ekran → sistem
      diyaloğu → red kurtarma).
