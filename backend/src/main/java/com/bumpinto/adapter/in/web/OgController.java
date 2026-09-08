package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.og.OgCard;
import com.bumpinto.domain.port.OgImagePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.infra.config.AppProps;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.stream.Collectors;

/**
 * Onizleme kartlari. KAMU ucudur ve uzerinde YALNIZ kamu onizleme alanlari vardir. Render surec
 * ici onbellektedir: bir link WhatsApp/Slack/X tarafindan ayni anda cekilir ve her cekiste
 * yeniden cizmek bos CPU olurdu.
 */
@RestController
class OgController {

    private final SessionQueries queries;
    private final OgImagePort images;
    private final Duration cache;
    /** Davet linkinin kaynagi; {@link #meta} buradan {@code /j/{slug}} kurar. */
    private final String appBaseUrl;
    /** Bu API'nin dis adresi; {@link #meta} PNG'nin mutlak URL'ini buradan kurar. */
    private final String publicBaseUrl;
    private final Cache<String, byte[]> rendered;

    OgController(SessionQueries queries, OgImagePort images, AppProps props) {
        this.queries = queries;
        this.images = images;
        this.cache = props.og().cache();
        this.appBaseUrl = props.og().appBaseUrl();
        this.publicBaseUrl = props.og().publicBaseUrl();
        this.rendered = Caffeine.newBuilder().maximumSize(1_000)
                .expireAfterWrite(this.cache).build();
    }

    @GetMapping(value = "/og/{slug}.png", produces = MediaType.IMAGE_PNG_VALUE)
    ResponseEntity<byte[]> card(@PathVariable String slug) {
        byte[] png = rendered.get(slug, key -> images.render(cardOf(key)));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(cache).cachePublic())
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }

    /**
     * Ayni kartin METIN hali: {@code /j/{slug}} sayfasinin OG/Twitter etiketleri. URL'ler
     * MUTLAKTIR — onizleme sunuculari goreli bir {@code og:image}'i cozemez ve gorsel hic
     * gorunmezdi; iki adres ayri ayarlardan gelir, cunku SPA ile API ayri kaynaklarda yasar.
     * Govde PNG ile ayni kamu alanlarindan turer: koordinat, katilimci id'si ya da mekan yok.
     */
    @GetMapping("/api/sessions/{slug}/og")
    ApiDtos.OgMetaDto meta(@PathVariable String slug) {
        OgCard card = cardOf(slug);
        String description = card.expired()
                ? "Bu davetin suresi doldu."
                : (card.hostDisplayName() == null ? "Bir arkadasin" : card.hostDisplayName())
                        + " seni davet etti · " + card.participantCount() + " kisi";
        // slug ham haliyle URL'e ASLA girmez: gecerli bir oturumda [a-z0-9]{8} oldugu icin
        // encode round-trip'i degistirmez, ama gecersiz/kotu niyetli girdide (<, ", vb.) yuzde
        // kacislarina donusur — govde JSON-guvenlidir ama HTML-guvenli DEGILDIR (bkz. Ids
        // normalizeJoinCode ile ayni mantik: dogrulanmamis girdi asla ham kullanilmaz).
        String encodedSlug = UriUtils.encodePathSegment(slug, StandardCharsets.UTF_8);
        return new ApiDtos.OgMetaDto(card.title(), description,
                publicBaseUrl + "/og/" + encodedSlug + ".png",
                appBaseUrl + "/j/" + encodedSlug, card.expired());
    }

    /**
     * Bilinmeyen ya da suresi dolmus slug 404 DEGIL jenerik karttir (kabul c): onizleme
     * sunuculari 404'te link'i "bozuk" gosterir ve paylasilan mesaj cirkinlesirdi.
     */
    OgCard cardOf(String slug) {
        try {
            SessionQueries.SessionSnapshot snap = queries.snapshot(slug);
            if (snap.session().status() == SessionStatus.EXPIRED) {
                return OgCard.generic();
            }
            String host = snap.participants().stream().filter(Participant::host).findFirst()
                    .map(Participant::displayName).orElse(null);
            String label = snap.session().activityTypes().stream().map(Enum::name)
                    .collect(Collectors.joining(" · "));
            String title = snap.session().name() == null ? "Birlikte karar verelim"
                    : snap.session().name();
            // Elle eklenen noktalar KISI DEGILDIR: sayilsalardi kart, hostun harita uzerine
            // koydugu adresleri de "kisi" diye gosterirdi.
            long people = snap.participants().stream().filter(p -> !p.manual()).count();
            return new OgCard(title, label, host, (int) people, false);
        } catch (NotFoundException unknown) {
            return OgCard.generic();
        }
    }
}
