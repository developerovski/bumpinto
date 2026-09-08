# Design parity report — B (W2 / W2b "Yeni oturum")

Design source: `scratchpad/web-v3.html` (shared CSS 20–571, v3 override block 386–397).
App root: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web`.
All app paths below are relative to `frontend/web/src` unless absolute.

Shared implementation for all four artboards: `pages/NewSessionPage.tsx`.

---

## Artboard 1 — W2 · Yeni oturum · 1280 · Bireysel (SOLO) — design lines 798–951

**P1 — Alan başlıkları (`.lb` vs `.ov`)** — design (lines 817, 831, 895; cf. 873, 877): every form-section
label is `.lb` = 14px / weight 600 / sentence case / ink (`Nasıl buluşuyorsunuz?`, `Ne yapıyorsunuz?`,
`Nerede buluşulsun?`); `.ov` (11.5px, uppercase, `letter-spacing:.11em`, ink2 — CSS 106 + v3 override 389)
is reserved for the four activity-group captions (836, 844, 854, 862) and the right-zone `Konumlar` (900);
app (`pages/NewSessionPage.tsx:170,172,182`): renders `<Overline>` for `newSession.how` / `newSession.what` /
`newSession.meetWhere`, i.e. uppercase 11.5px caps, while the sibling labels from `Field.tsx:11` (`Buluşmaya
isim ver`) and `LocationField.tsx:34` (`Sen neredesin?`) are correctly 14px/600 — so one form mixes two
label systems; fix: replace those three `<Overline>` calls with the same `<span className="text-[0.875rem]
font-semibold">` used by `Field`/`LocationField` (or add a `Label` atom and use it in all five places);
leave `Overline` only in `ActivityPicker.tsx:27` and `PointsEditor.tsx:60`.

**P2 — "Nerede buluşulsun?" zone placement** — design (lines 893–898): the segment + its hint sit at the TOP
of the RIGHT zone, above `Konumlar`; app (`NewSessionPage.tsx:182–196`): rendered in the LEFT zone between
the name field and `LocationField`; fix: move the `meetWhere` label + `Segmented` (+ the ANCHOR sub-block)
into the `right` prop above `<PointsEditor>` for `type === "SOLO"`, keeping the left-zone position for GROUP
(which is what artboard 3 shows at line 3852).

**P2 — Orta nokta açıklaması yok** — design (line 897): `<span class="mi">Herkesin konumundan adil orta
nokta</span>` under the segment while MIDPOINT is selected; app (`NewSessionPage.tsx:197`): a hint is
rendered only in the ANCHOR branch (`newSession.anchorHint`), MIDPOINT gets nothing; `i18n/locales/tr.json:359–365`
has no matching key; fix: add `newSession.midpointHint = "Herkesin konumundan adil orta nokta"` (+ en/nl) and
render `<Note>{t("newSession.midpointHint")}</Note>` in the `MIDPOINT` branch.

**P2 — "Ne yapıyorsunuz?" başlığı ile sayaç aynı satırda** — design (lines 830–832): `.row` with
`justify-content:space-between; align-items:baseline` — label left, `En fazla 3 tane seç` (`.mi` 12px ink2)
right, on one baseline; app (`NewSessionPage.tsx:172–173`): `<Overline>` then `<Note>` as two stacked block
elements; fix: wrap both in `<div className="flex items-baseline justify-between gap-4">`.

**P2 — Host'un ulaşım türü satır içinde değil** — design (line 910): the "Sen" row inside the `Konumlar`
card carries a compact `.f-mp` strip (CSS 351–355: 22px round icon cells in a sand pill, active cell white
+ `sh1`), so the host's mode is set where the host's location is; app: the host mode lives in the left zone
as a full 5-cell `TravelModeField` (`NewSessionPage.tsx:230`), and the "Sen" row (`PointsEditor.tsx:64–73`)
has no mode control at all; the `.f-mp` compact variant does not exist anywhere in the codebase; fix: add an
`.f-mp`-sized variant to `Segmented.tsx` (`size="xs"`: 22px cells, icon-only, no visible label) and render it
in the host row of `PointsEditor`, bound to `travelMode`/`setTravelMode`; drop the left-zone `TravelModeField`
at `lg` (keep it for 390 — artboard 2 line 1033 does show it there).

