# BumpInto — Plan Index

Spec: `docs/superpowers/specs/2026-08-31-bumpinto-mvp-design.md`

## Ajanlar için bağlayıcı kurallar

1. Bir planı yürütmeye başlarken bu dosyada o planın **Durum** alanını `in-progress` yap.
2. Her görev bitişinde **Son adım** alanını güncelle (ör. `Task 3/8 bitti`).
3. Plan tamamlanınca **Durum** → `done`, **Not** alanına tek satır özet.
4. Engellenirsen **Durum** → `blocked`, **Not** alanına neden + ne gerektiği.
5. Bu dosyayı yalnızca düzenle — git commit'i kullanıcı yapar (AGENTS.md).
6. Planlar sıralı yürütülür: bir plan `done` olmadan sonraki başlamaz
   (istisna: kullanıcı açıkça paralel isterse).
7. **UI işlerinde tasarım kaynağı Claude Design'dır** — ilgili planın
   "UI Kaynağı" bölümüne uy; ajan kendi tasarımını yapmaz.

Durum değerleri: `ready` (yazıldı, yürütülmedi) · `in-progress` · `blocked` · `done` ·
`deferred` (yazıldı, bilinçli olarak yürütülmüyor — kural 6'nın sıralı akışına GİRMEZ, atlanır)

| # | Plan | Dosya | Durum | Son adım | Not |
|---|------|-------|-------|----------|-----|
| 1 | Backend iskelet + alan çekirdeği + karar motoru | `2026-09-01-plan1-backend-core.md` | done | Task 8/8 + final review | 23/23 test yeşil (BUILD SUCCESS); domain saf, sıfır TODO; commit'ler kullanıcıda |
| 2 | Backend application + adapter katmanları (API, Security, Unirest, STOMP) | `2026-09-01-plan2-backend-api.md` | done | Task 10/10 + 2 temizlik turu + kapanis denetimi | 119/119 test yesil (temiz build); sifir TODO/olu kod; ArchUnit 3 kural; subagent-driven (impl Opus / review Fable); commit'ler kullanicida |
| 3 | pnpm workspace + web katılım uygulaması | `2026-09-01-plan3-web.md` | done | Task 7/7 + kapanış denetimi | 5/5 test + tsc + prod/preprod build yeşil; subagent-driven (impl Opus / review Opus / orkestrasyon Fable); tüm ekranlar artboard'lardan birebir (pho-tag koşulu test-pinli); pnpm 11 uyarlamaları (nodeLinker→workspace.yaml, packageManager pini, .nvmrc 22, `--` script fix'leri); elle uçtan uca (Task 7 Step 5) kullanıcıda — gerçek Google login + sağlayıcı anahtarı gerekiyor; commit'ler kullanıcıda |
| 4 | Expo RN host uygulaması | `2026-09-01-plan4-mobile.md` | ready | — | yazıldı |
| 5 | CI + Docker + K8s deploy | `2026-09-01-plan5-ci-deploy.md` | ready | — | yazıldı |
| 6 | Veri saklama — süresi dolan oturumların kalıcı silinmesi | `2026-09-01-plan6-data-retention.md` | ready | — | Spec §6 GDPR; Plan 2 kapanış denetiminde sahipsiz bulundu, plana bağlandı. **Plan 5 yayın kontrol listesi bu plan `done` olmadan işaretlenmez** |
| 7 | Dinamik aktivite keşfi — self-host Overpass (OSM) | `2026-09-01-plan7-activity-discovery.md` | deferred | — | **YÜRÜTÜLMÜYOR.** Yerine ucuz yol seçildi: `ActivityType` 5→15 genişletildi (Plan 2 kodu üzerinde, 123/123 test). Bu plan yalnız Google taksonomisinde OLMAYAN türler (at binme, sörf, tırmanış, dalış) gerçekten istenirse açılır. Açılırsa **Plan 3'ten ÖNCE** koşar — API sözleşmesini değiştirir; Task 7 (K8s) Plan 5 Task 3'e bağımlıdır |
