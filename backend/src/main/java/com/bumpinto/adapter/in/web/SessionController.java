package com.bumpinto.adapter.in.web;

import com.bumpinto.application.deck.DeckFlow;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.session.MeetCheckins;
import com.bumpinto.application.session.SessionCommands;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.PresenceStampsPort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.OpenPlan;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.infra.security.ParticipantPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
class SessionController {

    private final SessionCommands commands;
    private final DeckFlow deckFlow;
    private final SessionQueries queries;
    private final SessionViewAssembler assembler;
    private final ParticipantTokenDelivery tokens;
    private final UserProfileQueries profiles;
    private final PresenceStampsPort stamps;
    private final MeetCheckins checkins;
    private final Clock clock;

    SessionController(SessionCommands commands, DeckFlow deckFlow, SessionQueries queries,
                      SessionViewAssembler assembler, ParticipantTokenDelivery tokens,
                      UserProfileQueries profiles, PresenceStampsPort stamps,
                      MeetCheckins checkins, Clock clock) {
        this.commands = commands;
        this.deckFlow = deckFlow;
        this.queries = queries;
        this.assembler = assembler;
        this.tokens = tokens;
        this.profiles = profiles;
        this.stamps = stamps;
        this.checkins = checkins;
        this.clock = clock;
    }

    @GetMapping
    ApiDtos.SessionListResponse mine(@AuthenticationPrincipal Jwt jwt) {
        return assembler.toList(profiles.mySessions(WebPrincipals.accountId(jwt)));
    }