**P2 — Elle eklenen nokta satırının mod seçicisi ikinci satırda** — design (line 920): `.f-mp` sits inline in
the row, between the name block and the `elle` badge; app (`PointsEditor.tsx:92–101`): `TravelModeField` is
rendered in a separate `div` BELOW the row, at 44px height, doubling the row's height; fix: move the picker
into the row `div` (`PointsEditor.tsx:77`) between the name column and `<Badge>`, using the compact variant
from the previous finding.

**P2 — CTA satırı** — design (lines 888–890): `.row gap:14px` with `.btn.b-fl.fit` (`width:auto`,
`padding:0 40px`) and the hint `.mi` on the SAME row to its right; app (`NewSessionPage.tsx:258–265`):
full-width `<Button>` (`Button.tsx:21` `w-full`) with `<Note>` stacked underneath; fix: wrap in
`<div className="flex flex-wrap items-center gap-3.5">`, pass `size="fit"` to the `Button` and add
`className="lg:px-10"`-equivalent padding; keep the stacked/full-width form below `lg` (artboard 2, line 1046).

**P2 — Hata metni rengi/ağırlığı** — design (CSS line 116): `.err{font-size:13px;color:var(--flame-deep)
/*#DE2456*/;font-weight:600}`; app (`components/atoms/ErrorText.tsx:6`): `text-[0.8125rem] text-[#c0392b]`,
normal weight — `#c0392b` is the `.b-dg` danger-button colour, not the DS error colour; fix: change to
`text-flame-deep font-semibold`.

**P2 — Geri bağlantısı biçimlenmemiş** — design (line 811): `.row`, `gap:6px`, `font-size:13px`,
`font-weight:600`, `color:var(--ink2)`, arrow-left glyph; app (`NewSessionPage.tsx:162–165`): bare
`<Link to="/sessions">` with no classes, so it inherits the global `a{color:var(--color-flame-deep)}`
(`styles/app.css:216`) at body size, and the icon and text are not laid out as a flex row (no 6px gap);
fix: `className="flex w-fit items-center gap-1.5 text-[0.8125rem] font-semibold text-ink2 no-underline"`.

**P2 — `.loc` kartının biçimi** — design (line 878 + CSS 146–151): `.loc` is a PILL (`border-radius:999px`),
`1.5px` border, `min-height:52px`, `box-shadow:var(--sh1)`, title in `var(--fh)` 16px/700; `.on` swaps to
`--grs-w` background and `#BFE5CF` border; app (`components/molecules/LocationField.tsx:38–43`):
`rounded-2xl` (16px), `border` (1px), no shadow, title `text-[0.875rem] font-bold` in body font; fix:
`rounded-full border-[1.5px] shadow-sh1 min-h-[3.25rem]` on the wrapper and `font-head text-base font-bold`
on the title span.

**P3 — `.loc-i` yeşil nokta yerine tik** — design (line 879 + CSS 149–151): a 26px circle containing a 9px
solid green dot (white circle when `.on`); app (`LocationField.tsx:39` → `styles/app.css:297–316` `.c-check`):
a 30px white circle with a drawn green check-mark; fix: either restyle `.c-check` to the dot form for this
component or accept the tick as an intentional DS deviation and record it.

**P3 — `.typ` iç boşluğu bu artboard'da daraltılmış** — design (lines 819, 823): `padding:10px 14px` override
on the two type cards; app (`components/molecules/TypeCard.tsx:7`): `p-[0.875rem_1rem]` = 14px 16px (the
`.typ` base, CSS 299); fix: none required unless the 1280 density is wanted — if so add a `dense` prop used
only from `TypeSelector`'s `lg:flex` branch.

