# Design parity report — Bölge D (W4 / W4b / W11a / W11b · Katıl)

Design: `scratchpad/web-v3.html` (shared CSS 20–571, v3 override block 386–397)
App: `frontend/web/src/…` — `pages/JoinForm.tsx` + `molecules/{JoinIntro,JoinFormFields,LocationField,TravelModeField,Field,WhoIsHere,TwoZone,Segmented}`, `atoms/{TextInput,ErrorText,Note,Badge,Button,Avatar,HandNote,Overline,Highlight}`, `organisms/{MapView,MapFrame}`.

Token map `src/styles/app.css:9–47` is 1:1 with the design `:root` (paper/card/ink/ink2/ink3/flame*/sun/hl/grass/violet/amber/line/line2/line-in, fonts, sh1/sh2, radius-card 22px). The v3 overrides are honoured too: `--color-amber-ink #7e4f06` / `--color-flame-ink #c41c4b` (app.css:26–30) = design 391–392; `Overline` 11.5px/ink2 (Overline.tsx:7-8) = design 389; `Badge` 12px (Badge.tsx:17) = design 390. No token-level findings.

Scope note: the brief lists `JoinedCard` and `OneZone` as rendered by `JoinForm`. Neither is — `JoinedCard` is only used by `pages/WaitingRoom.tsx:75`, `OneZone` only by error/landing screens.

---

## 1. W4 · Katıl 1280 (design 1253–1336)

P1 — 409 "çok uzak" hata kartı — design (4164–4170 / 4212–4224, the 1280 twin): the too-far error is a `.card` with `--flame-w` ground, `#F6C6D2` border, holding (a) the `.err` sentence, (b) a `.mi` line "Buluşma yeri: … · sen ~1.900 km", (c) a small ghost button "Host'a yaz"; app (JoinFormFields.tsx:52): every error — geocode, generic join failure and too-far — renders as one bare `<ErrorText>` paragraph, no card, no meeting-place line, no host action; fix: in `JoinFormFields` branch on the error identity (pass the code down from `JoinForm.tsx:91`) and render the too-far case as `<div className="rounded-card border border-[#f6c6d2] bg-flame-wash p-[0.625rem_0.8125rem] flex flex-col gap-1.5">` containing `<ErrorText>` + the meeting-place line + the ghost button. **Data caveat:** the "Buluşma yeri: Eindhoven civarı · sen ~1.900 km" line has NO backing field — `SessionPreview` (`frontend/shared/src/api-types.ts:926–939`) carries only slug/name/activityTypes/sessionType/status/hostDisplayName/participantCount/participants/hostOnline, and the 409 body is `ApiError { error }` only (api-types.ts:539–541). Do not fabricate it: ship the card without that line, or add midpoint label + distance to the 409 payload first. "Host'a yaz" likewise has no target — `grep -rn "messageHost|ChatCircle" src` returns nothing and `VoiceDock` exists only after joining; omit the button or wire it to a real capability.

P2 — sol sütun genişliği — design (1275, 1276, 1280, 1292, 1302): every form block below the divider is capped at `max-width:460px` inside the 58fr zone (intro/h1/badges stay full width); app (JoinForm.tsx:110–126, JoinFormFields.tsx:30): no cap, so the form stretches the full 58fr (~620px at 1120) — divider, inputs, location pill and CTA ~35% wider than designed; fix: wrap the `<form>` at JoinFormFields.tsx:30 with `lg:max-w-[28.75rem]` and add the same cap to the divider at JoinIntro.tsx:52.

P2 — alt başlık boyutu — design (1274): `.bd m2` with inline `font-size:17px` — a 17px ink2 lead under the badges; app (JoinIntro.tsx:47): rendered through `<Note>` = `text-[0.8125rem]` (13px, Note.tsx:7), so the lead reads as fine print; fix: replace with `<p className="text-[1.0625rem] leading-[1.5] text-ink2">`.

P2 — konum "granted" kontrolü — design (1282–1289): `.loc.on` keeps the pill geometry — `border-radius:999px`, `min-height:52px`, `padding:0 16px`, `font-family:var(--fh);font-size:16px;font-weight:700`, leading glyph `.loc-i` (26px white disc + 9px grass dot, CSS 146–151); app (LocationField.tsx:38–49): a `rounded-2xl` (16px) box with `p-[0.875rem_1rem]`, a `c-check` 30px disc with a **checkmark** (app.css:296–316), title at `text-[0.875rem] font-bold` in the body font; fix: reuse the pill shape (`rounded-full min-h-[3.25rem] px-4`), swap `c-check` for the existing `LOC_DOT` (LocationField.tsx:5–12) with a white disc, title `font-head text-base font-bold`.

