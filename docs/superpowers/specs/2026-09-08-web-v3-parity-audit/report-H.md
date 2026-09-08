# W7 / W7b Runoff — design parity findings (P1: 11, P2: 10)

Design: scratchpad/web-v3.html · App: frontend/web
Token map (src/styles/app.css:8-46) is 1:1 with the design :root. All findings are usage-level.

API reality check (frontend/shared/src/api-types.ts:669-726): ParticipantDto.online / lastSeenAt / inVoice EXIST → presence dots and offline dimming are implementable. SessionView.voteTally is venue→count only and runoffVotedParticipantIds is a flat id list — there is NO per-participant→venue mapping, so the W7b/1280 "who voted for what" column is NOT implementable without a backend field. Do not fake it.

## 1. W7 · Runoff 1280 (design 2359-2445)
- P1 Finalist card travel widget — design (2386,2402): compact `.rg` range bar + one `.rg-g` fairness line; app (VenueCard.tsx:243, RunoffList.tsx:36-43): polaroid variant renders TravelBars (per-person `.tb`). fix: pass travelBars={false} from RunoffList and render <RangeBar venue={v} travel={travel} /> in the card body (mirror VenueCard.tsx:146), or add travelWidget="range"|"bars".
- P2 Title level — design (2382) venue name is `.h3` 17px/700; app (VenueCard.tsx:198) <h2 className="text-[1.25rem]"> 20px. fix: render <h3>{v.name}</h3>.
- P2 Page copy under h1 — design (2375): `.bd m2` 16px/1.5 ink2, max-width 48ch, "İkisini de herkes beğendi — tek seçim hakkın var."; app (RunoffIntro.tsx:35 → Note.tsx:7) 13px, no max-width, always the 390 string. fix: max-w-[48ch] text-[0.8125rem] leading-normal text-ink2 lg:text-base + runoff.copyWide key.
- P2 h1 size — design 1280=40px with margin-top:-6px, 390=26px; app (RunoffIntro.tsx:28) mt-1.5 text-[1.8125rem] everywhere. fix: -mt-1.5 text-[1.625rem] lg:text-[2.5rem].
- P2 Roster avatar size — design (2420,2426,2432) `.ring > .av.av-s` = 29px/12px; app (PersonRow.tsx:23 → Avatar.tsx:15-18) md=44px/16px. fix: add xs size to Avatar (h-[1.8125rem] w-[1.8125rem] text-[0.75rem]) + ringPad, forward from PersonRow (RunoffStatus.tsx:72).
- P3 Right-card order — design (2437-2438) CTA "Seçimimi kilitle" BEFORE the `.mi` note; app (RunoffStatus.tsx:86-89) note first.
- P3 Overline — design un-locked (2414) "Kim kilitledi" vs locked (3705) "Kim seçti"; app has one key runoff.who. fix: add runoff.whoLocked, branch on props.sent.
- P3 Trailer — design (2389,2405) `.f-trail` 12px/500 ink2 left-aligned INSIDE the card, only the gap value in `.f-win`; app (RunoffTrailer.tsx:16-21, RunoffList.tsx:45) sibling below the card, centered, bold, whole line amber. fix: move inside card body, text-left text-[0.75rem] font-medium text-ink2 tabular-nums, wrap only gap in bg-amber-wash px-[0.3125rem] text-amber-ink.
- P3 "Herkese ~aynı" grass badge on the fairer card + invisible twin (design 2390) — absent (optional, §4.8 argues against badge soup).
- P3 Card padding/radius — design (2377) padding 12px, radius 22px; app (VenueCard.tsx:163) p-2.5, rounded-3xl. fix: p-3 rounded-card.

