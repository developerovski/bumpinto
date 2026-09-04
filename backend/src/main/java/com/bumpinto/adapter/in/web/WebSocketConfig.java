package com.bumpinto.adapter.in.web;

import com.bumpinto.infra.config.AppProps;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

/**
 * Canlı olay kanalı: sunucudan istemciye tek yön (uygulamada tek bir {@code @MessageMapping}
 * yok), yayınlar {@code /topic/session/{slug}} altında.
 *
 * <p>Kanal SALT OKUNUR: istemciden gelen mesaj frame'leri düşürülür
 * ({@link #configureClientInboundChannel}). Bu kendiliğinden gelmiyordu — Spring'in simple
 * broker'ı, hedefi broker önekiyle başlayan İSTEMCİ SEND frame'lerini de abonelere röleler.
 * Handshake kimliksiz olduğu için slug'ı bilen biri sahte olay basıp oturumdaki HERKESİN
 * sekmesine tam bir {@code GET /api/sessions/{slug}} yaptırabilirdi (1 frame → N ağır istek).
 * Uygulamada tek bir {@code @MessageMapping} yok; istemci mesajının meşru kullanımı da yok.
 *
 * <p>Handshake KİMLİKSİZ'dir ve bugünkü tasarımda öyle kalmak zorunda: katılımcı çerezinin yolu
 * {@code /api/sessions/{slug}}, hesap çerezininki {@code /api} — tarayıcı {@code /ws}'e hiçbir
 * kimlik çerezi göndermez. Bu yüzden origin listesi tarayıcı tarafındaki TEK savunmadır ve
 * HTTP ile aynı allowlist'e bağlanır. Önceden {@code "*"} idi: herhangi bir sitedeki sayfa,
 * ziyaretçinin tarayıcısında bu kanala abone olabiliyordu (cross-site WebSocket hijacking).
 *
 * <p>Kapatmadığı boşluk: tarayıcı dışı bir istemci (curl/wscat) Origin başlığını uydurabilir.
 * Slug'ı bilen birine karşı kanal hâlâ açıktır — bu yüzden yayınların gövdesi hassas veri
 * TAŞIMAZ (bkz. {@code SessionEvent}: yalnız sayaçlar ve karar verilen mekân id'si). Gerçek
 * kimlik doğrulaması handshake'in kimlik taşıyabildiği bir tasarım gerektirir (ticket ucu ya
 * da kanalın {@code /api/sessions/{slug}/...} altına taşınması).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AppProps props;

    public WebSocketConfig(AppProps props) {
        this.props = props;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
    }

    /** Yalnız abonelik/bağlantı frame'leri geçer; istemcinin yayın yapması sessizce düşürülür. */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                return SimpMessageHeaderAccessor.getMessageType(message.getHeaders())
                        == SimpMessageType.MESSAGE ? null : message;
            }
        });
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SecurityConfig.corsConfigurationSource ile AYNI kaynak: iki liste ayrı yaşarsa biri
        // sıkılaşırken diğeri açık kalır. Liste yoksa hiçbir origin kabul edilmez (fail-closed).
        List<String> origins = props.cors() == null ? List.of() : props.cors().allowedOrigins();
        registry.addEndpoint("/ws").setAllowedOriginPatterns(origins.toArray(String[]::new));
    }
}
