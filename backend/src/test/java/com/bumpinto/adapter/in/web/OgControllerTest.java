package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.og.OgCard;
import com.bumpinto.domain.port.OgImagePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Kartin ICERIGI: oturumdan karta esleme. Bu ucun govdesi paylasilan her mesajda gorunur ve
 * link'i eline gecen HERKESE acilir — "ne yaziyor" sorusu HTTP dikisinden (WebSecuritySliceTest)
 * ayri sinanir.
 */
class OgControllerTest {

    static final UUID SESSION_ID = UUID.randomUUID();

    SessionQueries queries = mock(SessionQueries.class);
    AtomicInteger renders = new AtomicInteger();
    OgImagePort images = card -> {
        renders.incrementAndGet();
        return new byte[]{(byte) 0x89, 'P', 'N', 'G'};
    };
    OgController controller = new OgController(queries, images, TestProps.defaults());

    static Session session(SessionStatus status, String name) {
        return new Session(SESSION_ID, "x7k2m", UUID.randomUUID(), name,
                List.of(ActivityType.COFFEE, ActivityType.BAR), SessionType.GROUP, status,
                Instant.parse("2026-09-06T18:00:00Z"), null, List.of());
    }

    static Participant person(String displayName, boolean host, boolean manual) {
        return new Participant(UUID.randomUUID(), SESSION_ID, displayName,
                new GeoPoint(51.44, 5.47), host, null, manual, null, null);
    }

    static SessionQueries.SessionSnapshot snapshot(Session session, Participant... participants) {
        return new SessionQueries.SessionSnapshot(session, List.of(participants), List.of(),
                Map.of(), Map.of(), Map.of());
    }

    /**
     * Elle eklenen nokta KISI DEGILDIR: host'un haritaya koydugu adres sayilsaydi kart
     * "3 kisi" derken odada iki kisi olurdu.
     */
    @Test
    void aLiveSessionMapsHostLabelTitleAndPeopleCount() {
        when(queries.snapshot("x7k2m")).thenReturn(snapshot(
                session(SessionStatus.SWIPING, "Cuma kahvesi"),
                person("Ayşe", false, false),
                person("Mehmet", true, false),
                person("Ofis", false, true)));

        OgCard card = controller.cardOf("x7k2m");

        assertThat(card.title()).isEqualTo("Cuma kahvesi");
        assertThat(card.activityLabel()).isEqualTo("COFFEE · BAR");
        assertThat(card.hostDisplayName()).isEqualTo("Mehmet");
        assertThat(card.participantCount()).isEqualTo(2);
        assertThat(card.expired()).isFalse();
    }

    /** Adsiz oturum jenerik karta DUSMEZ: host'u ve kisi sayisi hala gercektir. */
    @Test
    void anUnnamedSessionStillGetsARealCardWithACallToAction() {
        when(queries.snapshot("x7k2m")).thenReturn(snapshot(
                session(SessionStatus.COLLECTING, null), person("Mehmet", true, false)));

        OgCard card = controller.cardOf("x7k2m");

        assertThat(card.title()).isEqualTo("Birlikte karar verelim");
        assertThat(card.expired()).isFalse();
        assertThat(card.hostDisplayName()).isEqualTo("Mehmet");
    }

    /**
     * Suresi dolmus oturum (okuma tarafi EXPIRED raporlar, bkz. SessionExpiry) jenerik karttir:
     * bayat bir link paylasildiginda kartta hala "Mehmet seni davet etti · 4 kisi" yazmasi
     * yanlis bilgi olurdu.
     */
    @Test
    void anExpiredSessionFallsBackToTheGenericCard() {
        when(queries.snapshot("x7k2m")).thenReturn(snapshot(
                session(SessionStatus.EXPIRED, "Cuma kahvesi"), person("Mehmet", true, false)));

        assertThat(controller.cardOf("x7k2m")).isEqualTo(OgCard.generic());
    }

    /** Bilinmeyen slug 404 DEGIL jenerik karttir: 404'te onizleme link'i "bozuk" gosterirdi. */
    @Test
    void anUnknownSlugFallsBackToTheGenericCard() {
        when(queries.snapshot("yok")).thenThrow(new NotFoundException("session not found"));

        assertThat(controller.cardOf("yok")).isEqualTo(OgCard.generic());
    }

    /**
     * Meta ucu ayni karttan turer ama METIN kurar. Host adi olmayan oturumda aciklama
     * "null seni davet etti" olamaz — jenerik hitap devreye girer.
     */
    @Test
    void metaDescribesTheHostAndFallsBackWhenThereIsNoHostRow() {
        when(queries.snapshot("x7k2m")).thenReturn(snapshot(
                session(SessionStatus.SWIPING, "Cuma kahvesi"),
                person("Mehmet", true, false), person("Ayşe", false, false)));
        when(queries.snapshot("hostsuz")).thenReturn(snapshot(
                session(SessionStatus.SWIPING, "Cuma kahvesi"), person("Ayşe", false, false)));

        assertThat(controller.meta("x7k2m").description())
                .isEqualTo("Mehmet seni davet etti · 2 kisi");
        assertThat(controller.meta("hostsuz").description())
                .isEqualTo("Bir arkadasin seni davet etti · 1 kisi");
    }