P2 — `err` rengi/ağırlığı — design (CSS 116): `.err{font-size:13px;color:var(--flame-deep);font-weight:600;line-height:1.4}` → `#DE2456`, semibold; app (ErrorText.tsx:6): `text-[0.8125rem] text-[#c0392b]` — a brick red that is in no token in `app.css`, regular weight, body line-height 1.55; fix: `text-[0.8125rem] font-semibold leading-[1.4] text-flame-deep`.

P2 — fazladan "Haritadan seç" bağlantısı — design (1280–1291, and every other Katıl artboard): the location block ends at the "Başka bir şehir ya da adres yaz" link — no map-picker affordance on this screen; app (LocationField.tsx:75–83 and 101–109, fed by JoinForm.tsx:123): an extra "Haritadan seç" text button in both idle and denied branches, plus a lazily mounted `MapPicker` (JoinForm.tsx:127–140); fix: drop `onPickOnMap` at JoinForm.tsx:123 (and the picker block), or get the affordance added to the artboard.

P3 — bölge/blok boşlukları — design (1264): `.zone` gap 18px; app (TwoZone.tsx:53 `gap-4`=16px, JoinIntro.tsx:22 `gap-3`=12px, JoinFormFields.tsx:30 `gap-[0.9375rem]`=15px); fix: pass `leftGap="md"` at JoinForm.tsx:100 and set JoinIntro.tsx:22 to `gap-[1.125rem]`.

P3 — avatar ölçüsü — design (CSS 185–186): `.av` is 40×40 / 15px initial, `.ring` pad 2.5px; app (Avatar.tsx:15): `md` = `h-11 w-11` (44px), `text-base`; fix: `md: "h-10 w-10 text-[0.9375rem]"`.

P3 — harita yüksekliği ve kapsül metni — design (1322, 1327): `.gmap` 290px, caption "Katılınca konumlar haritada görünür."; app (JoinForm.tsx:147–155): no `heightClass` so MapFrame.tsx:15 defaults to `h-[20rem]` (320px), caption is `map.midpointPending` = "Orta nokta sen katılınca netleşir"; fix: pass `heightClass="lg:h-[18.125rem]"` and add a `map.locationsPending` key with the artboard sentence in tr/en/nl.

P3 — katılım öncesi kendi pini — design (1327): before joining the map is empty, only the caption; app (JoinForm.tsx:50–68, 148): renders a self pin labelled `map.youPending` as soon as geolocation resolves; fix: acceptable enhancement; for strict parity pass `participants={[]}` until join succeeds.

P3 — el yazısı not — design (1330): `.hand` 20px Caveat 600, `rotate(-2deg)`, `align-self:flex-end`; app (HandNote.tsx:7 via WhoIsHere.tsx:35): 19px, `-rotate-[1.5deg]`, no self-alignment so it sits left; fix: `text-[1.25rem] -rotate-2` + `self-end` at the call site.

P3 — `.loc` / `.btn` yatay iç boşluk — design (CSS 129, 146): buttons `0 22px`, location pill `0 16px`; app (Button.tsx:21 `px-6`=24px for both, reused at LocationField.tsx:62/89); fix: `px-4` override for the `align="start"` location variant.

P3 — ulaşım alanı etiketi — design (1293): `.lb` = 14px/600, same as its siblings; app (TravelModeField.tsx:25): `text-[0.8125rem]` (13px) while Field.tsx:11 and LocationField.tsx:34 use 14px; fix: `text-[0.875rem]`.

P3 — segmented ikon boyutu ve EBIKE glifi — design (CSS 345, 1297): `.f-seg span i{font-size:15px}`, and `.eb` is a 15px bicycle with a 9px flame-deep lightning **badge** top-right; app (TravelModeField.tsx:39): single icons at 18px, EBIKE renders `Lightning` then `Bicycle` side by side at 13px (order from lib/travelMode.ts:24); fix: 15px at `lg`, compose EBIKE as a relative `Bicycle` with an absolute 9px `Lightning`.

## 2. W4 · Katıl 390, izin reddedildi (design 1337–1383)

P1 — 390'da sağ bölge — design (1344–1376): the mobile frame contains only intro → h1 → badges → divider → form; no "Kimler var" card and no hand-written note; app (JoinForm.tsx:143–159 + TwoZone.tsx:59–62): `rightLgOnly` is not passed, so the right zone is `flex` at every width — `WhoIsHere`'s card (WhoIsHere.tsx:16–33) and `HandNote` (WhoIsHere.tsx:35) both render under the form on 390. Only the map is correctly hidden (`lgOnly` → MapFrame.tsx:15). Fix: pass `rightLgOnly` to `TwoZone` at JoinForm.tsx:100, or gate the card and note with `hidden lg:flex` inside `WhoIsHere`.

