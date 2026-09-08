# Design parity audit — batch L
Design source: `scratchpad/web-v3.html` (shared CSS 20–571, v3 override block 386–397)
App: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web`

## Scope note — W20 EXISTS in the app
Contrary to a "does it exist?" check, the report/block feature **is implemented**:
- UI: `src/components/organisms/PersonSheet.tsx` (menu + report step), opened from
  `src/components/organisms/ParticipantList.tsx:75`, triggered by `src/components/molecules/ParticipantRow.tsx:113-122`.
- State: `src/store/socialStore.ts:45-71` (`report` → `api.report` + `api.blockParticipant`, `block`).
- Confirmation: `src/components/molecules/ToastHost.tsx` (`social.reported` toast).
- API: `frontend/shared/src/api.ts:83-86` → `POST /api/reports` (`api-types.ts:247,820-838`) and
  `POST /api/me/blocks` (`api-types.ts:279,839-857`). Both endpoints and DTOs exist; nothing is missing on the wire.
- Copy: `social.*` present and complete in tr/en/nl.

Findings below are therefore parity deltas, not gaps in feature existence.

---

## 1. W20 · Bildir / Engelle — 1280 (design 5499–5621)

**P1 — sheet placement on desktop** — design (5602, shared CSS 566: `.dk .sheet{left:auto;right:48px;bottom:28px;width:420px;border-radius:24px}`): on 1280 the panel is docked **bottom-right over the lobby**, 420px wide, 24px radius; app (`PersonSheet.tsx:14-16`): `lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-card` with `inset-x-0 mx-auto max-w-[26rem]` → a **vertically and horizontally centred modal**. fix: in `SHEET`, replace the `lg:` centring with `lg:left-auto lg:right-12 lg:bottom-7 lg:top-auto lg:translate-y-0 lg:mx-0 lg:w-[26.25rem] lg:max-w-none lg:rounded-[1.5rem]` so the panel docks bottom-right at 48px/28px insets, 420px wide.

**P2 — action-row icon chip** — design (5611, 5613, 5615; shared CSS 522: `.srow.st .ic{width:32px;height:32px;border-radius:10px;background:#F4EEE6;color:var(--ink2);font-size:17px}`): each of Bildir / Engelle / Sustur has its Phosphor glyph inside a **32px sand-filled rounded-10px chip**; app (`PersonSheet.tsx:84,91,100`): bare `<Flag size={20}/>`, `<Prohibit size={20}/>`, `<SpeakerSlash size={20}/>` with no container. fix: wrap the icon in `<span className="flex h-8 w-8 flex-none items-center justify-center rounded-[0.625rem] bg-sand text-ink2">` inside `ActionRow` (PersonSheet.tsx:26-34) and drop the per-icon colour override.

**P2 — long-pressed row is not highlighted** — design (5567 / 5679: `style="background:rgba(222,36,86,.05);border-radius:16px"`): the participant row the sheet was opened from carries a **flame-tinted 5% background with 16px radius**; app (`ParticipantRow.tsx:53-55`): row class list has no selected/active state at all — nothing marks which person the sheet belongs to. fix: thread a `selected?: boolean` prop from `ParticipantList.tsx:53` (`selected={sheetFor?.id === p.id}`) and append `" bg-flame/5 rounded-2xl"` to the row class in `ParticipantRow.tsx:54`.

**P2 — open gesture** — design (artboard label 5499: "katılımcı satırına uzun basma" / long-press on a participant row; rows at 5548-5573 show **no** visible affordance); app (`ParticipantRow.tsx:113-122`): a permanently visible `DotsThree` button on every non-self, non-blocked row. fix: keep the button (it is the accessible trigger and a11y-superior to long-press), but add the designed gesture on the row container in `ParticipantRow.tsx:53` — `onContextMenu` + a pointerdown/pointerup 500 ms timer calling `props.onOptions?.(p)` — and reduce the dots button to `opacity-0 focus-visible:opacity-100 lg:opacity-100` if the clean design row is wanted on touch widths.

**P3 — "Engelle" danger colour** — design (5613: `.danger{color:#B3261E}`, shared CSS 526): block title and icon use **#B3261E**; app (`PersonSheet.tsx:30,91`): `text-flame-deep` = `#de2456` (`src/styles/app.css:17`). fix: add `--color-danger: #b3261e;` to the `@theme` block in `src/styles/app.css` and use `text-danger` for the block row title + icon.

**P3 — action hint size** — design (5611: hint is `.mi` = 12px, shared CSS 109); app (`PersonSheet.tsx:31`): `text-[0.8125rem]` (13px). fix: `text-xs` (0.75rem) in `ActionRow`'s hint span.

**P3 — sheet radius / padding / scrim** — design (shared CSS 466-467: `.sheet{border-radius:28px 28px 0 0;padding:10px 20px 26px}`; 465: `.scrim{background:rgba(39,32,59,.42)}`); app (`PersonSheet.tsx:15-16,64`): `rounded-t-card` (22px), `p-5` (uniform 20px), `bg-ink/35`. fix: `rounded-t-[1.75rem]`, `pt-2.5 px-5 pb-[1.625rem]`, `bg-ink/40`.

**P3 — sheet avatar colour** — design (5604: sheet header avatar `avC` matching the person, not the viewer); app (`PersonSheet.tsx:74`): `<Avatar name={name} index={0} ring />` — hard-coded index 0, so every person's sheet shows the flame (avA) gradient regardless of the colour used on their row. fix: thread the row index from `ParticipantList.tsx` into `PersonSheet` and pass it to `Avatar`.

---

## 2. W20 · Bildir / Engelle — 390 (design 5622–5717)

**P2 — no grab handle** — design (5697: `<div class="grab"></div>`, shared CSS 468: 40×5px line2 pill centred above the sheet content); app (`PersonSheet.tsx:71-112`): the menu step renders the avatar header directly, no handle. fix: render `<span aria-hidden className="mx-auto mb-1 h-[5px] w-10 rounded-[3px] bg-line2 lg:hidden" />` as the first child of the sheet in both steps.

**P3 — everything else matches**: row order Bildir → Engelle → Sesli sohbette sustur (5706/5708/5710 vs `PersonSheet.tsx:83-107`); titles and hints are exact matches of `social.report/reportHint/block/blockHint/mute/muteHint` in tr/en/nl; the header second line "Helmond · bu buluşmada" matches `social.inSession` (`PersonSheet.tsx:78`); "Vazgeç" (5712) matches `common.cancel` (`PersonSheet.tsx:110`).

---

## 3. W20 · Bildirildi — 390 (design 5718–5829)

**P1 — report reason list does not match the design** — design (5794-5814): four rows, in this order — **"Rahatsız edici ad"**, **"Sesli sohbette taciz"**, "Sahte / spam", "Başka"; app (`PersonSheet.tsx:11` + `social.reason*` in `src/i18n/locales/tr.json`): order `HARASSMENT, SPAM, IMPERSONATION, OTHER` rendered as "Taciz", "Sahte / spam", "Sahtecilik / başkasını taklit", "Başka". So: the design's leading item ("offensive **name**") has no counterpart, the app's `IMPERSONATION` has no design counterpart, and the order differs. **API check**: `frontend/shared/src/api-types.ts:820-826` fixes `ReportRequest.reason` to `"HARASSMENT" | "SPAM" | "IMPERSONATION" | "OTHER"` — there is **no `OFFENSIVE_NAME` value**, so the design's first row cannot be sent faithfully without a server enum change. fix (no API change, recommended): reorder `REASONS` to `["IMPERSONATION", "HARASSMENT", "SPAM", "OTHER"]` and retarget the copy — `social.reasonIMPERSONATION` → tr "Rahatsız edici ad" / en "Offensive name" / nl "Aanstootgevende naam", `social.reasonHARASSMENT` → tr "Sesli sohbette taciz" / en "Harassment in voice chat" / nl "Intimidatie in de spraakchat". If the semantic split matters, instead request an `OFFENSIVE_NAME` enum member on `/api/reports` and add a fifth row.

**P2 — reason control is a radio dot, design is a check circle** — design (5797: `<span class="chk on"><i class="ph ph-check"></i></span>`, shared CSS 167-169: 26px circle, 1.5px `--line-in` border; selected = `--grad` fill, transparent border, white 14px check glyph); app (`PersonSheet.tsx:127-132`): `h-5 w-5 rounded-full border-2`, selected = `border-flame bg-flame`, **no check glyph** and 20px instead of 26px. fix: render `<span className={"flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full border-[1.5px] " + (on ? "border-transparent bg-[image:var(--grad)] text-white" : "border-line-in")}>{on && <Check size={14} weight="bold" />}</span>`.

**P2 — confirmation banner has a dismiss X the design does not show** — design (5821-5825): grass-wash card, `--grs` CheckCircle 20px, bold label "Bildirildi · Kerem engellendi", **no close control**, sits at `top:124px` (under the app bar, inside the content column, `left/right:18px`); app (`ToastHost.tsx:30-37`): adds an `X` dismiss button, and positions at `top-[4.5rem]` (72px) `inset-x-4`. fix: hide the X for `tone === "grass"` auto-dismissing toasts (or drop it entirely) and change the container to `top-[7.75rem] inset-x-[1.125rem]` to sit under the header as designed.

**P3 — banner border** — design (5821: `border-color:#BFE5CF` on `--grs-w`); app (`ToastHost.tsx:21`): `border-grass` (`#0b7a44`) — a full-strength green hairline where the design uses the pale wash border. fix: `border-[#bfe5cf]` for the grass tone (the same value `LocationField.tsx:38` already uses).

**P3 — reason list rows lack the sand icon-less 12px vertical rhythm** — design (5796: `.srow` `padding:12px 16px;gap:12px`); app (`PersonSheet.tsx:13`, shared `ROW`): `px-4 py-[0.8125rem]` (13px) and `gap-3` (12px) — 1px off, shared with the menu rows. fix: split `ROW` into a menu variant (13px) and a reason variant (`py-3`).

---

## 4. W11c · Yeni oturum EN — 390 (design 2993–3083)

**Copy verdict: the EN activity vocabulary matches en.json exactly.** Groups (design 3012, 3019, 3030, 3039) `Food & drink / Active / Culture / Fun` = `activity.group.*`; all 15 type names (Coffee, Food, Bar, Walk, Hike, Swim, Fitness, Adventure, Cinema, Museum, Art, Bowling, Games, Theme park, Nightlife) = `activity.*` (note `ACTIVITY` is the key behind "Bowling", `src/lib/activity.ts:9`). Segment "Group"/"Solo" (3006), helper (3007), "Name the meetup · optional" (3049), placeholder "Friday coffee", "Where are you?" (3052), "…or type an address" (3062), "How are you getting there?" (3065), travel labels Walk/Bike/E-bike/Transit/Car (3067-3071), "Car selected" (3073), "Create the meetup" (3078), back link "Meetups" (3004), title "New meetup" (3005) — **all exact matches** to `newSession.*` / `travelMode.*` in `src/i18n/locales/en.json`.

**P2 — "What are you up to?" is a field label in the design, an overline in the app** — design (3009: `<span class="lb">` = 14px/600, sentence case, ink); app (`NewSessionPage.tsx:172`): `<Overline>` = 11.5px uppercase, `.11em` tracking, ink2 (shared CSS 106/389). Same mismatch on the type step: design has **no** heading above the Group/Solo segment (3006 follows the H1 directly), app renders `<Overline>{t("newSession.how")}</Overline>` at `NewSessionPage.tsx:170`. fix: replace both `Overline` calls with `<span className="text-[0.875rem] font-semibold">` for `newSession.what`, and drop the `newSession.how` overline on `<lg` (keep it for the ≥lg two-card layout inside `TypeSelector`).

**P2 — location block is a rounded-2xl box, design is a pill** — design (3054, shared CSS 146-151: `.loc{border-radius:999px;min-height:52px;border:1.5px solid var(--line2);box-shadow:var(--sh1);font-family:var(--fh);font-size:16px;font-weight:700}`, `.loc.on{background:var(--grs-w);border-color:#BFE5CF}`, `.loc-i` = 26px circle, white when on, holding a **9px green dot**); app (`LocationField.tsx:38-49`): `rounded-2xl` (16px), no shadow, body font at `text-[0.875rem] font-bold`, and `c-check` (`src/styles/app.css:297-316`) is a **30px white circle with a green checkmark**, not the 26px dot. fix: `rounded-full border-[1.5px] border-[#bfe5cf] bg-grass-wash shadow-sh1 min-h-[3.25rem]` on the container, title span to `font-head text-base font-bold`, and swap `c-check` for a 26px white circle containing a 9px `bg-grass` dot in this on-state.

**P3 — "· optional" loses its muted styling** — design (3049: `<span class="m2" style="font-weight:400">· optional</span>` inside the label); app (`NewSessionPage.tsx:177`): `label={`${t("newSession.name")} ${t("newSession.nameOptional")}`}` — a flat string, so the suffix renders at the label's 600 weight and full ink. fix: let `Field` accept a `labelSuffix?: ReactNode` and render it as `<span className="font-normal text-ink2">`.

**P3 — "near" vs "around"** — design (3058: "around Someren · detected automatically"); app (`src/i18n/locales/en.json` → `join.locAutoHint` = "near {{label}} · detected automatically"). fix: change `join.locAutoHint` to `"around {{label}} · detected automatically"`.

**P3 — extra hint not in the design** — design (between 3009 and 3010): no constraint line under "What are you up to?"; app (`NewSessionPage.tsx:173`): `<Note>{t("newSession.whatHint", { max: 3 })}</Note>` = "Pick up to 3". Keep (it is real product information) but be aware it is an app addition.

**P3 — `Where should you meet?` block is absent from the artboard** — design (2993-3083): after the name field the artboard goes straight to "Where are you?"; app (`NewSessionPage.tsx:182-216`): renders the `newSession.meetWhere` segment plus the anchor address field / map picker. This is the B-14 anchor feature landing after the artboard was drawn — **no fix, flagged so it is not mistaken for a regression**; the artboard needs a v4 pass if the feature stays.

---

## 5. W11d · Yeni oturum NL — 390 (design 3162–3252)

**Copy verdict: the NL activity vocabulary matches nl.json exactly.** Groups (3181, 3188, 3199, 3208) `Eten & drinken / Actief / Cultuur / Uitgaan`; types Koffie, Eten, Bar, Wandelen, Hiken, Zwemmen, Fitness, Avontuur, Bioscoop, Museum, Kunst, Bowlen, Games, Pretpark, Nachtleven — all exact. Back "Afspraken" (3173), title "Nieuwe afspraak" (3174), segment "Groep"/"Solo" (3175), helper (3176), "Wat gaan jullie doen?" (3178), "Geef de afspraak een naam · optioneel" (3218), "Vrijdagkoffie", "Waar ben je?" (3221), "Je huidige locatie" (3226), "…of typ een adres" (3231), "Hoe kom je?" (3234), "Afspraak maken" (3247) — **all exact matches** to `newSession.*` / `travelMode.question` in `src/i18n/locales/nl.json`.

**P2 — NL travel-mode names are longer than the design's** — design (3236-3240 aria-labels): `Lopend`, **`Fiets`**, `E-bike`, **`OV`**, **`Auto`**; app (`src/i18n/locales/nl.json` → `travelMode.*.name`): `Lopend`, **`Met de fiets`**, **`Met de e-bike`**, **`Met het OV`**, **`Met de auto`**. These strings are the segment buttons' `aria-label` and their **visible label at ≥lg** (`Segmented.tsx:19,25`), and they feed the helper line: the app renders **"Met de auto geselecteerd"** where the design says **"Auto geselecteerd"** (design 3242 vs `TravelModeField.tsx:50` + `travelMode.selected`). fix: shorten `nl.travelMode.{BIKE,EBIKE,TRANSIT,CAR}.name` to `Fiets`, `E-bike`, `OV`, `Auto` (leave the `.coming` sentence forms — "komt met de auto" — untouched, they are used in prose elsewhere).

**P3 — "automatisch bepaald" vs "automatisch gevonden"** — design (3227: "bij Someren · automatisch gevonden"); app (`src/i18n/locales/nl.json` → `join.locAutoHint` = "bij {{label}} · automatisch bepaald"). fix: change to `"bij {{label}} · automatisch gevonden"`.

**P2/P3 — the structural findings from W11c apply identically to W11d** (overline-vs-label at `NewSessionPage.tsx:170,172`, pill-vs-box location block at `LocationField.tsx:38`, flattened "· optioneel" at `NewSessionPage.tsx:177`, extra `whatHint` and `meetWhere` block). Not double-counted below.

---

## 6. i18n parity script

`node /Users/mehmetserefoglu/projects/bumpinto/scripts/i18n-parity.mjs` (read-only; reads the three locale JSONs, compares key sets after stripping CLDR plural suffixes):

```
tr 524 · en 533 · nl 533
```

Exit 0 — **no `eksik` (missing) or `fazla` (extra) lines**. The 524/533 count gap is expected and not a defect: tr has a single CLDR plural category so keys like `sessions.people` are unsuffixed, while en/nl need `_one` + `_other` (9 such key pairs). All `social.*` and `activity.*` keys audited above are present in all three locales.