    /**
     * URL'ler MUTLAK: onizleme sunuculari goreli bir {@code og:image}'i cozemez ve gorsel hic
     * gorunmezdi. Iki adres AYRI ayardan gelir — SPA ile API ayri kaynaklarda yasar.
     * Suresi dolmus/bilinmeyen oturumda bile link uretilir: 404 yerine jenerik meta (kabul c).
     */
    @Test
    void metaBuildsAbsoluteImageAndInviteUrlsEvenForAnUnknownSlug() {
        when(queries.snapshot("yok")).thenThrow(new NotFoundException("session not found"));

        ApiDtos.OgMetaDto meta = controller.meta("yok");

        assertThat(meta.imageUrl()).isEqualTo("https://api.bumpinto.app/og/yok.png");
        assertThat(meta.url()).isEqualTo("https://bumpinto.app/j/yok");
        assertThat(meta.title()).isEqualTo("BumpInto");
        assertThat(meta.description()).isEqualTo("Bu davetin suresi doldu.");
        assertThat(meta.expired()).isTrue();
    }

    /**
     * Slug HTML-ozel karakter tasirsa (bilinmeyen/kotu niyetli girdi — kabul c geregi yine de
     * 200 doner) ham degil YUZDE KACISLI donmeli: govde JSON-guvenlidir (Jackson `"`u escape
     * eder) ama HTML-guvenli DEGILDIR — bu alanlar ileride bir web sayfasinin
     * {@code <meta content="...">} etiketine yazilacak (W-15). Ham `<`/`>`/`"` orada reflected
     * XSS olurdu; percent-encoding ile inert hale gelirler (bkz. Ids.normalizeJoinCode ile ayni
     * mantik: dogrulanmamis girdi asla ham kullanilmaz).
     */
    @Test
    void metaPercentEncodesHtmlSpecialCharactersInTheSlug() {
        String maliciousSlug = "abc\"<b>onerror=alert(1)";
        when(queries.snapshot(maliciousSlug)).thenThrow(new NotFoundException("session not found"));

        ApiDtos.OgMetaDto meta = controller.meta(maliciousSlug);

        assertThat(meta.imageUrl()).doesNotContain("<", ">", "\"");
        assertThat(meta.url()).doesNotContain("<", ">", "\"");
        assertThat(meta.imageUrl()).contains("%3C").contains("%3E").contains("%22");
        assertThat(meta.url()).contains("%3C").contains("%3E").contains("%22");
        assertThat(meta.imageUrl())
                .isEqualTo("https://api.bumpinto.app/og/abc%22%3Cb%3Eonerror=alert(1).png");
        assertThat(meta.url()).isEqualTo("https://bumpinto.app/j/abc%22%3Cb%3Eonerror=alert(1)");
    }

    /**
     * Gercek bir slug [a-z0-9]{8} alfabesinden gelir (bkz. Ids.slug); encode round-trip'i onu
     * DEGISTIRMEMELI — yoksa gercek davet linkleri kirilirdi.
     */
    @Test
    void metaLeavesARealAlphanumericSlugUnchanged() {
        when(queries.snapshot("x7k2m9ab")).thenThrow(new NotFoundException("session not found"));

        ApiDtos.OgMetaDto meta = controller.meta("x7k2m9ab");

        assertThat(meta.imageUrl()).isEqualTo("https://api.bumpinto.app/og/x7k2m9ab.png");
        assertThat(meta.url()).isEqualTo("https://bumpinto.app/j/x7k2m9ab");
    }

    /**
     * Ayni link'i WhatsApp/Slack/X ayni anda ceker; surec ici onbellek olmasa her cekiste
     * yeniden cizilirdi. Onbellek gercekten BAGLI mi: ikinci istek portu bir daha cagirmamali.
     */
    @Test
    void repeatedRequestsForTheSameSlugRenderOnlyOnce() {
        when(queries.snapshot("x7k2m")).thenReturn(snapshot(
                session(SessionStatus.SWIPING, "Cuma kahvesi"), person("Mehmet", true, false)));
        when(queries.snapshot("baska")).thenThrow(new NotFoundException("session not found"));

        controller.card("x7k2m");
        controller.card("x7k2m");
        controller.card("baska"); // ayri slug = ayri girdi

        assertThat(renders.get()).isEqualTo(2);
    }
}
