# Design parity audit — Report A (W0 Landing 1280/390, W1 Oturumlar 1280/390-boş)

Design: `web-v3.html` (shared CSS 20–571; v3 override block 386–397).
App root: `/Users/mehmetserefoglu/projects/bumpinto/frontend/web` (paths below relative to it).

Token check: `src/styles/app.css:9-47` maps 1:1 onto the design `:root` block, and all four v3 overrides are present — `.ov` 11.5px/ink2 (`Overline.tsx:7`), `.bg` 12px (`Badge.tsx:17`), `.g-am` #7E4F06 / `.g-fl` #C41C4B (`app.css:29-30`). No token drift.

---

## W0 · Landing (1280) — design 595–648

P1 — Apple sign-in butonu — design (582, 620-623): sign-in column has exactly two children, the white `.btn.b-wh` Google button and the centered `.mi` terms line; the notes block states "Kaldırılan: Apple girişi (backend yok)"; app (SignInBlock.tsx:11-12): renders `<GoogleSignIn />` AND `<AppleSignIn />` (a second full-width 52px pill, AppleSignIn.tsx:57+), pushing the fold ~62px lower; fix: drop `<AppleSignIn />` from SignInBlock, or amend the artboard — the App Store 4.8 rationale in AppleSignIn.tsx:1-4 is a product decision the design has not absorbed. Design/app conflict, needs an owner decision.

P2 — Google butonu görünümü — design (621; CSS 129-140): `.btn.b-wh` — 52px min-height, full-width pill, `--fh` 16px/700, 1.5px `--line2`, sh1, 18px conic `.gg` swatch, "Google ile devam et"; app (GoogleSignIn.tsx:59-61): Google Identity Services renders its own button (theme outline, size large, shape pill, width 340) — Roboto, ~44px tall, Google's own mark; app only reserves `min-h-[3.25rem]` on the wrapper (GoogleSignIn.tsx:69); fix: no fix available without breaking GIS policy (documented GoogleSignIn.tsx:1-2) — record as an accepted deviation in the design INDEX so it stops re-surfacing.

P2 — içerik genişliği — design (CSS 93): `.wrap{max-width:1120px;padding:34px 48px 44px}` → two-zone grid is 1024px wide at 1280; app (Page.tsx:56,61): `lg:max-w-[80rem] xl:max-w-[96rem]` + `xl:px-12` → content box is 1184px at a 1280 viewport, 64px wider, so the 58/42 columns and the polaroid fan sit further apart; deliberate per Page.tsx:1-3; fix: `lg:max-w-[70rem]` for parity, otherwise record as accepted deviation.

P3 — `.mark` nokta konumları — design (613-614): dots at `left:0;top:18px` and `right:0;bottom:14px`; app (app.css:342-349): `top:0.75rem` (12px) and `bottom:0.625rem` (10px); fix: `top:1.125rem` / `bottom:0.875rem`.

P3 — koşullar satırı puntosu — design (622): `.mi` = 12px (CSS 109); app (Note.tsx:7): `text-[0.8125rem]` = 13px, i.e. `.cp` not `.mi`; fix: add a `small` prop to `Note` (or `text-[0.75rem]`) — the same atom is reused for `sessions.retention`, which the design also sets to `.mi` (760).

P3 — el yazısı notu — design (619 + CSS 113): `.hand` 20px/600, rotate(-2deg); app (HandNote.tsx:7): `text-[1.1875rem]` (19px), `-rotate-[1.5deg]`; fix: `text-[1.25rem] -rotate-[2deg]`.

Verified matching (no finding): confetti positions/count incl. violet dot being 1280-only (598-600 vs Confetti.tsx:14-18); `.mark` size/ring/pin (app.css:319-371); h1 46px (Heading.tsx:7); `.bd.m2` 17px/40ch (Lead.tsx:6); left zone gap 18 / right zone gap 26 (TwoZone.tsx:13-15, Landing.tsx:22); `.two` 58/42 + 40px gap (TwoZone.tsx:5,45); vertical centering (Page.tsx:62, TwoZone.tsx:47); the entire polaroid fan (626-638 vs PolaroidFan.tsx:14-46 — 180/240px widths, 8/8/22 and 10px paddings, 130/160px photos, 24/16px radii, opacity .7, sh1/sh2, rotations, sticker at -8/-14px); StepList.tsx (28px sun numbers, 14px/600 + 12px ink2, 12px gaps); anonymous top bar = wordmark + language pill only (TopBar.tsx:23-29); 64px bar / 48px padding (TopBar.tsx:10-11).

---

## W0 · Landing (390) — design 649–676

