package com.bumpinto.adapter.in.web;

import com.bumpinto.infra.config.AppProps;
import jakarta.servlet.ServletContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

import java.util.List;

/**
 * Canlı olay kanalı: sunucudan istemciye tek yön (istemciden sunucuya tek adres WebRTC
 * sinyalidir (aşağıda)), yayınlar {@code /topic/session/{slug}} altında.
 *
 * <p>Kanal bir istisna disinda SALT OKUNURDUR: istemciden gelen SEND frame'leri dusurulur
 * ({@link VoiceInboundGuard}, {@link #configureClientInboundChannel}); tek gecis
 * {@code /app/sessions/{slug}/voice/signal} (kendi slug'i) — WebRTC sinyali,
 * {@link VoiceSignalController}. Spring'in simple broker'i, hedefi broker onekiyle baslayan
 * ISTEMCI SEND frame'lerini de abonelere roleler; handshake kimliksizken slug'i bilen biri sahte
 * olay basip oturumdaki HERKESIN sekmesine tam bir GET yaptirabiliyordu. Kural KALDI: {@code
 * /topic} altina istemci yayini yok.
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
    /**
     * SDP birkac KB'dir; 32 KB hem STOMP mesaj limiti ({@link #configureWebSocketTransport}) hem
     * Tomcat'in metin arabellegi ({@link #webSocketContainer}) icin AYNI deger — biri digeri
     * olmadan gecersiz kalirdi: Tomcat varsayilani 8 KB'dir ve o tavan asilinca Spring'in limiti
     * hic devreye girmeden soket kapanir.
     */
    private static final int MESSAGE_SIZE_LIMIT = 32 * 1024;

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
        registry.setApplicationDestinationPrefixes(VoiceDestinations.APP_PREFIX);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(MESSAGE_SIZE_LIMIT);
    }

    /**
     * Spring'in STOMP mesaj limiti Tomcat'in kendi metin/ikili arabellegini BUYUTMEZ; o hala 8
     * KB varsayilaninda kalir ve daha buyuk bir frame Spring'e hic ulasmadan soketi kapatir. Ikisi
     * ayni deger olmali (bkz. {@link #MESSAGE_SIZE_LIMIT}).
     *
     * <p>{@code afterPropertiesSet} ezilir: taban sinif, ServletContext'te canli bir
     * {@code jakarta.websocket.server.ServerContainer} nitelik BULAMAZSA firlatir. Bu nitelik
     * yalniz GERCEK bir Tomcat baslayinca (RANDOM_PORT/uretim) yazilir; {@code @SpringBootTest}
     * varsayilani olan MOCK ortaminda (ApiHappyPathTest, AccountApiTest) hicbir sunucu
     * baslamadigindan nitelik yoktur — dokunacak canli bir kap olmadigi icin sessizce atlanir.
     */
    @Bean
    ServletServerContainerFactoryBean webSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean() {
            private ServletContext servletContext;

            @Override
            public void setServletContext(ServletContext servletContext) {
                this.servletContext = servletContext;
                super.setServletContext(servletContext);
            }

            @Override
            public void afterPropertiesSet() {
                if (servletContext != null && servletContext.getAttribute(
                        "jakarta.websocket.server.ServerContainer") != null) {
                    super.afterPropertiesSet();
                }
            }
        };
        container.setMaxTextMessageBufferSize(MESSAGE_SIZE_LIMIT);
        container.setMaxBinaryMessageBufferSize(MESSAGE_SIZE_LIMIT);
        return container;
    }

    private static ThreadPoolTaskScheduler heartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new VoiceInboundGuard());
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