## 2. W7 · Runoff 390 locked (design 2446-2515)
- P1 Provider attribution entirely absent on mobile — design (2494-2497) centered `.f-attrs` row; app (VenueCard.tsx:87-155) row variant returns before Attribution (line 244) and RunoffScreen.tsx:97-104 renders none. LICENSING ISSUE. fix: in RunoffList render one <Attribution providers={[...new Set(finalists.map(v=>v.provider).filter(Boolean))]} center /> after the lg:hidden list.
- P1 Non-selected finalist not de-emphasised after locking — design (2473) opacity .75; app (RunoffList.tsx:49-69) disabled only blocks clicks. fix: opacity-75 when disabled && choice && choice !== v.id.
- P2 Range bar nested in the text column instead of spanning the card — design (2466-2470) `.rg`+`.rg-g` full-width below the photo/name/check row; app (VenueCard.tsx:129-147) inside the flex-1 column. fix: move RangeBar out as a sibling of the flex items-center row with gap-2.
- P2 Locked-state page copy not swapped — design (3653) "Seçimin kilitli — sonuç herkes kilitleyince açıklanır."; app (RunoffIntro.tsx:29-35) sent switches only the title. fix: add runoff.copySent.
- P3 Count wording — design (2490-2492) "2 / 3 kilitledi"; app runoff.votedCount "{{done}}/{{total}} seçti".
- P3 Photo tile — design (2459,2474) 70x70 radius 16 tilt ∓2.2°; app 74x74 ∓2.0°.
- P3 Card padding/gap — design padding 12px gap 9px; app p-[0.875rem] gap-3.
- P3 Lock card padding — design mobile 14/16, desktop 16/18; app one value (RunoffStatus.tsx:43).
- P3 Reminder icon — design (2510) ph-paper-plane-tilt; app ShareNetwork (ShareButton.tsx:99-102).
- P3 Lock dot shadow — design `.f-lockdot` 30px white circle with sh1; app `.c-check` (app.css:297-315) no shadow.

## 3. W7 · Runoff 1280 locked, v3 presence (design 3637-3736)
- P1 The whole roster card disappears when the viewer locks — design (3694-3730) keeps BOTH `.f-lockcard` AND the full "Kim seçti" card (2/3 counter, progress, three rows with badges, "Hatırlatma gönder" inside the card, closing note); app (RunoffStatus.tsx:36-55) sent branch returns only a centred count + lock card + share button. fix: stop early-returning; render the lock card above the roster card when sent, keep roster/progress/rows in both states, swap the in-card CTA to the reminder ShareButton (design 3728).
- P1 Presence dots missing on roster avatars — design (3711,3717,3723 + `.avw/.od` 438-441) 12px grass dot, 2px white border, bottom-right; app (RunoffStatus.tsx:72 → PersonRow.tsx:21-27) bare Avatar. Data exists; markup already at ParticipantRow.tsx:56-72. fix: add presence prop to PersonRow (online = p.online !== false && !p.manual).
- P1 Losing finalist not dimmed when locked — design (3671) `.f-dim` opacity .48 saturate .55; app (RunoffList.tsx:26-48) no state styling on the desktop grid.
- P2 Attribution per-card and vertical instead of one horizontal row under the grid — design (3688-3691) single `.f-attrs` row (gap 16px, padding 6px 10px 0), 11px ink2; app (VenueCard.tsx:244 → Attribution.tsx:18-20) inside each polaroid, flex-col, duplicated. fix: attribution={false} on the polaroid card, one <Attribution> after the grid, Attribution.tsx:18 → flex flex-row flex-wrap gap-4 (keep flex-col behind a stacked prop).
- P3 Google glyph missing (design 3689 ph-google-logo). NOTE the app is data-driven off /api/config.sources filtered by venue.provider — a Foursquare-only deck legitimately prints one line; do not hardcode both.

