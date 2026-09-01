package com.bumpinto.infra;

import java.util.UUID;

public record ParticipantPrincipal(UUID participantId, UUID sessionId, boolean host) {
}