P2 — 390 CTA yerleşimi — design (1377–1380): the Katıl button and privacy line live in `.cta` (CSS 99) — a `flex:0 0 auto` footer below the scroll area, outside the form flow, with `.fade` (CSS 415) fading content into it on the W4b variant; app (JoinFormFields.tsx:53–56): both are the last children of the form and scroll away with the rest; fix: move them into `<MobileCta>` (molecules/MobileCta.tsx:4, already `mt-auto … lg:hidden`) with a `DesktopOnly` copy for ≥1024 — the pattern ProfilePage.tsx:58 / AccountPage.tsx:115 already use.

P2 — 390 ulaşım seçicisi — design (1367–1373, CSS 348–350): `.f-seg.icn` is `width:100%; flex-wrap:nowrap`, each option `flex:1; justify-content:center; padding:9px 0` with an 18px icon — five equal full-width segments; container radius 16px, segments 13px (CSS 341–344); app (Segmented.tsx:15–23): `inline-flex flex-wrap … rounded-full` with `min-h-11 px-4` — a content-width fully-round pill, not a stretched five-up bar; fix: at `size="lg"` use `flex w-full flex-nowrap rounded-2xl` on the container and `flex-1 justify-center rounded-[0.8125rem] px-0 py-[9px]` per option.

P2 — hata alanının kalıcı çerçevesi + `aria-describedby` — design (1363; the artboard title at 1385 states it explicitly): the address input keeps `border-color:var(--flame-deep)` plus a `0 0 0 3px var(--flame-w)` ring while the error stands, and the error is wired to the field; app (LocationField.tsx:67–74 + TextInput.tsx:11): the flame border/ring exists only under `focus:`, the input carries no `aria-invalid`, and `ErrorText` (ErrorText.tsx:6) emits no `id`, so nothing is described-by anything; fix: give `ErrorText` an optional `id`, render it as `id="join-address-error"`, and add `aria-invalid aria-describedby="join-address-error"` plus `aria-[invalid=true]:border-flame-deep aria-[invalid=true]:shadow-[0_0_0_3px_var(--color-flame-wash)]` to the denied-state `TextInput`.

P3 — 390 h1 ölçüsü — design (1349): mobile title `font-size:36px` (26px in the W4b variant, 4138); app (app.css:231–236): `h1` = `var(--text-display)` = 34px below 1024; fix: 2px — leave it, or set `--text-display: 2.25rem`.

P3 — 390 blok aralığı — design (1344): `.scroll` gap 14px, `padding-top:14px`; app (Page.tsx:10): `gap-[0.9375rem]`=15px, `pt-5`=20px; fix: `pt-3.5` if exact parity is wanted.

## 3. W4/W5 · Hata durumları (design 1385–1403)

Copy is exact in all three locales — design 1389 = `join.errGeolocation`, 1393 = `join.errGeocode`, 1397 = `join.errJoin`, 1401 = `waiting.errUpdate` (tr/en/nl all match word for word).

P2 — "Katılım başarısız" hatasının yeri — design (1395–1397): the join-failure `.err` sits **below** the Katıl button and is `text-align:center`; app (JoinFormFields.tsx:52–55): every error renders *above* the button, left-aligned; fix: keep field-level errors above, render the submit-level error (`join.errJoin`) after `<Button>` with `text-center`.

P2 — "Ayarlar'dan izin ver" bağlantısı — design (4148 / 4204): between the error and the address input the denied state offers a gear-icon link into OS/browser location settings; app (LocationField.tsx:60–85): only retry → error → input; fix: no web API can open browser permission settings, so either drop this from the web artboard or replace it with a short "tarayıcı ayarlarından izin ver" hint text — do not ship a dead `<a href="#">`.

P3 — konum hatası davranışı — design (1387–1389 vs 1400): the geolocation error is bound to the location block; app matches (LocationField.tsx:66 hard-wires it to the denied branch, consistent with useOwnLocation.ts:35–40).

## 4. W4b · Katıl hata 390 (design 4126–4174)

The P1 too-far card is filed under §1 (same component, both widths).

P2 — 409 halindeki ekran ayarı — design (4133 gap 11px, 4138 h1 26px, badge row **removed**, 4162 `.fade`): when the error card appears the screen tightens — badges dropped, title shrunk to 26px so the card fits above the fold; app: `JoinIntro` always renders badges (JoinIntro.tsx:43–46) at a fixed 34px title; fix: accept, or pass a `compact` flag to `JoinIntro` when the too-far error is set.

P3 — CTA yığını aralığı — design (4164): `.cta` gap 8px between the error card and the Katıl button; app: form gap 15px (JoinFormFields.tsx:30); fix: `gap-2` inside the CTA wrapper once it is extracted per §2.

## 5. W4b · Katıl hata 1280 (design 4176–4268)