    @PostMapping
    ResponseEntity<ApiDtos.CreateSessionResponse> create(@AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client,
            @Valid @RequestBody ApiDtos.CreateSessionRequest request) {
        // Capali oturumda lat/lng gelmeyebilir: dogrudan new GeoPoint(...) unboxing NPE
        // atardi (500), oysa dogru cevap konumsuz host'tur.
        GeoPoint hostLocation = request.lat() == null || request.lng() == null
                ? null : new GeoPoint(request.lat(), request.lng());
        SessionCommands.Anchor anchor = request.anchor() == null ? null
                : new SessionCommands.Anchor(
                        new GeoPoint(request.anchor().lat(), request.anchor().lng()),
                        request.anchor().label());
        SessionCommands.CreateSessionResult result = commands.createSession(
                WebPrincipals.accountId(jwt), request.name(), request.activityTypes(),
                request.sessionType() == null ? SessionType.GROUP : request.sessionType(),
                hostLocation, request.displayName(),
                request.locationLabel(), request.travelMode(), anchor, openPlanOf(request));
        // Host da bir katılımcıdır: token'ı katılımdaki kuralın AYNISIYLA teslim edilir.
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED);
        String bodyToken = tokens.deliver(response, client, result.session().slug(),
                result.hostParticipant());
        return response.body(new ApiDtos.CreateSessionResponse(result.session().slug(),
                result.session().id(), result.hostParticipant().id(), bodyToken,
                result.session().expiresAt()));
    }

    /**
     * Girdi -> domain. Kapasite ve politika opsiyoneldir: null -> 4 / APPROVAL. Varsayilan
     * APPROVAL, cunku Kesfet YABANCILARA aciktir ve host'un kimi aldigina karar hakki engel
     * listesinden ONCE gelen ilk savunma katmanidir.
     */
    private static OpenPlan openPlanOf(ApiDtos.CreateSessionRequest request) {
        ApiDtos.OpenPlanInput in = request.openPlan();
        return in == null ? null : new OpenPlan(in.meetAt(),
                in.capacity() == null ? OpenPlan.DEFAULT_CAPACITY : in.capacity(),
                in.joinPolicy() == null ? JoinPolicy.APPROVAL : in.joinPolicy());
    }

    /**
     * "Bulustunuz mu?" — kimlik KATILIMCI token'idir (oda ici kural), seat-request uclarinin
     * aksine: cevabi veren kisi zaten koltuk sahibidir.
     */
    @PostMapping("/{slug}/checkin")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void checkin(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
            @Valid @RequestBody ApiDtos.CheckinRequest request) {
        checkins.record(slug, WebPrincipals.participantId(me), request.met());
    }

    /**
     * Koddan ONIZLEME (R-B9). Kamu ucudur: kod elle yazilir ve yazan kisi henuz uye degildir.
     * Onizleme koordinat, katilimci id'si ve mekan TASIMAZ; {@code joinCode} de donmez —
     * koda karsi kod aramasina izin verilmez (§2).
     */
    @GetMapping("/by-code/{code}")
    ApiDtos.SessionPreview byCode(@PathVariable String code) {
        return assembler.toPreview(queries.snapshotByJoinCode(code));
    }

    /**
     * Oturumun İÇİ yalnızca ÜYESİNE açıktır. Kimlik doğrulanmış olmak yetmez: önceden bu uç
     * her oturum açmış hesaba 200 + {@code viewer:null} dönüyordu, yani slug'ı ele geçiren
     * herhangi bir hesap katılmadan katılımcı listesini ve yaklaşık konumları okuyabiliyordu.
     * Katılmamış birine açık olan tek şey public önizlemedir ({@code /preview}) — koordinat,
     * katılımcı id'si ve mekân taşımaz.
     *
     * <p>Üyeyi dışarıda bırakmaz: katılımcı çerezi olmayan bir tarayıcıda bile hesap JWT'si
     * koltuk sahipliğinden çözülür ({@link WebPrincipals#seatOf}) ve çerez aynı yanıtta
     * yeniden yazılır.
     */
    @GetMapping("/{slug}")
    ResponseEntity<ApiDtos.SessionView> view(@PathVariable String slug, Authentication auth,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        SessionQueries.SessionSnapshot snapshot = queries.snapshot(slug);
        if (WebPrincipals.viewerOf(snapshot, auth) == null) {
            // Görünüm ÜRETİLMEDEN reddedilir: aksi halde üye olmayan her istek boşuna tam
            // assemble (mekân başına yol süresi hesabı) yaptırırdı.
            throw new ForbiddenException("not a participant of this session");
        }
        // Kimlik ONARIMI: iki hâli olan tek kapı ve hangisinin geçerli olduğunu anlık görüntü
        // söyler (ek sorgu yok). Hesabın koltuğu VARSA çerez ona göre yeniden yazılır — ama
        // yalnız eldeki token yanlışsa; doğruysa her okumaya Set-Cookie eklemenin anlamı yok.
        // Koltuğu YOKSA elde sahipsiz bir koltuk olabilir: anonim katılıp sonra giriş yapan kişi
        // onu hesabına bağlar ve ikinci cihazda kimliğini kurtarır (K-B23).
        UUID seatInHand = WebPrincipals.participantIdOrNull(auth);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        Optional<Participant> accountSeat = WebPrincipals.seatOf(snapshot, auth);
        if (accountSeat.isPresent()) {
            accountSeat.filter(seat -> !seat.id().equals(seatInHand))
                    .ifPresent(seat -> tokens.refresh(response, client, slug, seat));
        } else {
            commands.claimSeat(snapshot.session().id(), seatInHand,
                    WebPrincipals.accountIdOrNull(auth));
        }
        // Damga assemble'dan ONCE: kisi kendi "linki acti" anini ilk yanitta gorur. Okuma skaler
        // projeksiyondan gelir (PresenceStampsAdapter.stampsOf), o yuzden REQUIRES_NEW'da yazilan
        // deger ayni istekte ESKI haliyle okunmaz.
        markLinkOpened(snapshot, auth);
        return response.body(assembler.toView(snapshot, auth));
    }

    @GetMapping("/{slug}/preview")
    ApiDtos.SessionPreview preview(@PathVariable String slug, Authentication auth) {
        SessionQueries.SessionSnapshot snapshot = queries.snapshot(slug);
        markLinkOpened(snapshot, auth);
        return assembler.toPreview(snapshot);
    }

    /**
     * "Linki acti" = davet ekranini (preview) ya da oturumu ILK KEZ actigi an. Anonim ziyaretcinin
     * koltugu yoktur ve damgalanacak satir da yoktur — sessizce atlanir. Yalniz ilk yazim tutar
     * (SQL'de {@code link_opened_at is null}); sonraki acilislar zamani ilerletmez.
     */
    private void markLinkOpened(SessionQueries.SessionSnapshot snapshot, Authentication auth) {
        UUID seat = WebPrincipals.seatOf(snapshot, auth).map(Participant::id)
                .orElseGet(() -> WebPrincipals.participantIdOrNull(auth));
        if (seat != null && snapshot.participants().stream().anyMatch(p -> p.id().equals(seat))) {
            stamps.markLinkOpened(seat, clock.instant());
        }
    }

    // Oturum uclarinda kimlik TEK turdur: katilimci token'i. Host da bir katilimcidir; hesap
    // JWT'si yalnizca hesap uclarinda (liste, olustur, /api/me) kimliktir.
    @PostMapping("/{slug}/find-venues")
    ApiDtos.SessionView findVenues(@AuthenticationPrincipal ParticipantPrincipal me,
            @PathVariable String slug, Authentication auth) {
        deckFlow.findVenues(slug, WebPrincipals.participantId(me));
        return assembler.toView(queries.snapshot(slug), auth);
    }

    @PostMapping("/{slug}/shuffle")
    ApiDtos.SessionView shuffle(@AuthenticationPrincipal ParticipantPrincipal me,
            @PathVariable String slug, Authentication auth) {
        deckFlow.shuffle(slug, WebPrincipals.participantId(me));
        return assembler.toView(queries.snapshot(slug), auth);
    }

    @PostMapping("/{slug}/force-decision")
    ApiDtos.SessionView forceDecision(@AuthenticationPrincipal ParticipantPrincipal me,
            @PathVariable String slug,
            @RequestBody(required = false) ApiDtos.ForceDecisionRequest request, Authentication auth) {
        deckFlow.forceDecision(slug, WebPrincipals.participantId(me),
                request == null ? null : request.venueId());
        return assembler.toView(queries.snapshot(slug), auth);
    }
}
