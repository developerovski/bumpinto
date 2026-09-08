# Report E — W3b / W3c / W3e "Mekanlar" parity audit

Design: `scratchpad/web-v3.html` (shared CSS 20–571, v3 override block 386–397).
App root: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web`.

**API-field check (done first, per rules):** `VenueDto.tagline` and `taglineSource` **DO exist**
(`frontend/shared/src/api-types.ts:772-774`), as do `hoursToday` (`:763`), `category` (`:758`),
`locality` (`:760`), `priceLevel`, `ratingScale`, `travel[]`, `fairness`. So **none** of the
findings below are blocked on a missing field — the "neyle bilinir" line and "Bugün hh:mm" line
are both already wired (`VenueMeta.tsx:22,30`; `venueText.ts:5`, whose header comment claiming
the field is absent is now stale). The only design element with no backing field is the
per-provider **icon** in `.f-attr` (`ph-google-logo`) — that is a pure presentation choice, not data.

---

## 1. W3b · Mekanlar (Grup, host, 1280) — design lines 1405–1529

P1 — uyum satırı `.f-fit` — design (1444, 1454, 1465, 1476, 1486): every row prints an
"uyum" line directly under the venue name — `Kahve için: espresso bar`, warn variant
`Kahve değil: fırın` (amber, 13px/500); app (`VenueRow.tsx:62-71`, `VenueMeta.tsx:26-32`): the row
never renders `FitLine` — the component exists (`FitLine.tsx`) but is only wired into
`VenueCard.tsx:202` and `WhyHere.tsx:50`. The single most-repeated element of the artboard is
absent from every list row. fix: in `VenueRow.tsx` render `<FitLine venue={v} categories={…} />`
between the `<h3>` and `<VenueMeta …>`; thread a `categories` prop (all row categories) down from
`VenueBrowser.tsx:173-190` so `FitLine`'s ≥2-distinct-category gate still applies.

P1 — kategori üstlüğü (`.ov`) — design (1440–1448): the row has **no** overline; the category
only appears inside the `.f-fit` sentence; app (`VenueRow.tsx:63`):
`{v.category && <Overline>{v.category}</Overline>}` prints an 11.5px uppercase tracked overline
above the name, so the category is shown twice once P1#1 is fixed and in the wrong typographic
register today. fix: delete `VenueRow.tsx:63` (and the now-unused `Overline` import) — the
category is carried by `FitLine`.

P1 — tembel harita perdesi `.f-ghostmap` — design (1523): even at 1280 the map panel is covered by
a translucent `rgba(255,251,246,.72)` scrim with a centred white ghost button
`<i class="ph ph-map-trifold"></i>Haritada gör`; the artboard label (1405) says "harita tembel";
app (`VenueBrowser.tsx:111, 208-212`): at `lg` the map mounts unconditionally
(`desktop = useMediaQuery("(min-width: 1024px)")` → `{(mapOpen || desktop) && map}`) with no
overlay, so a Maps load happens on every desktop view. fix: render the map wrapper always, and
when `!mapOpen` overlay an absolutely-positioned scrim
(`absolute inset-0 flex items-center justify-center bg-paper/70 rounded-[1.25rem]`) holding the
same white `Haritada gör` button that calls `openMap()`; gate `(mapOpen || desktop)` down to
`mapOpen` only.

P2 — el yazısı notun yeri — design (1436): `.hand` "önce herkese en adil olanlar →" sits on the
**sort row, to the right of the segmented control** (`.f-sortrow` = `justify-content:space-between`);
app (`VenueBrowser.tsx:160-170, 203`): the sort row holds the segmented control plus a
`lg:hidden` "Haritada gör" button, and `<HandNote>` is emitted at the **bottom of the list**, after
the last venue. fix: move `<HandNote>{t("venues.fairHand")}</HandNote>` into the sort-row flex
container wrapped in `hidden lg:block`, keeping the `lg:hidden` map button for 390.

P2 — başlık meta'sında orta nokta etiketi — design (1422):
`12 mekan · Eindhoven civarı · ≤ 9 km`; app (`VenuesPage.tsx:73-77`, `tr.json venues.meta`):
`"{{count}} mekan · orta noktadan ≤ {{km}} km"` — the `midpointLabel` segment is missing although
`view.midpointLabel` is already read two lines later (`VenuesPage.tsx:104`). fix: add
`venues.metaWithPlace: "{{count}} mekan · {{place}} civarı · ≤ {{km}} km"` to `tr.json` (+ en/nl)
and use it in `VenuesPage.tsx:74-77` when `view.midpointLabel && view.radiusKm != null`.

P2 — başlık: rozet ve meta aynı satırda — design (1420–1423): the activity badge and the
`.mi` meta text share ONE wrapping row (`<div class="row wr" style="gap:8px">`);
app (`SessionHeader.tsx:17-18`): `badges` is its own `flex flex-wrap` div and `meta` is a separate
`<span>` on the next line, making the header one line taller. fix: in `SessionHeader.tsx` render
badges and meta inside a single `flex flex-wrap items-center gap-2` row when both are present.

P2 — atıf satırı yönü ve ikon — design (1493–1497): `.f-attrs` is `display:flex;gap:16px;
padding:6px 10px 0` — three attributions **side by side**, the Google one carrying a
`ph-google-logo` glyph (`.f-attr i{font-size:12px}`); app (`Attribution.tsx:18-20`):
`flex flex-col gap-0.5` — a vertical stack with no icons. fix: change the class to
`flex flex-wrap items-center gap-4 pt-1.5 text-[0.6875rem] text-ink2` and add an optional
`iconKey`/`GoogleLogo` glyph for `google` in the `config.sources` mapping.

P2 — mekan görseli ölçüsü — design (1441): `58×58`, `border-radius:14px`;
app (`VenueRow.tsx:61`): `<VenueThumb … size={64} />` with `rounded-xl` (12px). 6px larger and
2px squarer than the artboard. fix: pass `size={58}` at `lg` (and `48` below `lg` — see §2) and
give `VenueThumb` a `radiusClass` prop defaulting to `rounded-[0.875rem]`.

P2 — "Haritada gör" düğmesi biçimi — design (1549, 3269, 1747): `.btn.b-gh` = transparent
background, `--flame-deep` text, transparent border, with a `ph-map-trifold` icon, `min-height:34px`
/ `12px` / `padding:0 12px`; app (`VenueBrowser.tsx:164-168`): `kind="white"` `size="sm"` and no
icon — a bordered white 42px pill. fix: use `kind="ghost"` (and change `buttonKinds.ghost` in
`buttonStyles.ts:22` from `text-ink border-line2` to `text-flame-deep border-transparent` to match
`.b-gh`), add `<MapTrifold size={16} />`, and add a `size="xs"` (34px/12px/px-3) variant.

P3 — `.rg-g` gövde ağırlığı — design (427): `.rg-g{font:500 12px/1.3 …}`;
app (`RangeBar.tsx:20`): `text-[0.75rem] text-ink2` — weight 400. fix: add `font-medium`.

P3 — yol bandı zemini — design (419): `.rg-t{background:#EFE7DC}`;
app (`RangeBar.tsx:50`): `bg-line2` = `#e4d9cd` (`app.css:31`) — visibly darker track. fix: add
`--color-track: #efe7dc` to `@theme` in `app.css` and use `bg-track`.

P3 — nokta rengi önceliği — design (422–425): `.me` sets background/colour and `.far` only sets
`border-color`, so a viewer who is also the outlier renders flame-filled **with** an amber ring;
app (`RangeBar.tsx:68-73`): the chain is exclusive and outlier wins, so "Senin için uzak" draws a
white/amber dot and the viewer loses their flame marker. fix: make the outlier branch add only the
border class and let the self branch keep `bg-flame-deep text-white`.

P3 — iki bölge oranı — design (1438): `grid-template-columns:53fr 47fr`, `gap:40px`;
app (`VenueBrowser.tsx:171`): `lg:grid-cols-[minmax(26rem,32rem)_1fr] lg:gap-10` (gap matches;
ratio is fluid and documented in `TwoZone.tsx:6-8` as a deliberate UI-review change). fix: none
required — flagged only so the deviation stays intentional.

---

## 2. W3b · Mekanlar (Grup, davetli, 390) — design lines 1531–1609

P2 — "host karıştırınca deste açılır" rozetinin yeri — design (1546): the amber badge is a
**block on its own line** under the title/meta (`align-self:flex-start`);
app (`VenuesPage.tsx:66` → `SessionHeader.tsx:14,20`): the badge goes into the `action` slot of a
`flex items-center justify-between` header, so at 390 it sits to the **right of the title** and
squeezes the session name. fix: in `SessionHeader.tsx` make the action slot
`w-full lg:w-auto order-last lg:order-none` when a new `stackAction` prop is set, and pass it from
`VenuesPage.tsx` for the guest/solo badge branches.

P2 — 390 satır ölçüleri — design (1551–1554): `.vrow` is overridden to `padding:8px; gap:9px;
border-radius:16px; align-items:flex-start`, thumb `48×48 / radius 12`, name `14.5px`;
app (`VenueRow.tsx:56-64`): a single unresponsive `gap-3 p-2.5 rounded-[1.125rem] items-center`
with `size={64}` thumb and `text-[1.0625rem]` (17px) name at every width. On a 390 viewport the row
is ~20px taller and the name 2.5px larger than the artboard. fix:
`gap-2 p-2 rounded-2xl items-start lg:gap-3 lg:p-2.5 lg:rounded-[1.125rem] lg:items-center`,
name `text-[0.90625rem] lg:text-h3`, thumb `size` 48 below `lg`.

P3 — atıf şeridinin konumu — design (1603–1606): `.f-attrs` lives **outside** `.scroll`, pinned
above the browser chrome, so it never scrolls away; app (`VenueBrowser.tsx:206`): `<Attribution>`
is the last child of the scrolling list column. fix: at `<lg` render `<Attribution>` as a sibling
after the list/map grid instead of inside the list column.

P3 — liste dibi solması `.f-fade` — design (1601): a 56px `linear-gradient(…, var(--paper))` fade
signals more rows below; app: no equivalent anywhere in `VenueBrowser.tsx`. fix: add
`<div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-paper lg:hidden" />`
to the (already `relative`) list container.

---

## 3. W3b · Mekanlar grup (390, host) — design lines 3253–3335

P1 — alt yapışkan CTA `.cta` — design (3329–3332): the host's primary action is a **full-width
bottom-pinned** `Karıştır ve kaydır` button with a centred `.mi` note beneath it
("Herkes bu listeyi görüyor; karıştırınca deste herkese açılır."); app
(`VenuesPage.tsx:39-62`): the shuffle button lives only inside `AvatarRow` in the header `action`
slot at every breakpoint — at 390 it is a small pill jammed next to three avatars, and the
`everyoneSees` note is buried at the bottom of the scrolling list (`VenueBrowser.tsx:204`).
fix: keep the header button `hidden lg:flex` (wrap in `DesktopOnly` from `MobileCta.tsx:9`) and add
`<MobileCta><Button …>{t("venues.shuffle")}</Button><Note center>{t("venues.everyoneSees")}</Note></MobileCta>`
at the end of `VenuesPage`'s tree; make `VenueBrowser`'s `everyoneSees` note `hidden lg:block`.

P2 — davet linki düğmesi — design (3268–3271, and 1425–1432 at 1280): the header holds avatars +
one primary action only; app (`VenuesPage.tsx:45-53`) additionally renders a `ShareButton`
("Davet linki") in the same row, which at 390 makes three controls compete in the header.
fix: acceptable at 1280, but move `ShareButton` out of the header at `<lg` (into the
`MobileCta` block above the shuffle button, `kind="white"`).

P3 — 390 CTA kopyası — design (3331): `Herkes bu listeyi görüyor; karıştırınca deste herkese
açılır.` (the 1280 board at 1492 uses the longer sentence the app has);
app (`tr.json venues.everyoneSees`): only the long 1280 variant exists. fix: optional — add
`venues.everyoneSeesShort` and use it in the `MobileCta` block.

---

## 4. W3c · Mekanlar (Bireysel/SOLO, 1280) — design lines 1611–1728

P1 — satır başına "Bunu seç" — design (1645, 1657, 1669, 1680, 1691): every SOLO row ends with a
`.btn.bsm` `Bunu seç` (white; the focused row's is `b-fl` flame), `min-height:34px`, `12px`,
`align-self:center`; app (`VenueRow.tsx:44-73`): the row has **no** action at all — the whole row
is `role="button"` and clicking it reveals a `SelectionCard` below (`VenueBrowser.tsx:192-199`).
At 1280 there is therefore no visible affordance telling a solo user they can choose. The
`SelectionCard.tsx:1-5` header comment says this replacement is deliberate, but it contradicts this
artboard. fix: in SOLO mode render a `Bunu seç` `Button` (`size="sm"`, `kind` = `flame` when
`selected` else `white`, `self-center flex-none`) as the last child of `VenueRow`, calling
`onSelect`; keep the inline `SelectionCard` for `<lg` only.

P1 — SOLO başlık düzeni — design (1623–1633): the header's right slot holds the **segmented
control** (`Herkese adil / Puan`), and the "Bireysel · 3 konum" chip sits inline in the badge row
next to the activity badge; app (`VenuesPage.tsx:63-64` + `VenueBrowser.tsx:161`): the header right
slot holds the `Bireysel · N konum` badge and the segmented control is pushed down into the sort
row above the list, so the artboard's top row is inverted. fix: in SOLO mode pass the badge into
`SessionHeader`'s `badges` (alongside `ActivityBadges`) and lift `VenueSort` into the `action` slot
at `lg` (`VenueBrowser` can accept a `sortSlot` render prop, or `VenuesPage` can own the sort state).

P2 — SOLO el yazısı notu — design (1693): `kaydırmak yok, beğendiğini seç →`;
app (`VenueBrowser.tsx:203`): always `t("venues.fairHand")` = "önce herkese en adil olanlar →",
i.e. the group copy is reused in SOLO where there is no deck to swipe. fix: add
`venues.soloHand: "kaydırmak yok, beğendiğini seç →"` to `tr.json` (+ en/nl) and pick by
`props.mode === "solo"`.

P2 — `.f-selcard` görünümü — design (365): `background:#fff; border:1.5px solid var(--flame-deep);
border-radius:16px; box-shadow:var(--sh2); padding:12px; gap:10px; margin:0 6px`;
app (`SelectionCard.tsx:23-25`): `bg-flame-wash` (pink `#ffe9ef`), `rounded-[1.125rem]` (18px),
**no shadow**, `mt-1.5 p-3.5`. Wrong surface colour and no elevation, so it reads as a tinted
banner rather than a lifted card. fix: `bg-card rounded-2xl shadow-sh2 p-3 mx-1.5 mt-1.5`.

P2 — onay kartı düğme yüksekliği — design (1775–1776): `Kilitle` is `flex:1; min-height:36px;
13px` and `Vazgeç` is `b-gh` (ghost, flame-deep text) `min-height:36px`;
app (`SelectionCard.tsx:35-40`): both are `size="fit"` = `min-h-[3.25rem]` (52px, 16px text) and
`Vazgeç` is `kind="white"`. 16px taller than the artboard. fix: use the new `size="xs"`/36px
variant, `className="flex-1"` on Kilitle, `kind="ghost"` on Vazgeç.

P3 — onay kartı başlığı — design (1771): one line, `.h3` 14.5px — `Seçimin: Café Berlage`;
app (`SelectionCard.tsx:27,30`): `Overline` ("SEÇİMİN", uppercase 11.5px flame) + a separate 15px
bold name line. fix: cosmetic — either keep, or collapse to
`t("venues.selectionTitleNamed", { name })` in a single `.h3`.

P3 — SOLO satır hizası — design (1636): `.vrow` is overridden to `align-items:flex-start` at 1280
in SOLO (unlike the group board, which stays centred); app (`VenueRow.tsx:57`): always
`items-center`. fix: fold into the responsive class list from §2.

---

## 5. W3e · Mekanlar yükleniyor (390, skeleton) — design lines 4270–4340

P1 — orta nokta kartı `.f-mid` — design (4281–4288): between the header and the searching copy the
board shows a full `.card.f-mid` — `MapMark` glyph + `Orta nokta` overline + `Eindhoven civarı`
(`.h3`) + `≤ 9 km · herkes ~25–35 dk`; app (`VenuesLoading.tsx:15-34`): the card is absent, so the
loading screen loses the one piece of real information it has. `MidpointCard.tsx` already renders
exactly this. fix: give `VenuesLoading` a `view: SessionView` prop (`LobbyPage.tsx:45` already has
`view`) and render `<MidpointCard view={view} />` directly under `<SessionHeader>`.

P1 — devre dışı CTA — design (4337–4339): the bottom `.cta` holds a full-width
`Karıştır ve kaydır` button with `disabled`, so the layout does not jump when the list arrives;
app (`VenuesLoading.tsx:15-34`): no CTA at all — the button appears only after loading finishes,
shifting everything. fix: append
`<MobileCta><Button type="button" disabled>{t("venues.shuffle")}</Button></MobileCta>`.

P2 — arama başlığı ilgi alanına özel — design (4291): `Çevredeki kahve mekanları aranıyor`;
app (`VenuesLoading.tsx:18`, `tr.json venues.searchingTitle`): `Çevredeki mekanlar aranıyor` — the
activity word is dropped even though `sessionActivities(view)` is available. fix: add
`venues.searchingTitleFor: "Çevredeki {{activity}} mekanları aranıyor"` and use it when the session
has exactly one activity, falling back to the current key otherwise.

P2 — arama alt metni — design (4292): `Google ve Foursquare'den 3 kişinin yoluna göre sıralanıyor.`
— it names the providers and the head-count; app (`VenuesLoading.tsx:21`,
`tr.json venues.searchingCopy`): `Herkesin yoluna göre sıralanıyor.` fix: add
`venues.searchingCopyFrom: "{{sources}} kaynağından {{count}} kişinin yoluna göre sıralanıyor."`,
building `sources` from `useConfigStore().config.sources` (same source `Attribution.tsx:12` reads)
and `count` from `view.participants.length`; keep the current key as the fallback when config is
not loaded yet, so no provider is invented.

P3 — iskelet parlaması — design (559): `.sk` is a horizontally sweeping
`linear-gradient(90deg,#F0E9E0,#F8F2EA,#F0E9E0)` with `background-size:200%`;
app (`VenueRowSkeleton.tsx:6`): flat `bg-sand` + `motion-safe:animate-pulse` (opacity fade).
fix: add a `--animate-shimmer` keyframe + `bg-[linear-gradient(90deg,#F0E9E0,#F8F2EA,#F0E9E0)]
bg-[length:200%_100%]` utility in `app.css` and swap `BLOCK`.

P3 — liste dibi solması — design (4335): a `.fade` element closes the scroll area;
app: absent (same as §2). fix: as in §2.

**Matches worth recording (no action):** skeleton row geometry is exact — 56×64 thumb at radius 12
(design 4302 vs `VenueRowSkeleton.tsx:12`), three bars 14/12/8px at radius 10 with 6px gap
(4304-4306 vs `:14-16`), `11px 14px` padding and `flex-start` alignment (4301 vs `:11`), 4 rows in
one `padding:0` card with `.dv` dividers inset 14px and none above the first (4308 vs
`VenuesLoading.tsx:25-32`), `genelde 5 saniye sürer` hand note (4334 vs `:33`),
`mekanlar aranıyor…` header meta (4280 vs `:16`).
