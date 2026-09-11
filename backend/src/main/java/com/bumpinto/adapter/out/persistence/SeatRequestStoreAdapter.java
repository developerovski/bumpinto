package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.SeatRequestStorePort;
import com.bumpinto.domain.session.SeatRequest;
import com.bumpinto.domain.session.SeatStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
class SeatRequestStoreAdapter implements SeatRequestStorePort {

    private final SeatRequestRepository repo;

    SeatRequestStoreAdapter(SeatRequestRepository repo) {
        this.repo = repo;
    }

    /**
     * Kaydin sonucu ENTITY'den okunur, elimizdeki kayittan degil: {@code createdAt} DB
     * varsayilanindan gelir ve yazmadan once bilinmez.
     */
    @Override public SeatRequest save(SeatRequest r) {
        return toDomain(repo.save(toEntity(r)));
    }

    @Override public Optional<SeatRequest> findById(UUID id) {
        return repo.findById(id).map(SeatRequestStoreAdapter::toDomain);
    }

    @Override public Optional<SeatRequest> findBySessionAndUser(UUID sessionId, UUID userId) {
        return repo.findBySessionIdAndUserId(sessionId, userId)
                .map(SeatRequestStoreAdapter::toDomain);
    }

    @Override public List<SeatRequest> findBySession(UUID sessionId) {
        return repo.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(SeatRequestStoreAdapter::toDomain).toList();
    }

    static SeatRequestEntity toEntity(SeatRequest r) {
        SeatRequestEntity e = new SeatRequestEntity();
        e.id = r.id();
        e.sessionId = r.sessionId();
        e.userId = r.userId();
        e.displayName = r.displayName();
        e.lat = r.location() == null ? null : r.location().lat();
        e.lng = r.location() == null ? null : r.location().lng();
        e.locationLabel = r.locationLabel();
        e.travelMode = r.travelMode().name();
        e.note = r.note();
        e.status = r.status().name();
        e.decidedAt = r.decidedAt();
        return e;
    }

    static SeatRequest toDomain(SeatRequestEntity e) {
        GeoPoint loc = e.lat == null ? null : new GeoPoint(e.lat, e.lng);
        return new SeatRequest(e.id, e.sessionId, e.userId, e.displayName, loc, e.locationLabel,
                TravelMode.valueOf(e.travelMode), e.note, SeatStatus.valueOf(e.status),
                e.createdAt, e.decidedAt);
    }
}