## 4. W7b · Berabere 390 (design 4341-4406)
- P1 Tie is not the page headline — design (4356-4358) overline "Oylama bitti", h1 "Berabere" 30px, copy "Herkes seçti ve berabere kaldı. Buluşmayı sen kurdun, son sözü sen söylüyorsun."; app (RunoffScreen.tsx:87-96) keeps the normal runoff title; "Berabere" is a 14px label in the right-zone amber card (RunoffTie.tsx:36). fix: RunoffIntro gains a tie prop (runoff.tieOverline / tieTitle / tieHostCopy / tieGuestCopy); drop the standalone Note at RunoffScreen.tsx:96.
- P1 Primary/secondary inverted and mislabelled — design (4400-4401) primary flame "<ph-scales> Adil olana bırak", secondary white "Kararı ben vereyim"; app (RunoffTie.tsx:45-52) primary = "Kararı ver" (disabled without a choice), secondary = "Adil olana bırak", no Scales icon. This reverses the product's fairness default. fix: onFair first as kind="flame" with <Scales size={18} aria-hidden />, onDecide second as kind="white"; rename runoff.tieDecide → "Kararı ben vereyim".
- P2 Per-finalist "1 oy" badge — design (4368,4383) `.bg g-ne` in each card header; app (RunoffTie.tsx:42 → VoteTally.tsx:19-30) separate right-column list. Data exists (voteTally). fix: thread tally into RunoffList/VenueCard, render <Badge tone="neutral"> in place of the check circle in the tie state; VoteTally can then be dropped.
- P2 Handwritten nudge missing — design (4392) `.hand` "adil olana bırak, kimse üzülmez →" at -1.5° above the CTA. fix: <HandNote> when tie && host.
- P2 Attribution missing (mobile tie screen) — design (4393-4396).
- P2 Actions belong in the sticky bottom CTA — design (4398-4402); app has them inside the amber card in normal flow.
- P3 Tie cards keep the check circle and flame selection border (design 4426-4434 has neither).
- P3 Session header row (design 4348-4352): RunoffScreen never renders SessionHeader.
- P3 Tie card geometry: design 56x56 photo, radius 14, padding 12/14, no tilt.

## 5. W7b · Berabere 1280 (design 4407-4489)
- P1 "Oylar" roster with per-person choice NOT implementable — design (4463-4480) every voter with the venue they picked, non-voter row `.off` + "seçmedi · çevrimdışı". SessionView has no participant→venue map, and it contradicts runoff.note ("kim neyi seçti, sonuçta belli olur"). fix: do NOT fake. Either add runoffVotes:{[participantId]:venueId} to SessionView (only after the runoff ends), or render only the voted / did-not-vote split, which IS derivable from runoffVotedParticipantIds + online.
- P1 Offline voter row not dimmed, no "seçmedi · çevrimdışı" — design (4476-4480); PersonRow has no away handling (pattern exists at ParticipantRow.tsx:37,54,99-104). Data exists.
- P1 Tie headline/overline desktop — design (4421-4423) h1 40px with margin-top -6px, copy max-width 48ch.
- P1 CTA placement/order desktop — design (4452-4453) both buttons in the LEFT zone side by side, .fit padding 0 32px, flame "Adil olana bırak" (scales) first; app stacks them full-width inside the right-zone amber card in the opposite order.
- P2 Per-finalist "1 oy" badge (desktop), P2 hand note (desktop, design 4450), P2 attribution row below the CTA row (design 4455-4458).
- P3 tie cards keep chk/flame border; P3 tie card travel widget should be `.rg`; P3 HandNote 20px vs app 19px.

## Cross-cutting
- RunoffScreen.tsx:107-132 funnels every non-tie state to RunoffStatus and every tie state to RunoffTie. Both P1s in §3 and §5 stem from that switch discarding the roster. Make the roster card (Overline + counter + Progress + PersonRow list) a shared child rendered in ALL three states (choosing / locked / tie), with the state-specific card (f-lockcard / amber tie card) stacked above it — exactly what artboards 2359, 3637 and 4407 show.
- PersonRow (RunoffStatus) and ParticipantRow (lobby) have diverged: only the latter knows presence, offline dimming and lastSeenAt. Three P1s are "the presence code exists, just not in this component" — extracting a shared PresenceAvatar closes §3 and §5 in one change.
- Everything reported is layout/props level; no new design tokens are needed.