**P3 — Nokta ekleme alanı ölçüsü** — design (line 926): `.inp.phd` with `min-height:44px; font-size:14px;
border-radius:12px`; app (`PointsEditor.tsx:107` → `atoms/TextInput.tsx:9`): 52px / 16px / `rounded-2xl`;
fix: add a `size="sm"` prop to `TextInput` (`min-h-[2.75rem] rounded-xl text-[0.875rem]`) and use it here.

**P3 — Harita yüksekliği** — design (line 930): `.gmap` `height:330px`; app (`NewSessionPage.tsx:284–292` →
`organisms/MapFrame.tsx:15`): default `h-[20rem]` = 320px; fix: pass `heightClass="h-[20.625rem]"`.

**P3 — Fazladan el yazısı notu** — design: the SOLO 1280 right zone ends with the map (line 951); app
(`NewSessionPage.tsx:296`): renders `<HandNote>{t("newSession.soloHand")}</HandNote>` below the map; fix:
drop it, or move it under the CTA where the 390 layout has room.

---

## Artboard 2 — W2 · Yeni oturum · 390 · Grup — design lines 952–1051

**P2 — Tip seçici ortalanmamış** — design (lines 964–967): the `.seg` sits in a centred row and the selected
type's copy is `text-align:center` beneath it; app (`components/molecules/TypeSelector.tsx:29–40`): the
`<lg` branch is a left-aligned `flex-col` with a left-aligned copy line; fix: add `items-center text-center`
to that `div` (and keep the `lg:` branch untouched).

**P2 — Alt CTA yapışkan değil** — design (lines 1044–1047): the button lives in `.cta` OUTSIDE `.scroll`
(CSS 98–99), i.e. pinned below the scrolling form, with a `.fade` gradient (line 1043, CSS 415) masking the
scroll edge; app (`NewSessionPage.tsx:252–267`): the button is an ordinary child at the end of the left zone;
`components/molecules/MobileCta.tsx` exists for exactly this and is NOT used by this page; fix: wrap the CTA
in `<MobileCta>` for the `<lg` case and add `<DesktopOnly>` for the `lg` inline row from artboard 1.

**P2 — Ulaşım türü rayı tam genişlik değil** — design (lines 1034–1040 + CSS 341–350): `.f-seg.icn` is
`width:100%; flex-wrap:nowrap`, each cell `flex:1; justify-content:center; padding:9px 0`, container radius
16px / cell radius 13px, icon 18px; app (`components/molecules/Segmented.tsx:15,21–23`): `inline-flex
flex-wrap rounded-full`, cells `min-h-11 px-4` — the rail hugs its content and is fully rounded; fix: add a
`fill` prop to `Segmented` that emits `flex w-full flex-nowrap rounded-2xl` on the container and
`flex-1 justify-center rounded-[0.8125rem] px-0` on the cells, and pass it from `TravelModeField.tsx:26`.

**P2 — 390'da GROUP sağ bölgesi (davet önizlemesi) fazladan** — design (lines 962–1044): the 390 GROUP form
ends after the travel-mode field; there is no invite preview; app (`NewSessionPage.tsx:299,302`):
`rightLgOnly` is set only for SOLO, so `InvitePreview` renders below the form at 390; fix: change
`rightLgOnly={type === "SOLO"}` to `rightLgOnly` (always true) — the preview is a desktop-only affordance in
both 390 artboards.

**P3 — 390'da başlık ölçüsü** — design (line 963): `.big` overridden to `font-size:30px`; app
(`styles/app.css:231–236`, `atoms/Heading.tsx`): `--text-display` = 34px below `lg`; fix: give `Heading` a
`size="form"` = `text-[1.875rem] lg:text-[2.875rem]`, or accept 34px and record the deviation.

