package com.bumpinto.adapter.in.web;

import com.bumpinto.infra.config.AppProps;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;
import java.util.Map;

/**
 * Canlı olay kanalı: sunucudan istemciye tek yön (uygulamada tek bir {@code @MessageMapping}
 * yok), yayınlar {@code /topic/session/{slug}} altında.
 *
 * <p>Kanal SALT OKUNUR: istemciden gelen mesaj frame'leri düşürülür
 * ({@link #configureClientInboundChannel}). Bu kendiliğinden gelmiyordu — Spring'in simple
 * broker'ı, hedefi broker önekiyle başlayan İSTEMCİ SEND frame'lerini de abonelere röleler.
 * Handshake kimliksizken slug'ı bilen biri sahte olay basıp oturumdaki HERKESİN sekmesine tam
 * bir {@code GET /api/sessions/{slug}} yaptırabiliyordu (1 frame → N ağır istek). Handshake artık
 * kimlikli (aşağıda) ama kural KALDI: üye de olsa istemcinin yayın yapmasının meşru kullanımı yok.
 * Uygulamada tek bir {@code @MessageMapping} yok.
 *
 * <p>Handshake KİMLİKLİDİR: uç nokta {@code /api/sessions/{slug}/ws} altındadır ve katılımcı
 * çerezinin path'i tam olarak {@code /api/sessions/{slug}} olduğu için tarayıcı çerezi handshake'e
 * kendiliğinden gönderir. İstek servlet zincirinden geçer, {@code ParticipantTokenFilter} kimliği
 * kurar, {@code SecurityConfig.anyRequest().authenticated()} kimliksizi 401'ler.
 * {@link SessionWsHandshake} kimliği WS oturum niteliklerine yazar.
 *
 * <p>Abonelik de yetkilendirilir: kişi yalnız KENDİ oturumunun konusuna abone olabilir. Önceden
 * uç nokta {@code /ws} idi, handshake kimliksizdi ve slug'ı bilen herhangi bir istemci kanalı
 * dinleyebiliyordu.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /** Cift yonlu STOMP heartbeat araligi. */
    private static final long HEARTBEAT_MS = 10_000;

    private final AppProps props;

    public WebSocketConfig(AppProps props) {
        this.props = props;
    }

    /**
     * Heartbeat ACIK olmali: TaskScheduler verilmezse STOMP heartbeat'i sessizce kapanir ve kopukluk
     * yalniz TCP zaman asimiyla anlasilir. Sekme kapatmak FIN gonderir (aninda), ama kapak kapanmasi
     * / ucak modu / hucresel-WiFi gecisi HICBIR SEY gondermez — o soket saatlerce "acik" kalir ve
     * 45 sn'lik grace penceresi hicbir sey ifade etmez. 10 sn'lik cift yonlu heartbeat kopuklugu
     * ~20 sn'ye baglar; istemci (@stomp/stompjs) zaten 10/10 sn istiyor.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic")
                .setTaskScheduler(heartbeatScheduler())
                .setHeartbeatValue(new long[] {HEARTBEAT_MS, HEARTBEAT_MS});
    }

    private static ThreadPoolTaskScheduler heartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    /** Yalniz kendi oturumunun aboneligi gecer; istemcinin yayin yapmasi sessizce dusurulur. */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                SimpMessageType type = SimpMessageHeaderAccessor.getMessageType(message.getHeaders());
                if (type == SimpMessageType.MESSAGE) {
                    return null;
                }
                if (type == SimpMessageType.SUBSCRIBE && !ownTopic(message)) {
                    return null;
                }
                return message;
            }
        });
    }

    private static boolean ownTopic(Message<?> message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        Map<String, Object> attributes = accessor.getSessionAttributes();
        Object slug = attributes == null ? null : attributes.get(SessionWsHandshake.SLUG);
        return slug != null && ("/topic/session/" + slug).equals(accessor.getDestination());
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SecurityConfig.corsConfigurationSource ile AYNI kaynak: iki liste ayrı yaşarsa biri
        // sıkılaşırken diğeri açık kalır. Liste yoksa hiçbir origin kabul edilmez (fail-closed).
        List<String> origins = props.cors() == null ? List.of() : props.cors().allowedOrigins();
        registry.addEndpoint("/api/sessions/*/ws")
                .setAllowedOriginPatterns(origins.toArray(String[]::new))
                .addInterceptors(new SessionWsHandshake());
    }
}
