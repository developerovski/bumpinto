package com.bumpinto.domain.voice;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VoiceRoomTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");

    @Test
    void remainingClampsAtZero() {
        VoiceRoom room = new VoiceRoom(UUID.randomUUID(), "s1", T0, T0.plus(Duration.ofHours(2)),
                Map.of());

        assertThat(room.remaining(T0.plus(Duration.ofMinutes(90)))).isEqualTo(Duration.ofMinutes(30));
        assertThat(room.remaining(T0.plus(Duration.ofHours(2)))).isZero();
        assertThat(room.remaining(T0.plus(Duration.ofHours(3)))).isZero();
    }

    @Test
    void membershipIsKeyedByParticipantId() {
        UUID ayse = UUID.randomUUID();
        VoiceRoom room = new VoiceRoom(UUID.randomUUID(), "s1", T0, T0.plus(Duration.ofHours(2)),
                Map.of(ayse, new Seat("ws-1", "sub-1")));

        assertThat(room.hasMember(ayse)).isTrue();
        assertThat(room.hasMember(UUID.randomUUID())).isFalse();
        assertThat(room.memberIds()).containsExactly(ayse);
    }

    @Test
    void membersMapIsDefensivelyCopied() {
        UUID ayse = UUID.randomUUID();
        Map<UUID, Seat> source = new HashMap<>();
        source.put(ayse, new Seat("ws-1", "sub-1"));
        VoiceRoom room = new VoiceRoom(UUID.randomUUID(), "s1", T0, T0.plus(Duration.ofHours(2)), source);

        source.clear();

        assertThat(room.hasMember(ayse)).isTrue();
        assertThatThrownBy(() -> room.memberIds().add(UUID.randomUUID()))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void stunOnlyConfigCarriesNoCredentialAndNoRelay() {
        IceConfig stun = IceConfig.stunOnly();

        assertThat(stun.relay()).isFalse();
        assertThat(stun.iceServers()).hasSize(1);
        assertThat(stun.iceServers().get(0).urls())
                .containsExactly("stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302");
        assertThat(stun.iceServers().get(0).username()).isNull();
        assertThat(stun.iceServers().get(0).credential()).isNull();
    }

    @Test
    void iceServerToStringMasksTheCredentialButKeepsUrlsAndUsername() {
        IceConfig.IceServer server = new IceConfig.IceServer(List.of("turn:x"), "u", "secret");

        assertThat(server.toString()).doesNotContain("secret").contains("turn:x", "u");
    }
}