**P3 — 390'da "Nasıl buluşuyorsunuz?" etiketi yok** — design (963→965): h1 is followed directly by the
centred segment, with no label; app (`NewSessionPage.tsx:170`): the label is rendered at every width; fix:
move it inside `TypeSelector`'s `lg:flex` branch (it is already the `radiogroup`'s `aria-label` at 390, so
nothing is lost for screen readers).

**P3 — 390'da geri bağlantısı yok** — design (line 962): the mobile scroll area starts at the h1; app
(`NewSessionPage.tsx:162`): the `Oturumlar` link renders at all widths; fix: `hidden lg:flex` on it (the
browser/app back affordance covers 390).

**P3 — Etkinlik grupları arası boşluk** — design (CSS 161/562): `.mb .grps{grid-template-columns:1fr;gap:14px}`;
app (`components/molecules/ActivityPicker.tsx:24`): `gap-x-5 gap-y-4` (16px) at all widths; fix:
`gap-y-3.5 lg:gap-y-4`.

Copy for this artboard matches `tr.json` exactly (`newSession.group/groupCopy/what/whatHint/name/nameOptional/
namePlaceholder/meetWhere/modeMidpoint/modeAnchor/where/orAddress/createGroup`, `join.locAuto/locAutoHint/locOk`,
`travelMode.question/selected`) — the only missing string is `midpointHint` (artboard 1), which this artboard
also shows at line 1018.

---

## Artboard 3 — W2b · Yeni oturum · 1280 · Grup · "Belli bir yerde" — design lines 3821–3904

**P1 — Harita seçici yanlış bölgede** — design (lines 3878–3897): with ANCHOR selected the RIGHT zone becomes
the picker — hint, 520px `.gmap`, İptal/Burayı seç row, attribution — while the left zone keeps the form;
app (`NewSessionPage.tsx:231–251`): `<MapPicker>` is rendered inside the `left` prop, so it is injected
between `LocationField`/`TravelModeField` and the CTA, pushing the form down, and the right zone keeps
showing `InvitePreview` (`NewSessionPage.tsx:299`); fix: hoist the `picker &&` block out of `left` and render
it in `right` (replacing `InvitePreview`/`PointsEditor` while `picker !== null`) at `lg`; below `lg` see
artboard 4.

**P2 — "Haritadan seç" düğme değil, metin bağlantısı** — design (line 3858): `.btn.b-wh.bsm` with
`min-height:44px`, `align-self:flex-start`, a `ph-map-pin` glyph, white card background, `line2` border, `sh1`;
app (`NewSessionPage.tsx:208–214`): a bare `<button>` styled `text-[0.75rem] font-normal text-flame-deep
underline-offset-2` — a 12px text link; the same pattern is repeated in `LocationField.tsx:75–83,101–109`;
fix: use `<Button kind="white" size="sm" className="self-start"><MapPin size={18} aria-hidden />{t("map.pickOnMap")}</Button>`
in both places.

**P2 — Çapalı modda "Sen neredesin?" alt notu yok** — design (line 3872): under the `.loc` card the hint
`İstersen; çapalı buluşmada zorunlu değil` REPLACES the "…ya da adres yaz" link, telling the host the field is
optional in anchored mode — which is exactly what `NewSessionPage.tsx:115` implements
(`if (!resolvedOwn && anchorMode !== "ANCHOR")`); app (`LocationField.tsx:50–56`): always renders the
`otherLabel` link and never the optional-hint; `tr.json:346–386` has no key for it; fix: add
`newSession.ownOptional = "İstersen; çapalı buluşmada zorunlu değil"` (+ en/nl), pass an optional `hint`
prop to `LocationField`, and render it instead of the link when `anchorMode === "ANCHOR"`.

**P2 — Seçici harita yüksekliği** — design (line 3880): `.gmap` `height:520px` in the desktop right zone;
app (`components/organisms/MapPicker.google.tsx:96`, and the placeholder at `MapPicker.tsx:29`): fixed
`h-[16rem]` = 256px at every width; fix: add a `heightClass` prop to `MapPicker`/`MapPicker.google`/
`MapPicker.maplibre` and pass `h-[18.75rem] lg:h-[32.5rem]` from `NewSessionPage` (300px in the 390 sheet —
artboard 4 line 3960 — and 520px on desktop).

