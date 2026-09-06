package com.bumpinto.adapter.in.web;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import io.github.bucket4j.Bucket;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * Istemciden gelen her STOMP frame'i burada gecer: yalniz kendi oturumunun aboneligi ve kendi
 * sinyal adresi gecer ({@link #ownTopic}/{@link #ownSignal}), baska her SEND sessizce dusurulur.
 *
 * <p>Bunun ustune, soket basina (accessor.getSessionId()) IKI butce tutulur — destinasyon dogru
 * olsa BILE asan frame duser. Neden iki: bir soket kendi kutusuna SUBSCRIBE/UNSUBSCRIBE dongusune
 * girip her donguyu bir voice_roster_changed'e cevirebilir ve her istemci bunu tam bir
 * {@code GET /api/sessions/{slug}} yapar — 1 frame -> N agir istek yukselmesi, tam olarak
 * WebSocketConfig'in eskiden beri engellemeye calistigi sey. 20/dk bu dongude mesru kullanimin
 * (oturum basina bir avuc abonelik) cok ustunde ama saldirganin butceyi hizla tuketmesini saglar.
 * ICE trickle ise bir saniyede onlarca aday gonderebilir, o yuzden sinyal (MESSAGE) butcesi cok
 * daha genis (240/dk). Ikisi de "en iyi caba" sozlesmesini bozmaz: asan frame gorunmeden duser.
 *
 * <p>Tam eslesme onemlidir: basit broker (SimpleBroker) abonelik hedeflerini Ant deseni olarak
 * ele alir — {@code equals} yerine gevsek bir karsilastirma kullansaydik joker bir abonelik
 * ({@code /topic/session/*}{@code /voice/**} gibi) TUM oturumlarin sinyalini alirdi.
 */
class VoiceInboundGuard implements ChannelInterceptor {

    static final int SUBSCRIPTION_BUDGET_PER_MINUTE = 20;
    static final int SIGNAL_BUDGET_PER_MINUTE = 240;

    private final LoadingCache<String, Bucket> subscriptionBudget = newBudget(SUBSCRIPTION_BUDGET_PER_MINUTE);
    private final LoadingCache<String, Bucket> signalBudget = newBudget(SIGNAL_BUDGET_PER_MINUTE);

    private static LoadingCache<String, Bucket> newBudget(int capacity) {
        return Caffeine.newBuilder()
                .maximumSize(100_000)
                .expireAfterAccess(Duration.ofMinutes(10))
                .build(key -> Bucket.builder()
                        .addLimit(limit -> limit.capacity(capacity).refillGreedy(capacity, Duration.ofMinutes(1)))
                        .build());
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        SimpMessageType type = accessor.getMessageType();
        String wsSessionId = accessor.getSessionId();
        if (type == SimpMessageType.MESSAGE) {
            return withinBudget(signalBudget, wsSessionId) && ownSignal(message) ? message : null;
        }
        if (type == SimpMessageType.SUBSCRIBE) {
            // Yalniz KENDI ses kutusuna abonelik ucretlendirilir; oturum konusuna (sessionTopic)
            // tek seferlik abonelik butceyi tuketmez — SUBSCRIBE/UNSUBSCRIBE dongu riski
            // yalniz ses kutusunda vardir (sinif javadoc'u).
            boolean chargeable = isVoiceInbox(message);
            return (!chargeable || withinBudget(subscriptionBudget, wsSessionId)) && ownTopic(message)
                    ? message : null;
        }
        if (type == SimpMessageType.UNSUBSCRIBE) {
            // UNSUBSCRIBE hedef tasimaz (hangi aboneligin kapandigi bilinmez), o yuzden hepsi
            // ucretlendirilir — nadir oldugundan zararsizdir.
            return withinBudget(subscriptionBudget, wsSessionId) ? message : null;
        }
        return message;
    }

    /** Hedef ses kutusu (.../voice/{id}) ile mi basliyor — sade sessionTopic burada SAYILMAZ. */
    private static boolean isVoiceInbox(Message<?> message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        String slug = slugOf(accessor);
        String destination = accessor.getDestination();
        return slug != null && destination != null
                && destination.startsWith(VoiceDestinations.sessionTopic(slug) + "/voice/");
    }

    /**
     * wsSessionId GERCEK trafikte hic null olmaz: StompSubProtocolHandler her frame'e gonderilmeden
     * once kendi soket kimligini basar. null yalniz sentetik/testli bir mesajda gorulur — o zaman
     * anahtarlanacak bir soket olmadigindan butce atlanir (reddetmez), geri kalan kontroller
     * (ownTopic/ownSignal) degismeden calisir.
     */
    private static boolean withinBudget(LoadingCache<String, Bucket> budget, String wsSessionId) {
        return wsSessionId == null || budget.get(wsSessionId).tryConsume(1);
    }

    private static boolean ownSignal(Message<?> message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        String slug = slugOf(accessor);
        return slug != null && VoiceDestinations.signal(slug).equals(accessor.getDestination());
    }

    /** Oturum konusu ya da KENDI ses konusu; baskasinin ozel konusu dusurulur. */
    private static boolean ownTopic(Message<?> message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        String slug = slugOf(accessor);
        if (slug == null) {
            return false;
        }
        String destination = accessor.getDestination();
        if (VoiceDestinations.sessionTopic(slug).equals(destination)) {
            return true;
        }
        Map<String, Object> attributes = accessor.getSessionAttributes();
        return attributes != null
                && attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID me
                && VoiceDestinations.inbox(slug, me).equals(destination);
    }

    private static String slugOf(SimpMessageHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        Object slug = attributes == null ? null : attributes.get(SessionWsHandshake.SLUG);
        return slug instanceof String value ? value : null;
    }
}
