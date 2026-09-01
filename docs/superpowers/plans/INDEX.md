# BumpInto — Plan Index

Spec: `docs/superpowers/specs/2026-08-31-bumpinto-mvp-design.md`

## Kimlik şeması

Planlar bileşen **izlerine** ayrılır; her iz kendi harfiyle numaralanır ve kendi tablosunda yönetilir.

| Harf | İz | Kapsam |
|---|---|---|
| `B` | Backend | Spring Boot uygulaması — domain, application, adapter, DB şeması, zamanlanmış işler |
| `W` | Web | `frontend/web` + `frontend/shared` |
| `M` | Mobil | `frontend/mobile` (Expo) |
| `I` | Altyapı | CI, imaj, K8s, dağıtım — tek bir bileşene ait olmayan, hepsini besleyen işler |

Yeni plan, ait olduğu izin bir sonraki numarasını alır. Sıradakiler: **B-5, W-3, M-2, I-2**.

**Dosya adları tarihsel şemada kalır** (`2026-09-01-plan3-web.md`). `Eski #` kolonu iki şema
arasındaki tek çeviri anahtarıdır: plan gövdelerindeki "Plan 2", "Plan 5 Task 3" gibi çapraz
referanslar hâlâ eski numarayı kullanır — hangi kimliğe karşılık geldiğini o kolondan oku.

## Ajanlar için bağlayıcı kurallar

1. Bir planı yürütmeye başlarken bu dosyada o planın **Durum** alanını `in-progress` yap.
2. Her görev bitişinde **Son adım** alanını güncelle (ör. `Task 3/8 bitti`).
3. Plan tamamlanınca **Durum** → `done`, **Not** alanına tek satır özet.
4. Engellenirsen **Durum** → `blocked`, **Not** alanına neden + ne gerektiği.
5. Bu dosyayı yalnızca düzenle — git commit'i kullanıcı yapar (AGENTS.md).
6. **Her iz kendi içinde sıralı koşar** (B-1 → B-2 → B-3). **Farklı izler eşzamanlı koşabilir.**
   6a. Bir plana başlamadan önce **Bağımlılık** kolonundaki her kimliğin durumunu bu dosyadan
   doğrula. Görev-seviyeli bağımlılık (`I-1:T3`) yalnız işaretlendiği görev bloğunu kapatır —
   planın geri kalanı beklemez.
   6b. `deferred` planlar iz akışına GİRMEZ, atlanır.
7. **UI işlerinde tasarım kaynağı Claude Design'dır** — ilgili planın "UI Kaynağı" bölümüne uy;
   ajan kendi tasarımını yapmaz.

**Durum değerleri:** `ready` (yazıldı, yürütülmedi) · `in-progress` · `blocked` · `done` ·
`deferred` (yazıldı, bilinçli olarak yürütülmüyor)

**Bağımlılık gösterimi:** `B-2` = o planın **tamamı** `done` olmalı ·
`I-1:T3` = yalnız o planın 3. görevi · `—` = bağımlılık yok · `✓` = koşul şu an sağlanıyor.

---