**P2 — Onay/iptal düğmeleri: sıra, tür ve genişlik** — design (lines 3892–3895): `.row gap:10px` with
`İptal` FIRST as `.btn.b-gh` (transparent, `--flame-deep` text, no border) and `Burayı seç` second as
`.btn.b-fl`, both `flex:1`; app (`MapPicker.google.tsx:106–114`): confirm first, cancel second, cancel is
`kind="white"` (card background + `line2` border), and both are `size="fit"` (auto width, left-packed);
note also that `buttonStyles.ts:22` defines `ghost` as `bg-transparent text-ink border-line2`, which does not
match `.b-gh` (`color:var(--flame-deep)`, transparent border); fix: swap the order, use `kind="ghost"` for
cancel, put `className="flex-1"` on both, and correct `buttonKinds.ghost` to
`bg-transparent text-flame-deep border-transparent`.

**P3 — İpucu haritanın üstünde** — design (line 3879): `Haritaya dokun ya da pini sürükle` sits ABOVE the map;
app (`MapPicker.google.tsx:105`): `<Note>{t("map.pickHint")}</Note>` renders below the map box; fix: move the
`<Note>` above the map `div`.

**P3 — "Buluşma yeri" etiketi 13px** — design (line 3856): `.lb` overridden to `font-size:13px` for the
nested sub-field; app (`Field.tsx:11`): 14px like every other label; fix: add an optional `labelSize="sm"`
prop to `Field` and pass it for `session-anchor`.

**P3 — Alt alan sırası** — design (lines 3856–3860): label → input → "Haritadan seç" → hint; app
(`NewSessionPage.tsx:199–214`): label → input → hint → button; fix: move the pick-on-map button above the
`<Note>`.

**P3 — Çözülen çapa ipucunun değişmesi** — design (line 3860): the hint stays `Mekanlar bu noktanın 2 km
çevresinde aranır.` regardless of state; app (`NewSessionPage.tsx:207`, `tr.json:365`): once resolved it is
replaced by `anchorSet` = `"{{label}} çevresinde aranacak"`, so the 2 km promise disappears exactly when the
user needs it; fix: render both — `anchorSet` as the confirmation and keep `anchorHint` as a second line.

**P3 — Seçilen noktanın adresi haritada gösterilmiyor** — design (line 3889): `.mcap` inside the map reads
`Kleine Berg 16, Eindhoven` for the pin's CURRENT position; app (`MapPicker.google.tsx:84–92`): the address
is resolved by `reverseGeocode` only inside `confirm()`, deliberately (`MapPicker.google.tsx:14`: the endpoint
is rate-limited at 30/min server-side), so no live label exists to show; fix: either leave as-is and record
the deviation, or show the caption only after a debounced (≥1.5s idle) reverse geocode — do not fabricate a
label from coordinates.

**P3 — Harita atfı yok** — design (lines 3896–3897): `.f-attrs` row with `.f-attr` "Google Maps" +
`ph-google-logo` under the picker; app: `components/molecules/Attribution.tsx` exists and is data-driven from
`/api/config.sources`, but is used only in `DeckScreen.tsx:128`, `VenueBrowser.tsx:206`, `VenueCard.tsx:244`,
`WinnerCard.tsx:137` — never under `MapPicker`/`MapView`; the Google Maps JS canvas paints its own in-map
logo, so this is a duplicate rather than a compliance gap; fix (optional): render
`<Attribution providers={["google"]} />` under the picker when the engine is `google`.

Note on artboard scope: lines 3821–3904 omit the `Ne yapıyorsunuz?` and `Buluşmaya isim ver` blocks that
artboard 1 (829–875) and artboard 4's sibling (3921) keep. Read as artboard elision, not a removal — the app
correctly keeps both in ANCHOR mode.