P2 — "host çevrimdışı" notunun biçimi ve yeri — design (4252–4255): an amber card in the **right** zone — `background:var(--amb-w)`, `border-color:#F3DDB0`, a 19px `ph-moon-stars` glyph in `--amb`, sentence in `.mi` at `--ink`; app (JoinIntro.tsx:48–50): the same sentence as a plain 13px `<Note>` in the **left** zone under the subtitle, no icon, no ground, no border; fix: move the `hostOnline === false` branch out of `JoinIntro` into the right zone (render from JoinForm.tsx:144 above `WhoIsHere`'s children) as `<div className="flex items-center gap-2.5 rounded-card border border-[#f3ddb0] bg-amber-wash p-[0.75rem_0.875rem]"><MoonStars size={19} className="flex-none text-amber-ink" /><span className="text-[0.75rem] text-ink">…</span></div>`. Copy already matches (`join.hostAway`, all three locales).

P2 — "Kimler var" kartının içeriği — design (4229–4250): in this state the card is a per-person roster — avatar (presence dot / `pulse` ring), name in `.lb` bold, a second line ("Host · çevrimdışı", "Konum bekleniyor…") and a state badge (`g-gr` Hazır / `g-am` Bekliyor); app (WhoIsHere.tsx:22–31): a single avatar strip plus one summary sentence, identical in every state; fix: extend `WhoIsHere` with a row layout — `displayName`, `host` and `hasLocation` all exist on `PreviewParticipantDto` (api-types.ts:921–925) and `waiting.host` / `waiting.ready` / `waiting.waitingBadge` / `waiting.waitingLocation` already exist in all three locales. **Data caveat:** the per-participant online dot has no field — `PreviewParticipantDto` carries no presence flag; only session-level `SessionPreview.hostOnline` (api-types.ts:938) exists, so only the host row can honestly show "çevrimdışı". Do not render dots for the others.

P3 — harita yüksekliği — design (4256): 250px in this state (vs 290px in W4); app: single fixed default (MapFrame.tsx:15, 320px); fix: covered by the `heightClass` change in §1.

## 6. W11a · Katıl EN (design 2915–2992)

Checked against `src/i18n/locales/en.json`. Matching exactly: `join.invitedBy` (2932), `activity.COFFEE` (2934), `join.joinedCount` (2935), `join.subtitle` (2937), `join.nameLabel`/`namePlaceholder` (2940–2941), `join.whereLabel` (2944), `join.useMyLocation` (2945), `join.or` (2946), `join.addressPlaceholder` (2947), `travelMode.question` (2950), `join.submit` (2960), `join.privacy` (2961), `waiting.who` (2966), `waiting.readyCount` (2967), `join.whoCopy` (2975), `join.hand` (2988). The disabled Join button on an empty name (2960) matches JoinFormFields.tsx:53.

P3 — "Walking" / "Walk" — design (2952): the first segment reads **Walking**; app (`en.json` `travelMode.WALK.name` = "Walk", surfaced at TravelModeField.tsx:35); fix: change `travelMode.WALK.name` to "Walking" in `en.json` — it also feeds `travelMode.selected` and every `aria-label`, and reads correctly in both.

P3 — harita kapsülü — design (2984): "Locations appear on the map once you join."; app: `map.midpointPending` = "The midpoint settles once you join"; fix: same new key as §1.

## 7. W11b · Katıl NL (design 3084–3161)

Checked against `src/i18n/locales/nl.json`. Matching exactly: `join.invitedBy` (3101), `activity.COFFEE` (3103), `join.joinedCount_other` "3 doen mee" (3104), `join.subtitle` (3106), `join.nameLabel`/`namePlaceholder` (3109–3110), `join.whereLabel` (3113), `join.useMyLocation` (3114), `join.or` (3115), `join.addressPlaceholder` (3116), `travelMode.question` (3119), `join.submit` (3129), `join.privacy` (3130), `waiting.who` (3135), `waiting.readyCount` (3136), `join.whoCopy` (3144), `join.hand` (3157).

P2 — NL ulaşım türü etiketleri — design (3121–3125): the chips read **Lopend · Fiets · E-bike · OV · Auto** — bare nouns sized for a five-up segmented control; app (`nl.json` `travelMode.*.name` = "Lopend", "Met de fiets", "Met de e-bike", "Met het OV", "Met de auto", rendered at TravelModeField.tsx:35): four of five carry the preposition, roughly doubling chip widths at ≥1024 and forcing a wrap; fix: set `travelMode.{BIKE,EBIKE,TRANSIT,CAR}.name` to "Fiets" / "E-bike" / "OV" / "Auto" in `nl.json`. The `.coming` variants ("komt met de fiets") already carry the preposition and must stay untouched; `travelMode.selected` still reads naturally ("Auto geselecteerd").

P3 — harita kapsülü — design (3153): "Locaties verschijnen op de kaart zodra je meedoet."; app: `map.midpointPending` = "Het middelpunt wordt duidelijk zodra je meedoet"; fix: same new key as §1.
