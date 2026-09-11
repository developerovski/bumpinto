package com.bumpinto.adapter.in.web;

import com.bumpinto.application.user.UserDataExport;
import com.bumpinto.domain.safety.ReportReason;
import jakarta.validation.constraints.AssertTrue;
import com.bumpinto.domain.user.AuthProvider;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Audience;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.SeatStatus;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.venue.TaglineSource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.UniqueElements;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Girdi hijyeni: uzunluk ve aralık sınırları burada, metin normalizasyonu (kontrol karakteri,
 * boşluk) application katmanındaki {@code Texts}'te. Tırnak/SQL keyword temizleyici YOK —
 * koruma parametrik sorgulardır.
 */
public final class ApiDtos {

    private ApiDtos() {
    }

    /**
     * Token tasiyan DTO'lar default record toString'i ile sirri log'a/hata mesajina sizdirir;
     * bu alanlar maskelenir. Jackson serilestirmesi toString kullanmaz — govde etkilenmez.
     */
    static String masked(String secret) {
        return secret == null ? "null" : "***";
    }

    /**
     * Host'un sabit bulusma noktasi. Lat/lng birlikte zorunlu — yarim capa yok.
     * {@code label} istemcinin Nominatim'den okudugu ad; sunucu ikinci kez cozmez.
     */
    public record AnchorDto(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                            @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                            @Size(max = 80) String label) {
    }

    public record CreateSessionRequest(
                                       /**
                                        * 1-3 ilgi alani, TEKRARSIZ; siralama host'un secim
                                        * sirasidir. Tekrar serbest birakilsaydi cache anahtari
                                        * "COFFEE+COFFEE" olur ve ayni arama ikinci kez satin
                                        * alinirdi — Places butcesi bu isin ana kisiti.
                                        */
                                       @NotEmpty @Size(max = 3) @UniqueElements
                                       List<ActivityType> activityTypes,
                                       @Size(max = 60) String name,
                                       /** null → GROUP (M-1 mobil istemcisi alani gondermez). */
                                       SessionType sessionType,
                                       /** Capa varsa opsiyonel; bkz. {@link #isOriginPresent()}. */
                                       @DecimalMin("-90") @DecimalMax("90") Double lat,
                                       @DecimalMin("-180") @DecimalMax("180") Double lng,
                                       @NotBlank @Size(max = 40) String displayName,
                                       @Size(max = 80) String locationLabel,
                                       /** null → CAR (spec §4.5b varsayilani). */
                                       TravelMode travelMode,
                                       /** null → orta nokta modu (bugunku davranis). */
                                       @Valid AnchorDto anchor,
                                       /**
                                        * B-17: dolu ise oturum ACIK PLAN olur ve Kesfet'te
                                        * listelenir; null ise bugunku GIZLI oturum (davet linki).
                                        */
                                       @Valid OpenPlanInput openPlan) {

        /**
         * Konum ya da capa: ikisinden biri sart. Capali oturumda host kendi konumunu
         * vermeyebilir (isteyen verir, yol suresi ona gosterilir); capasiz oturumda merkez
         * konumlardan turedigi icin host konumu zorunludur.
         */
        @AssertTrue(message = "either location or anchor is required")
        public boolean isOriginPresent() {
            return (lat != null && lng != null) || anchor != null;
        }

        /**
         * lat/lng birlikte gelir ya da hic gelmez. Yarim koordinat bozuk ISTEKTIR: sessizce
         * dusurulurse host konumsuz sayilir ve bunu kimse fark etmez; controller'da
         * new GeoPoint(lat, null) ise unboxing NPE ile 500 verirdi.
         */
        @AssertTrue(message = "lat and lng must be given together")
        public boolean isLocationWhole() {
            return (lat == null) == (lng == null);
        }
    }

    public record CreateSessionResponse(String slug, UUID sessionId, UUID participantId,
                                        String participantToken, Instant expiresAt) {

        @Override
        public String toString() {
            return "CreateSessionResponse[slug=" + slug + ", sessionId=" + sessionId
                    + ", participantId=" + participantId
                    + ", participantToken=" + masked(participantToken)
                    + ", expiresAt=" + expiresAt + "]";
        }
    }

    public record JoinRequest(@NotBlank @Size(max = 40) String displayName,
                              @DecimalMin("-90") @DecimalMax("90") Double lat,
                              @DecimalMin("-180") @DecimalMax("180") Double lng,
                              @Size(max = 80) String locationLabel,
                              /** null → CAR (spec §4.5b varsayilani). */
                              TravelMode travelMode) {
    }

