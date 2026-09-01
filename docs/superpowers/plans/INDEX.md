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

Durum değerleri: `ready` (yazıldı, yürütülmedi) · `in-progress` · `blocked` · `done`

| # | Plan | Dosya | Durum | Son adım | Not |
|---|------|-------|-------|----------|-----|
| 1 | Backend iskelet + alan çekirdeği + karar motoru | `2026-09-01-plan1-backend-core.md` | done | Task 8/8 + final review | 23/23 test yeşil (BUILD SUCCESS); domain saf, sıfır TODO; commit'ler kullanıcıda |
| 2 | Backend application + adapter katmanları (API, Security, Unirest, STOMP) | `2026-09-01-plan2-backend-api.md` | ready | — | yazıldı |
| 3 | pnpm workspace + web katılım uygulaması | `2026-09-01-plan3-web.md` | ready | — | yazıldı |
| 4 | Expo RN host uygulaması | `2026-09-01-plan4-mobile.md` | ready | — | yazıldı |
| 5 | CI + Docker + K8s deploy | `2026-09-01-plan5-ci-deploy.md` | ready | — | yazıldı |
