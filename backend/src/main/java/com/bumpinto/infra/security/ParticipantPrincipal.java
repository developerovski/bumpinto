package com.bumpinto.infra.security;

import java.util.UUID;

public record ParticipantPrincipal(UUID participantId, UUID sessionId, boolean host) {
}