    public record JoinResponse(UUID participantId, String participantToken) {

        @Override
        public String toString() {
            return "JoinResponse[participantId=" + participantId
                    + ", participantToken=" + masked(participantToken) + "]";
        }
    }

    /** travelMode null = mevcut tercihi KORU (konum guncellemesi modu silmez). */
    public record LocationRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                  @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                  @Size(max = 80) String label,
                                  TravelMode travelMode) {
    }

    /** SOLO: host'un elle ekledigi konum. */
    public record PointRequest(@NotBlank @Size(max = 40) String displayName,
                               @Size(max = 80) String locationLabel,
                               @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                               @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                               TravelMode travelMode) {
    }

    public record SwipeRequest(@NotNull UUID venueId, @NotNull Boolean liked) {
    }

    public record RunoffVoteRequest(@NotNull UUID venueId) {
    }

    public record ForceDecisionRequest(UUID venueId) {
    }

    public record GeoPointDto(double lat, double lng) {
    }

    /**
     * Mekanin adalet ozeti (spec §4.1–4.2). {@code spreadMinutes} ekranda yazilan sayidir
     * ("fark N dk"); rozet kurali: fark <= 10 → "Herkese ~aynı".
     *
     * <p>{@code fairness} kendisi (venue seviyesinde) hic konumlu katilimci yoksa {@code null}
     * olur — {@code (0,0,null)} ile karistirilmasin, o durum "herkes tam esit" gibi okunur ve
     * yanlis rozet gosterir. Esitlikte {@code longestParticipantId} haritanin ILK max degeridir
     * (bkz. {@link com.bumpinto.domain.geo.Fairness#of}) — cagiran LinkedHashMap verirse
     * deterministiktir.
     */
    public record FairnessDto(int maxMinutes, int spreadMinutes, UUID longestParticipantId) {
    }

    /**
     * approxLocation: 2 ondalik (~1 km) — tam koordinat API'den asla cikmaz (spec §8 gizlilik).
     *
     * <p>midpointMinutes: kisinin YUVARLANMIS konumundan agirlikli orta noktaya, kendi
     * {@code travelMode}'uyla, 5 dk basamaginda. Konumu yoksa ya da konumlu katilimci
     * 2'den azsa (orta nokta yok) null. Lobi/Bekle orta nokta karti "herkes ~25–35 dk"
     * araligini bu degerlerin min/max'indan yazar (spec §5.C).
     */
    public record ParticipantDto(UUID id, String displayName, boolean host, boolean hasLocation,
                                 boolean deckDone, boolean manual, String locationLabel,
                                 GeoPointDto approxLocation, TravelMode travelMode,
                                 Integer midpointMinutes,
                                 /** Acik soketi var ya da 45 sn icinde koptu; manual satirlarda daima false. */
                                 boolean online,
                                 /** Kendi ses konusuna abone (spec K4); SOLO'da daima false. */
                                 boolean inVoice,
                                 /** Goruntuleyen bu kisiyi engelledi mi; engellenen tarafta daima false. */
                                 boolean blocked,
                                 /** Son WS gelisi/kopusu; hic baglanmamissa null (R-B8). */
                                 Instant lastSeenAt,
                                 /** Daveti ILK actigi an; acmadiysa null. */
                                 Instant linkOpenedAt) {
    }

    /** OSRM T10'a kadar HER yol suresi tahmindir (estimated=true); gercek deger geldiginde degisir. */
    public record TravelDto(UUID participantId, int minutes, boolean estimated) {
    }

    /**
     * mapsUrl: goruntuleyenin ulasim turuyle MapLinks'ten uretilir (spec §10) — "Yol tarifi al"
     * butonu hicbir oturumda olu kalmaz. placeLink: mekanin kendi sayfasi (Maps ya da site).
     * Yol sureleri yalniz {@code travel[]}'da (K-B26: eski {@code travelMinutes} haritasi dustu).
     */
    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           FairnessDto fairness,
                           String provider, String category, String address, String locality,
                           Integer ratingCount, String hoursToday, String placeLink,
                           /** Hangi ilgi alanindan geldigi; atif cozulemediyse null. */
                           ActivityType activityType,
                           Double popularity, Integer ratingScale, List<TravelDto> travel,
                           /** "Neyle bilinir" tek satiri (&lt;=80); veri yoksa null, UI gizler. */
                           String tagline, TaglineSource taglineSource) {
    }

    public record SessionView(String slug, String name, List<ActivityType> activityTypes,
                              SessionType sessionType, SessionStatus status, Instant expiresAt,
                              List<ParticipantDto> participants, List<VenueDto> venues,
                              List<UUID> runoffVenueIds, UUID decidedVenueId,
                              Map<UUID, Long> voteTally,
                              /**
                               * Oturumun merkezi: capaliysa capanin kendisi (katilimci
                               * gerekmez), capasizsa konumu olan &gt;=2 noktanin orta noktasi;
                               * ikisi de yoksa null.
                               */
                              GeoPointDto midpoint, Double radiusKm,
                              List<UUID> runoffVotedParticipantIds,
                              /** Istegi yapanin bu oturumdaki satiri; uye degilse null. */
                              ViewerDto viewer,
                              /** Orta noktanin kasaba kelimesi; yoksa null (Task 3). */
                              String midpointLabel,
                              DecisionKind decisionKind, Instant decidedAt,
                              RunoffReason runoffReason,
                              /** Mekan -> begeni sayisi; YALNIZ DECIDED'da dolu. */
                              Map<UUID, Long> likeCounts,
                              /** Secili ama hic mekan uretmemis alanlar; BROWSING oncesi bos. */
                              List<ActivityType> emptyActivityTypes,
                              /** Merkez host'un sectigi sabit nokta mi (orta nokta degil). */
                              boolean anchored,
                              /** Ses odasi: null = kapali. SOLO'da hep null (start SOLO'yu reddeder). */
                              VoiceDto voice,
                              /** 5 haneli davet kodu; YALNIZ uyeye gonderilir (R-B9). */
                              String joinCode,
                              /** B-17: acik plan; null ise gizli oturum. */
                              OpenPlanDto openPlan) {
    }

    public record VoiceDto(Instant endsAt) {
    }

    public record VoiceStartResponse(Instant endsAt) {
    }

    /** credential kisa omurlu bir sirdir: toString maskeler (tokenCarryingDtosMaskSecretsInToString). */
    public record IceServerDto(List<String> urls, String username, String credential) {

        @Override
        public String toString() {
            return "IceServerDto[urls=" + urls + ", username=" + username + ", credential=***]";
        }
    }

    /** relay=false: TURN yok, yalniz STUN (Cloudflare ayarsiz/erisilemez). Istemci UI'da gostermez. */
    public record VoiceCredentialsResponse(List<IceServerDto> iceServers, boolean relay,
                                           Instant endsAt) {
    }

    /** Katilmadan once gorulen kamu bilgisi: koordinat, katilimci id'si, mekan YOK. */
    public record PreviewParticipantDto(String displayName, boolean host, boolean hasLocation) {
    }

    /**
     * Acik plan GIRDISI. Kapasite/politika/kitle opsiyonel: null -> 4 / APPROVAL / PUBLIC.
     * Sinirlar burada ve DOMAIN'de (OpenPlan) ve SEMADA (V20/V23) — uc katman da ayni sayiyi
     * soyler. {@code openUntil} (B-18) verilirse plan "buradayim" penceresidir: (meetAt,
     * meetAt+3h]. FRIENDS kitlesi B-19'a kadar 400 (SessionController.openPlanOf).
     */
    public record OpenPlanInput(@NotNull Instant meetAt,
                                @Min(3) @Max(8) Integer capacity,
                                JoinPolicy joinPolicy,
                                Instant openUntil,
                                Audience audience) {
    }

    /** Acik planin OKUMA yuzu. `approvedSeats`/`confirmed`/`meetPassed`/`inProgress` turetilir, saklanmaz. */
    public record OpenPlanDto(Instant meetAt, int capacity, JoinPolicy joinPolicy,
                              int approvedSeats, boolean confirmed, boolean meetPassed,
                              Instant openUntil, boolean inProgress, Audience audience) {
    }

    /**
     * Kesfet karti. Kesin konum TASIMAZ: {@code locality} SEMT adi (B-18'den beri
     * {@code Session.locality}; host'un capa etiketi DEGIL — K-B38), {@code minutes} isteyenin
     * kendi yuvarlanmis konumundan 5 dk basamaginda. Katilimci kimligi ve mekan da yok.
     * {@code openUntil} doluysa plan pencereli ("buradayim"); istemci "suruyor" satirini ondan cizer.
     */
    public record PlanCardDto(String slug, String name, List<ActivityType> activityTypes,
                              Instant meetAt, int capacity, int approvedSeats, boolean confirmed,
                              JoinPolicy joinPolicy, String hostDisplayName, String locality,
                              Integer minutes, TravelMode travelMode, Instant openUntil) {
    }

    /** `filter` geri doner: istemci "hangi filtreyle bakiyorum"u sunucudan ogrenir (profil varsayilani). */
    public record DiscoverResponse(List<PlanCardDto> plans, List<ActivityType> filter) {
    }

    public record SeatRequestInput(@NotBlank @Size(max = 40) String displayName,
                                   @DecimalMin("-90") @DecimalMax("90") Double lat,
                                   @DecimalMin("-180") @DecimalMax("180") Double lng,
                                   @Size(max = 80) String locationLabel,
                                   TravelMode travelMode,
                                   @Size(max = 140) String note) {
    }

    /** Host panelindeki satir. Koordinat YOK: semt + yuvarlanmis dakika. */
    public record SeatRequestDto(UUID id, String displayName, String locality, Integer minutes,
                                 TravelMode travelMode, String note, SeatStatus status,
                                 Instant createdAt, List<ActivityType> interests) {
    }

    public record SeatRequestListResponse(List<SeatRequestDto> requests, int approvedSeats,
                                          int capacity, boolean confirmed) {
    }

    /**
     * Isteyenin KENDI durumu. {@code participantToken} yalniz APPROVED'da ve yalniz mobilde
     * govdede doner; web'de cookie'ye yazilir ve burada null kalir (ParticipantTokenDelivery).
     */
    public record MySeatResponse(SeatStatus status, String participantToken) {

        @Override
        public String toString() {
            return "MySeatResponse[status=" + status + ", participantToken=***]";
        }
    }

    public record CheckinRequest(@NotNull Boolean met) {
    }

    public record SessionPreview(String slug, String name, List<ActivityType> activityTypes,
                                 SessionType sessionType, SessionStatus status,
                                 String hostDisplayName, int participantCount,
                                 List<PreviewParticipantDto> participants,
                                 /** Host su an oturumda mi — Katil ekranindaki rozet. Katilimi ENGELLEMEZ. */
                                 boolean hostOnline,
                                 /** B-17: acik plan; null ise gizli oturum (davet linki). */
                                 OpenPlanDto openPlan) {
    }

    /**
     * {@code /j/{slug}} sayfasinin OG/Twitter meta etiketlerini besleyen KAMU verisi. Etiketleri
     * HTML'e basmak web izinin isidir (W-15): backend SPA'nin index.html'ini uretmez ve tek bir
     * baslik satiri icin ikinci bir sunum katmani acmak dogru olmazdi.
     */
    public record OgMetaDto(String title, String description, String imageUrl, String url,
                            boolean expired) {
    }

    /**
     * Istegi yapan kisinin oturumdaki yeri. Katilimci token'i -> o satir; host JWT -> host satiri.
     * {@code runoffVoteVenueId} KENDI elemeoyudur (yoksa null): istemci onu useState'te tutarsa
     * sayfa yenilenince kaybolur. Baskasinin oyu bu gorunume hic girmez.
     */
    public record ViewerDto(UUID participantId, boolean host, UUID runoffVoteVenueId) {
    }

    /**
     * Liste kartindaki ust uste binen avatar yigininin satiri. Bas harf {@code displayName}'den
     * cizilir; {@code ready} false ise kesik cizgili "henuz hazir degil" halkasi. Koltuk id'si,
     * e-posta ve konum YOK — kart bunlarin hicbirini gostermez.
     */
    public record SummaryParticipantDto(String displayName, boolean ready, boolean host) {
    }

    public record SessionSummaryDto(String slug, String name,
                                    List<ActivityType> activityTypes,
                                    SessionType sessionType, SessionStatus status,
                                    Instant createdAt, Instant expiresAt, int participantCount,
                                    int readyCount, int doneCount,
                                    /** Sayimlarla AYNI kaynak; sira katilma sirasi (host once). */
                                    List<SummaryParticipantDto> participants,
                                    String decidedVenueName, String decidedVenuePhotoUrl) {
    }

    /**
     * open: acik oturumlar, TAVANSIZ; past: karar verilmis ya da suresi dolmus olanlar, en fazla
     * 20. {@code pastTruncated} true ise gecmiste gosterilmeyen satirlar var — istemci "daha
     * eski oturumlar var" diyebilsin diye acikca soylenir, sessizce kesilmez.
     */
    public record SessionListResponse(List<SessionSummaryDto> open, List<SessionSummaryDto> past,
                                      boolean pastTruncated) {
    }

    public record LocationPrefDto(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                  @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                  @Size(max = 80) String label) {
    }

    /** `plansMet`/`metStreakWeeks` (B-18): "bulustuk" sayisi ve haftalik seri; rozetler istemcide turer. */
    public record StatsDto(long sessionsHosted, long friendsMet, long plansMet, int metStreakWeeks) {
    }

    /** §2: consents{location, microphone, analytics, updatedAt, version}. */
    public record ConsentsDto(boolean location, boolean microphone, boolean analytics,
                              Instant updatedAt, int version) {
    }

    public record MeResponse(UUID id, String email, String displayName,
                             LocationPrefDto defaultLocation, ActivityType defaultActivity,
                             String language, TravelMode defaultTravelMode, StatsDto stats,
                             List<AuthProvider> authProviders, ConsentsDto consents,
                             /** Kesfet'in varsayilan filtresi (B-17); bos = filtresiz. */
                             List<ActivityType> interests) {
    }

    /** Uc anahtar da ZORUNLU: eksik alan "degistirme" degil, belirsiz rizadir. */
    public record UpdateConsentsRequest(@NotNull Boolean location, @NotNull Boolean microphone,
                                        @NotNull Boolean analytics) {
    }

    public record DeleteAccountRequest(@NotBlank String deleteConfirmToken) {

        @Override
        public String toString() {
            return "DeleteAccountRequest[deleteConfirmToken=" + masked(deleteConfirmToken) + "]";
        }
    }

    public record ReportRequest(@NotBlank String sessionSlug, @NotNull UUID targetParticipantId,
                                @NotNull ReportReason reason, @Size(max = 500) String note) {
    }

    public record ReportResponse(UUID id, Instant createdAt) {
    }

    /** Ikisinden TAM BIRI: hesap engeli (userId) ya da oturum kapsamli anonim engel. */
    public record BlockRequest(UUID userId, UUID participantId, String sessionSlug) {

        @AssertTrue(message = "exactly one of userId/participantId is required")
        public boolean isTargetExclusive() {
            return (userId == null) != (participantId == null)
                    && (participantId == null || (sessionSlug != null && !sessionSlug.isBlank()));
        }
    }

    public record BlockDto(UUID id, UUID userId, UUID participantId, Instant createdAt,
                           /**
                            * Engellenenin okuma anindaki adi (K-W16); silinmis hesap,
                            * anonimlesmis koltuk ya da bos adda null. POST yanitinda hep null.
                            */
                           String displayName) {
    }

    public record DeleteTokenResponse(String deleteConfirmToken, Instant expiresAt) {

        @Override
        public String toString() {
            return "DeleteTokenResponse[deleteConfirmToken=" + masked(deleteConfirmToken)
                    + ", expiresAt=" + expiresAt + "]";
        }
    }

    /** GDPR tasinabilirlik dosyasinin govdesi; konumlar YUVARLANMISTIR (~1.1 km). */
    public record ExportResponse(Instant exportedAt, UserDataExport.Profile profile,
                                 List<UserDataExport.Participation> participations) {
    }

    /** Tam degistirme: null = o tercihi temizle (displayName haric: null = degistirme). */
    public record UpdateMeRequest(@Size(max = 40) String displayName,
                                  @Valid LocationPrefDto defaultLocation,
                                  ActivityType defaultActivity,
                                  String language,
                                  TravelMode defaultTravelMode,
                                  /**
                                   * B-17: null = DEGISTIRME (displayName ile ayni kural), bos
                                   * liste = temizle. Sinir domainde ve semada da var (V21).
                                   */
                                  @Size(max = 5) @UniqueElements List<ActivityType> interests) {
    }

    public record ConfigTilesDto(String styleUrl) {}
    public record ConfigSourceDto(String id, String attributionKey, String attributionUrl, Integer ratingScale) {}
    public record ConfigResponse(String mapEngine, ConfigTilesDto tiles, List<ConfigSourceDto> sources) {}
    public record GeocodeRequest(@NotBlank @Size(max = 200) String query, Double biasLat, Double biasLng) {}
    public record GeocodeResponse(double lat, double lng, String label) {}
    public record ReverseGeocodeRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng) {}
    public record ReverseGeocodeResponse(String label) {}
}
