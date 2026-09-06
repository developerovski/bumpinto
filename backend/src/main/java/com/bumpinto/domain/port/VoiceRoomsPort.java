package com.bumpinto.domain.port;

import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Oturum basina ses odasi — surec ici (presence ile ayni borc sinifi). */
public interface VoiceRoomsPort {

    /**
     * Idempotent: acik oda varsa oldugu gibi doner, zamanlayici yeniden kurulmaz.
     * {@code onExpire} en fazla bir kez, zamanlayici thread'inde calisir; calistigi anda oda
     * hala depoda durur — geri cagrinin kendisi {@code close}'u cagirmasi beklenir.
     */
    VoiceRoom open(UUID sessionId, String slug, Instant endsAt, Runnable onExpire);

    /** Odayi ve zamanlayicisini kaldirir; oda yoksa bos. */
    Optional<VoiceRoom> close(UUID sessionId);

    /** Bos: acik oda yok (uyelik yaratilmaz). Doluysa katilim-sonrasi anlik goruntu — koltuk degismemis olsa bile. */
    Optional<VoiceRoom> join(UUID sessionId, UUID participantId, Seat seat);

    /** UNSUBSCRIBE: yalniz o soket+abonelik ciftine ait koltuk duser. Bos: eslesen koltuk yok. */
    Optional<VoiceRoom> leaveSeat(UUID sessionId, String wsSessionId, String subscriptionId);

    /** DISCONNECT: o sokete ait tum koltuklar duser. Bos: eslesen koltuk yok. */
    Optional<VoiceRoom> leaveSocket(UUID sessionId, String wsSessionId);

    /** Duz arama; yan etkisi yok. */
    Optional<VoiceRoom> roomOf(UUID sessionId);
}
