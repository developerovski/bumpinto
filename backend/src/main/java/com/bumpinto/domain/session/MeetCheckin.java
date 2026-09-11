package com.bumpinto.domain.session;

import java.time.Instant;
import java.util.UUID;

/** "Bulustunuz mu?" cevabi. Kisi basina tek satir; 1. asama kapisinin tek olcumu. */
public record MeetCheckin(UUID sessionId, UUID participantId, boolean met, Instant createdAt) {
}