P1 — giriş bloğunun yeri — design (659-673): the frame is split — `.scroll` (CSS 98) vertically centers mark + h1 + lead + hand, and a separate `.cta` block (CSS 99, `padding:12px 18px 14px`) pins the Google button + terms line to the BOTTOM of the viewport, outside the scroll region; app (Landing.tsx:22-31): `SignInBlock` is the last child of TwoZone's left zone, so on mobile the button flows right under the hand note and the whole stack including the button is vertically centered by `Page center` (Page.tsx:62) — the CTA sits mid-screen, not thumb-reachable; fix: move `<SignInBlock />` out of TwoZone into a `<MobileCta>` sibling for <1024 and keep it in the left zone only at `lg:` — mirror the MobileCta / DesktopOnly pair already used by SessionsPage (MobileCta.tsx:4-11).

P2 — yatay boşluk — design (659): `.scroll` overridden to `padding:0 26px`; app (Page.tsx:13): `landing` variant uses `px-[1.125rem]` (18px) at all widths; fix: `px-[1.625rem] lg:px-8 xl:px-12` for the `landing` variant.

P3 — mark → başlık boşluğu — design (660): `.mark` carries `margin-bottom:26px` and `.scroll` gap is forced to 0, so rhythm comes from per-element margins (16px lead, 14px hand); app (TwoZone.tsx:53): mobile left zone is a uniform `gap-4` (16px); fix: `max-lg:mb-[0.625rem]` on `<MapMark />` in Landing.tsx:24, or accept.

Verified matching: h1 40px at 390 / 46px at ≥1024 (Heading.tsx:7); lead 16px/30ch (Lead.tsx:6); right zone hidden below 1024 (Landing.tsx:22 `rightLgOnly`, TwoZone.tsx:62); two confetti dots, violet hidden (Confetti.tsx:17); `.bar.m` 56px / 18px padding (TopBar.tsx:10-11); Turkish copy landing.title/copy/hand/google/terms identical to design 666-672.

---

## W1 · Oturumlar (1280) — design 677–765

P1 — katılımcı avatar yığını — design (703-708, 719-723): each open-session card ends with a row whose left group is an overlapping avatar stack (`.av.av-s` 29px, `margin-left:-9px`, gradient monograms; the second card uses `.av-wt` — dashed grey — for the participant who has not shared a location) followed by the `.cp.tab` progress sentence, CTA pushed right; app (SessionCard.tsx:60-61): the left slot is a single `<Badge>{t("sessions.people")}</Badge>` — no avatars at all; API: `frontend/shared/src/api-types.ts:900-920` — `SessionSummaryDto` exposes only participantCount / readyCount / doneCount, with NO participant identities, display names, initials or per-person ready flags, so the monogram stack and the `.av-wt` waiting state CANNOT be built from the current contract; fix: either (a) add a `participants[]` projection (displayName + hasLocation) to SessionSummaryDto and render `Avatar size="sm"` with `-ml-[9px]` overlap and `waiting` for `!hasLocation`, or (b) amend the artboard to the count badge the API supports. Do not synthesize placeholder avatars from participantCount.

P1 — geçmiş satırı küçük görseli — design (734): `<div class="pho pA" style="width:48px;height:48px;border-radius:14px">` — a bare 48×48 gradient tile, no frame, no padding; app (PastSessionRow.tsx:19-29 → VenueCard.tsx:216-231): `photoOnly` has NO early return in VenueCard, so it falls through to the polaroid root `"relative flex w-full flex-col rounded-3xl bg-white p-2.5"` + `border border-line` — inside the 48px box that leaves a ~26px gradient with `rounded-2xl` floating in a white 24px-radius bordered card; fix: in PastSessionRow replace the VenueCard call with a plain tile — `<div className={"h-12 w-12 flex-none overflow-hidden rounded-[0.875rem] " + PHOTO_CLASSES[…]}>` plus the optional `<img>` — or give VenueCard a real `photoOnly` branch that returns only the photo box.

P2 — kart içi sıra (ilerleme / sayaç) — design (701-712): `.prog` first (`margin-bottom:14px`), then a single space-between row with [avatars + "2/3 bitirdi"] left and the CTA right; app (SessionCard.tsx:40-59): the sentence is rendered ABOVE the Progress bar inside a `mb-3.5 flex flex-col gap-2` wrapper, and the bottom row is [Badge | CTA] — three stacked blocks instead of two; fix: move `<Progress>` above the sentence, then move the sentence into the bottom flex row next to the (future) avatar stack.

P2 — sayaç tipografisi — design (709, 724): `.cp.tab` = 13px, line-height 1.45, ink2, inline `font-weight:600`; app (SessionCard.tsx:43,50,57): `text-[0.75rem] text-ink2 tabular-nums` — 12px, weight 400; fix: `text-[0.8125rem] font-semibold leading-[1.45]`.

P2 — yasal altbilgi — design (679-764): the `.dk` frame contains only browser chrome, `.bar` and `.wrap`; no footer nav in any W0/W1 artboard; app (AppShell.tsx:28-35): a persistent 4-link legal footer (Gizlilik / Koşullar / Veri hakları / Destek) renders under every page including Landing and Oturumlar; fix: almost certainly a legal requirement the artboards omit — add the footer to the design-system shell rather than removing it from the app; confirm with the design owner.

