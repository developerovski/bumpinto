package com.bumpinto.adapter.out.image;

import com.bumpinto.domain.og.OgCard;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;

class AwtOgImageRendererTest {

    final AwtOgImageRenderer renderer = new AwtOgImageRenderer();

    @Test
    void rendersA1200x630PngUnder200Kb() throws Exception {
        byte[] png = renderer.render(new OgCard("Cuma kahvesi", "Kahve · Bar", "Mehmet", 4, false));

        BufferedImage image = ImageIO.read(new ByteArrayInputStream(png));
        assertThat(image.getWidth()).isEqualTo(1200);
        assertThat(image.getHeight()).isEqualTo(630);
        assertThat(png.length).isLessThan(200 * 1024);
        assertThat(png[0]).isEqualTo((byte) 0x89); // PNG imzasi
    }

    @Test
    void expiredCardIsGenericAndStillValid() throws Exception {
        byte[] png = renderer.render(OgCard.generic());

        assertThat(ImageIO.read(new ByteArrayInputStream(png))).isNotNull();
        assertThat(png.length).isLessThan(200 * 1024);
    }

    @Test
    void veryLongTitlesDoNotOverflowTheCanvas() throws Exception {
        byte[] png = renderer.render(new OgCard(
                "Cuma kahvesi ve uzun uzun bir oturum adi ".repeat(4), "Kahve", "Mehmet", 12, false));

        BufferedImage image = ImageIO.read(new ByteArrayInputStream(png));
        assertThat(image.getWidth()).isEqualTo(1200);
        assertThatMarginsAreClean(image);
    }

    /**
     * Oturum adi KULLANICI GIRDISIDIR ve bosluksuz olabilir: kelime bazli sarma boyle bir adi
     * kirpmadan birakirsa yazi tuvalin disina tasar. PNG yine 1200 px dondugu icin yalniz
     * boyut olcen bir kontrol bunu goremez — sag/alt kenar bosluguna murekkep dusmedigi
     * dogrudan piksellerden dogrulanir.
     */
    @Test
    void anUnbrokenTitleIsTruncatedInsteadOfSpillingOutOfTheCard() throws Exception {
        byte[] png = renderer.render(new OgCard("Cumakahvesivecokuzunbirtekkelimeadi".repeat(3),
                "Kahve", "Mehmetinkendinecokuzunbirgorunenadi", 3, false));

        assertThatMarginsAreClean(ImageIO.read(new ByteArrayInputStream(png)));
    }

    /**
     * Regresyon: kirpma kontrolu satirin YALNIZ bazi uretim dallarindaydi. Kisa bir kelimeden
     * SONRA gelen bosluksuz uzun kelime yeni satirin basi olarak olculmeden gecip murekkebi
     * tuvalin kenarina (x=1199) kadar tasiyordu — "sigmayan ilk kelime" testi bu dali hic
     * gormuyordu. Artik her satir tek bir cikis kapisindan (emit) gecer.
     */
    @Test
    void aLongUnbrokenWordAfterAShortOneIsAlsoTruncated() throws Exception {
        byte[] png = renderer.render(new OgCard(
                "Kisa Cumakahvesivecokuzunbirtekkelimeadiburadadevamediyorbak", "Kahve",
                "Mehmet", 3, false));

        assertThatMarginsAreClean(ImageIO.read(new ByteArrayInputStream(png)));
    }

    /** Koyu murekkep (#12161C) yalnizca guvenli alanda; kenar boslugu arka plan kalmali. */
    private static void assertThatMarginsAreClean(BufferedImage image) {
        int pad = 88;
        // 8 px tolerans: glif tasmasi (overhang) advance genisligini bir kac piksel asabilir;
        // gercek tasma onlarca piksellik olur, bu kusak onu yakalar.
        for (int y = 20; y < image.getHeight(); y++) {
            for (int x = image.getWidth() - pad + 8; x < image.getWidth(); x++) {
                assertThat(luminance(image.getRGB(x, y)))
                        .as("sag kenar bosluguna murekkep tasti: (%d, %d)", x, y)
                        .isGreaterThan(60);
            }
        }
        for (int y = image.getHeight() - pad / 2; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                assertThat(luminance(image.getRGB(x, y)))
                        .as("alt kenar bosluguna murekkep tasti: (%d, %d)", x, y)
                        .isGreaterThan(60);
            }
        }
    }

    private static int luminance(int rgb) {
        int r = (rgb >> 16) & 0xFF;
        int g = (rgb >> 8) & 0xFF;
        int b = rgb & 0xFF;
        return (299 * r + 587 * g + 114 * b) / 1000;
    }
}