**API check (no fabricated data):** every field these two W2b artboards need exists —
`CreateSessionRequest.anchor` → `AnchorDto{lat,lng,label}` at
`/Users/mehmetserefoglu/projects/bumpinto/frontend/shared/src/api-types.ts:602–612,622`, wired at
`store/newSessionStore.ts:87`. The "2 km" figure in the hint is STATIC copy on both sides: `radiusKm`
(`api-types.ts:712`) lives on `SessionView`, i.e. only after the session exists, so the create form cannot
source it — acceptable, but the number is duplicated in `tr.json:364` and will silently lie if the backend
default changes.

---

## Artboard 4 — W2b · Yeni buluşma çapalı · 390 (incl. "haritadan seç" alt sayfası) — design lines 3905–3975

**P1 — Harita seçici alt sayfa (bottom sheet) değil** — design (lines 3949–3972): a `.scrim`
(`rgba(39,32,59,.42)`, CSS 465) plus a `.sheet` (CSS 466–469: bottom-anchored, `border-radius:28px 28px 0 0`,
`padding:10px 20px 26px`, `0 -12px 40px` shadow) containing `.grab` handle → `.h3` "Haritadan seç" →
hint → 350×300 map → address + attribution row → İptal/Burayı seç; app (`NewSessionPage.tsx:231–251`):
`<MapPicker>` is rendered inline in the form flow with no overlay, no scrim, no grab handle and no title, so
at 390 the map simply appears mid-form and the rest of the form stays interactive behind it; fix: introduce a
`Sheet` molecule (fixed overlay + scrim + `rounded-t-[1.75rem]` panel + grab bar + `<h3>` title + focus trap
+ Esc/scrim close) and wrap the `<lg` rendering of `MapPicker` in it; keep the artboard-3 right-zone form at
`lg`.

**P2 — Alt sayfa başlığı yok** — design (line 3952): `.h3` "Haritadan seç" (17px/700 head font, CSS 105);
app: `MapPicker`/`MapPicker.google` render no heading at all — `tr.json:295` already carries the string as
`map.pickOnMap`; fix: render `<h3>{t("map.pickOnMap")}</h3>` at the top of the sheet.

**P2 — Yapışkan CTA + tip segmenti + h1 ölçüsü** — design (lines 3916–3918, 3945–3947): identical to
artboard 2 (centred segment + copy at 3918–3920, 30px h1 at 3916, `.cta` outside `.scroll` at 3945); app: same
gaps as recorded in artboard 2 (`TypeSelector.tsx:29–40`, `NewSessionPage.tsx:252–267`, `app.css:231`); fix:
as per artboard 2 — one fix covers both 390 artboards.

**P2 — Çapalı modda "Sen neredesin?" alt notu** — design (line 3941): same
`İstersen; çapalı buluşmada zorunlu değil` as artboard 3 line 3872; app (`LocationField.tsx:50–56`): shows
`…ya da adres yaz` instead; fix: as per artboard 3.

**P3 — Alt sayfada adres okuma satırı** — design (lines 3964–3966): a row pairing the pin's address
(`.mi` in ink) with the `.f-attr` "Google Maps" attribution; app: neither is rendered
(`MapPicker.google.tsx:94–115`); fix: same as artboard 3 — the address needs a debounced reverse geocode or
must stay absent; the attribution line can be added immediately via `<Attribution providers={["google"]} />`.

**P3 — Alt sayfa harita ölçüsü** — design (line 3960): `.gmap` `width:350px; height:300px; align-self:center`;
app (`MapPicker.google.tsx:96`): `h-[16rem]` (256px), full width; fix: covered by the `heightClass` prop from
artboard 3 — pass `h-[18.75rem]`.

**P3 — "Haritadan seç" düğme biçimi (390)** — design (line 3927): same `.btn.b-wh.bsm` + `ph-map-pin`, here
full width (no `align-self`); app: the 12px text link from artboard 3; fix: same component change, with
`className="self-start lg:self-start"` dropped below `lg`.