## B — Backend

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| B-1 | Backend iskelet + alan çekirdeği + karar motoru | `2026-09-01-plan1-backend-core.md` | Plan 1 | done | — | Task 8/8 + final review | 23/23 test yeşil (BUILD SUCCESS); domain saf, sıfır TODO; commit'ler kullanıcıda |
| B-2 | Application + adapter katmanları (API, Security, Unirest, STOMP) | `2026-09-01-plan2-backend-api.md` | Plan 2 | done | B-1 | Task 10/10 + 2 temizlik turu + kapanış denetimi | 119/119 test yeşil (temiz build); sıfır TODO/ölü kod; ArchUnit 3 kural; subagent-driven (impl Opus / review Fable); commit'ler kullanıcıda |
| B-3 | Veri saklama — süresi dolan oturumların kalıcı silinmesi | `2026-09-01-plan6-data-retention.md` | Plan 6 | ready | B-2 ✓ · *Task 5 için* `I-1:T3` | — | Spec §6 GDPR. Task 1-4 **şimdi koşabilir** (I-1'den bağımsız). Task 5 (K8s CronJob) I-1'in imaj/secret adlarına dayanır. I-1'in yayın kontrol listesi bu plan `done` olmadan işaretlenmez |
| B-4 | Dinamik aktivite keşfi — self-host Overpass (OSM) | `2026-09-01-plan7-activity-discovery.md` | Plan 7 | deferred | iz akışı dışı | — | **YÜRÜTÜLMÜYOR.** Yerine ucuz yol seçildi: `ActivityType` 5→15 genişletildi (B-2 kodu üzerinde, 123/123 test). Yalnız Google taksonomisinde OLMAYAN türler (at binme, sörf, tırmanış, dalış) gerçekten istenirse açılır. **Açılırsa yeni bedel:** plan metni "Task 1-6, Plan 3'ten ÖNCE koşar" diyor ama W-1/W-2 artık `done` — bugün açılırsa web de geriye dönük düzeltilmeli. Task 7 (K8s) `I-1:T3`'e bağımlı |

## W — Web

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| W-1 | pnpm workspace + web katılım uygulaması | `2026-09-01-plan3-web.md` | Plan 3 | done | B-2 | Task 7/7 + kapanış denetimi | 5/5 test + tsc + prod/preprod build yeşil; subagent-driven (impl Opus / review Opus / orkestrasyon Fable); tüm ekranlar artboard'lardan birebir (pho-tag koşulu test-pinli); pnpm 11 uyarlamaları (nodeLinker→workspace.yaml, packageManager pini, .nvmrc 22, `--` script fix'leri); elle uçtan uca (Task 7 Step 5) kullanıcıda — gerçek Google login + sağlayıcı anahtarı gerekiyor; commit'ler kullanıcıda |
| W-2 | Web UI — Tailwind v4 + i18n (tr/en/nl) + rem token migrasyonu | `2026-09-01-plan8-web-tailwind-i18n.md` | Plan 8 | done | W-1 | Task 7/7 + final review | Spec: `2026-09-01-web-tailwind-i18n-design.md`. Tailwind v4 utility-first (utility yalnız components/), @theme rem token'ları, react-i18next tr/en/nl; eski tokens/ui.css silindi; 5/5 test + tsc + prod/preprod build yeşil; 63 render'lık en/nl taşma taraması temiz. **en/nl çevirileri `_status` işaretiyle tasarım onayı bekliyor.** Subagent-driven (impl/review Opus, orkestrasyon Fable); commit'ler kullanıcıda |

## M — Mobil

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| M-1 | Expo RN host uygulaması | `2026-09-01-plan4-mobile.md` | Plan 4 | ready | W-1 ✓ | — | **Şimdi koşabilir.** Google OAuth client id'leri kullanıcıda. Task 7 (EAS internal build) `I-1:T4`'ün yayın kontrol listesini besler |

## I — Altyapı

| Kimlik | Plan | Dosya | Eski # | Durum | Bağımlılık | Son adım | Not |
|---|---|---|---|---|---|---|---|
| I-1 | CI + Docker + K8s deploy | `2026-09-01-plan5-ci-deploy.md` | Plan 5 | ready | B-2 ✓, W-1 ✓ · *Task 4 için* `B-3` + `M-1:T7` | — | **Task 1-3 şimdi koşabilir.** Task 4 = yayın kontrol listesi; B-3 `done` ve retention CronJob uygulanmadan işaretlenmez (spec §6 GDPR). Postgres kullanıcının mevcut kümesinde — bu plan onu yönetmez |

---

## Çapraz iz kilitleri

Plan granülerliğinde döngü gibi görünen, gerçekte görev seviyesinde çözülen iki bağ:

1. **I-1 ⇄ B-3 (imaj/secret adları).**
   Sıra: `I-1 Task 1-3` → `B-3 tümü` → `I-1 Task 4`.
   `B-3:T5` K8s CronJob'ı `I-1:T3`'teki backend imajının ve secret adının aynısını kullanır;
   `I-1:T4` yayın kontrol listesi ise B-3 `done` olmadan işaretlenmez.

2. **M-1 → I-1:T4.** `I-1` yayın kontrol listesindeki EAS internal build (TestFlight/APK) kutusu
   `M-1 Task 7`'nin çıktısıdır. M-1 ve I-1 bunun dışında paraleldir.

**B-4 açılırsa** (deferred): `B-4 T1-6` API sözleşmesini değiştirir → W-1/W-2/M-1 geriye dönük
düzeltme gerektirir; `B-4 T7` ise `I-1:T3`'ten sonra koşar.