P2 — yükleme durumu — design: no W1 loading artboard, but the shared vocabulary ships the shimmer primitive `.sk` (CSS 558-560) precisely for this; app (SessionsPage.tsx:18): `if (!loaded) return null;` — the page area is completely blank under the top bar until GET /api/sessions resolves; fix: render PageHeader immediately and swap the two-zone body for two or three skeleton cards (reuse the shimmer from VenueRowSkeleton.tsx).

P3 — geçmiş listesi kart iç boşluğu — design (732): `.card` with `padding:4px 2px`; app (PastSessionList.tsx:8): `py-0.5` (2px) and no horizontal padding; fix: `py-1 px-0.5`.

P3 — saklama notu puntosu — design (760): `.mi` = 12px; app (SessionsPage.tsx:36 → Note.tsx:7): 13px; fix: same Note size fix as the Landing terms line.

P3 — hata metni rengi — design (CSS 116): `.err{font-size:13px;color:var(--flame-deep);font-weight:600}`; app (ErrorText.tsx:6): `text-[0.8125rem] text-[#c0392b]`, weight 400 — #c0392b is the `.b-dg` danger-button colour (CSS 136), not the error-text token; fix: `text-flame-deep font-semibold`.

Verified matching: `.hdr` flex/items-end/space-between/gap-20 (PageHeader.tsx:6); header CTA `.btn.b-fl.fit` + 18px plus icon, desktop-only (SessionsPage.tsx:24, PageHeader.tsx:8); h1 46px with `<br>` (tr.json sessions.title); `.ov` overlines (Overline.tsx:7); open card padding 20/22, radius 22, active 1.5px flame-deep + sh2 / inactive 1px line + sh1 (SessionCard.tsx:26-29); sticker at right:16/top:-13, sun, -2.5° (SessionCard.tsx:32-34, Sticker.tsx:5-17); title `.h2` 21px + mb 4px, subtitle `.cp` + mb 14px (SessionCard.tsx:36-39); `.prog` 7px/4px/#F0E9E0 + gradient fill (Progress.tsx:4-8); `.srow` 13/16 padding + 12px gap (PastSessionRow.tsx:18); `.dv` margin 0 16px (PastSessionList.tsx:11); `.h3` 17px + `.mi` 12px date line (PastSessionRow.tsx:32-35); `.bg g-gr` / `g-ne` badges 4.5/11, 12px, 700 (Badge.tsx:17); undecided row opacity .65 (PastSessionRow.tsx:18); nav `.nl.on` 15px/700 + sand pill + 34px ringed avatar (TopBar.tsx:12,24; Avatar.tsx:16,21); all Turkish copy matches.

---

## W1 · Oturumlar (390, boş durum) — design 766–796

P3 — üst çubuk avatarı — design (774): the 390 frame shrinks the avatar to `width:32px;height:32px;font-size:12px` (vs 34/13 at 1280, line 686); app (Avatar.tsx:16): `sm` is a fixed `h-[2.125rem] w-[2.125rem] text-[0.8125rem]` (34/13) at every breakpoint; fix: `h-8 w-8 text-[0.75rem] lg:h-[2.125rem] lg:w-[2.125rem] lg:text-[0.8125rem]` on the `sm` size.

P3 — boş durum kartı iç boşluğu — design (779): `padding:26px 22px`; app (EmptySessions.tsx:10): `px-6 py-9` = 24px horizontal / 36px vertical, 10px taller per side; fix: `px-[1.375rem] py-[1.625rem]`.

P3 — boş durum metni satır genişliği — design (787): `.cp` with `max-width:26ch`, which is what keeps the three-line ragged block centered; app (EmptySessions.tsx:13 → Note.tsx:7): no max-width, so at ≥1024 (where the app also uses this component — the design has no 1280 empty artboard) the sentence runs the full card width; fix: wrap in `max-w-[26ch]`.

Verified matching: h1 34px at 390 (app.css:231-236); no header CTA below 1024 (PageHeader.tsx:8); bottom-pinned full-width `.btn.b-fl` + plus icon (SessionsPage.tsx:39-41, MobileCta.tsx:5 `mt-auto … lg:hidden`); card 22px radius / 1px line / white / sh1, centered column, 12px gap (EmptySessions.tsx:10); mark → h2 → cp → hand order (EmptySessions.tsx:11-14); Turkish copy sessions.emptyTitle / emptyCopy / emptyHand identical to design 786-788; `.bar.m` wordmark + language + avatar (TopBar.tsx:22-29).

---

## API-gated items

- Participant monogram / `.av-wt` waiting avatar stack on open-session cards: `SessionSummaryDto` (frontend/shared/src/api-types.ts:900-920) carries counts only — no per-participant data. Needs a contract change before the design can be implemented; the app is correct not to fake it.
- Everything else in these four artboards is renderable from existing fields (name, activityTypes, sessionType, status, createdAt, participantCount, readyCount, doneCount, decidedVenueName, decidedVenuePhotoUrl).
