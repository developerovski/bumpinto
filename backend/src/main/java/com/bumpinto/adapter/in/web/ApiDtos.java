package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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

    public record CreateSessionRequest(@NotNull ActivityType activityType,
                                       @Size(max = 60) String name,
                                       /** null → GROUP (M-1 mobil istemcisi alani gondermez). */
                                       SessionType sessionType,
                                       @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                       @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                       @NotBlank @Size(max = 40) String displayName,
                                       @Size(max = 80) String locationLabel,
                                       /** null → CAR (spec §4.5b varsayilani). */
                                       TravelMode travelMode) {
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
                                 Integer midpointMinutes) {
    }

    /**
     * mapsUrl: saglayici vermezse yol tarifi adresine duser (spec §5.A.6) — "Yol tarifi al"
     * butonu hicbir oturumda olu kalmaz. placeLink: mekanin kendi sayfasi (Maps ya da site).
     */
    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           Map<UUID, Integer> travelMinutes, FairnessDto fairness,
                           String provider, String category, String address, String locality,
                           Integer ratingCount, String hoursToday, String placeLink) {
    }

    public record SessionView(String slug, String name, ActivityType activityType,
                              SessionType sessionType, SessionStatus status, Instant expiresAt,
                              List<ParticipantDto> participants, List<VenueDto> venues,
                              List<UUID> runoffVenueIds, UUID decidedVenueId,
                              Map<UUID, Long> voteTally,
                              /** Konumu olan >=2 nokta varsa; yoksa null. */
                              GeoPointDto midpoint, Double radiusKm,
                              List<UUID> runoffVotedParticipantIds,
                              /** Istegi yapanin bu oturumdaki satiri; uye degilse null. */
                              ViewerDto viewer,
                              /** Orta noktanin kasaba kelimesi; yoksa null (Task 3). */
                              String midpointLabel,
                              DecisionKind decisionKind, Instant decidedAt,
                              RunoffReason runoffReason,
                              /** Mekan -> begeni sayisi; YALNIZ DECIDED'da dolu. */
                              Map<UUID, Long> likeCounts) {
    }

    /** Katilmadan once gorulen kamu bilgisi: koordinat, katilimci id'si, mekan YOK. */
    public record PreviewParticipantDto(String displayName, boolean host, boolean hasLocation) {
    }

    public record SessionPreview(String slug, String name, ActivityType activityType,
                                 SessionType sessionType, SessionStatus status,
                                 String hostDisplayName, int participantCount,
                                 List<PreviewParticipantDto> participants) {
    }

    /**
     * Istegi yapan kisinin oturumdaki yeri. Katilimci token'i -> o satir; host JWT -> host satiri.
     * {@code runoffVoteVenueId} KENDI elemeoyudur (yoksa null): istemci onu useState'te tutarsa
     * sayfa yenilenince kaybolur. Baskasinin oyu bu gorunume hic girmez.
     */
    public record ViewerDto(UUID participantId, boolean host, UUID runoffVoteVenueId) {
    }

    public record SessionSummaryDto(String slug, String name, ActivityType activityType,
                                    SessionType sessionType, SessionStatus status,
                                    Instant createdAt, Instant expiresAt, int participantCount,
                                    int readyCount, int doneCount,
                                    String decidedVenueName, String decidedVenuePhotoUrl) {
    }

    /** open: DECIDED/EXPIRED disi; past: karar verilmis ya da suresi dolmus. */
    public record SessionListResponse(List<SessionSummaryDto> open, List<SessionSummaryDto> past) {
    }

    public record LocationPrefDto(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                  @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                  @Size(max = 80) String label) {
    }

    public record StatsDto(long sessionsHosted, long friendsMet) {
    }

    public record MeResponse(UUID id, String email, String displayName,
                             LocationPrefDto defaultLocation, ActivityType defaultActivity,
                             String language, TravelMode defaultTravelMode, StatsDto stats) {
    }

    /** Tam degistirme: null = o tercihi temizle (displayName haric: null = degistirme). */
    public record UpdateMeRequest(@Size(max = 40) String displayName,
                                  @Valid LocationPrefDto defaultLocation,
                                  ActivityType defaultActivity,
                                  String language,
                                  TravelMode defaultTravelMode) {
    }
}
