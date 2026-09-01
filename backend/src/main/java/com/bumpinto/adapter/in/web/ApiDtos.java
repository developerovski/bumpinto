package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.SessionStatus;
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
                                       @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                       @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                       @NotBlank @Size(max = 40) String displayName) {
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
                              @DecimalMin("-180") @DecimalMax("180") Double lng) {
    }

    public record JoinResponse(UUID participantId, String participantToken) {

        @Override
        public String toString() {
            return "JoinResponse[participantId=" + participantId
                    + ", participantToken=" + masked(participantToken) + "]";
        }
    }

    public record LocationRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                  @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng) {
    }

    public record SwipeRequest(@NotNull UUID venueId, @NotNull Boolean liked) {
    }

    public record RunoffVoteRequest(@NotNull UUID venueId) {
    }

    public record ForceDecisionRequest(UUID venueId) {
    }

    public record ParticipantDto(UUID id, String displayName, boolean host,
                                 boolean hasLocation, boolean deckDone) {
    }

    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           Map<UUID, Integer> travelMinutes) {
    }

    public record SessionView(String slug, String name, ActivityType activityType,
                              SessionStatus status, Instant expiresAt,
                              List<ParticipantDto> participants, List<VenueDto> venues,
                              List<UUID> runoffVenueIds, UUID decidedVenueId,
                              Map<UUID, Long> voteTally) {
    }
}
