package com.bumpinto.adapter.out.image;

import com.bumpinto.domain.og.OgCard;
import com.bumpinto.domain.port.OgImagePort;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Saf JDK ile cizim: yeni bagimlilik YOK. TYPE_INT_RGB (alfa yok) + duz renkler PNG'yi ~20 KB'da
 * tutar; 200 KB tavani (R-B10 kabul a) foto GOMULMEDIGI icin rahat gecilir — foto gomulseydi hem
 * boyut hem de saglayici lisansi (FSQ/Google gorsel yeniden yayin) sorun olurdu. Mantiksal yazi
 * tipi kullanilir: konteyner imajinda fontconfig bulunmali (docs/CONFIGURATION.md).
 */
@Component
class AwtOgImageRenderer implements OgImagePort {

    private static final int W = 1200;
    private static final int H = 630;
    private static final int PAD = 88;
    private static final int TITLE_LINE_HEIGHT = 92;
    private static final int TITLE_MAX_LINES = 3;
    private static final Color INK = new Color(0x12, 0x16, 0x1C);
    private static final Color MUTED = new Color(0x5B, 0x64, 0x72);
    private static final Color TOP = new Color(0xFF, 0xF7, 0xEE);
    private static final Color BOTTOM = new Color(0xEA, 0xF1, 0xFF);
    private static final Color ACCENT = new Color(0xE8, 0x6A, 0x33);
    private static final String ELLIPSIS = "…";

    @Override
    public byte[] render(OgCard card) {
        BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
                    RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setPaint(new GradientPaint(0, 0, TOP, 0, H, BOTTOM));
            g.fillRect(0, 0, W, H);
            g.setColor(ACCENT);
            g.fillRect(0, 0, W, 12);

            int maxWidth = W - 2 * PAD;
            g.setColor(MUTED);
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 30));
            g.drawString(fit(g.getFontMetrics(), text(card.activityLabel(), "BumpInto"), maxWidth),
                    PAD, PAD + 30);

            g.setColor(INK);
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 76));
            int y = PAD + 150;
            for (String line : wrap(g.getFontMetrics(), card.title(), maxWidth, TITLE_MAX_LINES)) {
                g.drawString(line, PAD, y);
                y += TITLE_LINE_HEIGHT;
            }

            g.setColor(MUTED);
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 34));
            g.drawString(fit(g.getFontMetrics(), footer(card), maxWidth), PAD, H - PAD);
            return toPng(image);
        } finally {
            g.dispose();
        }
    }

    private static String footer(OgCard card) {
        if (card.expired()) {
            return "Bu davetin suresi doldu · bumpinto.app";
        }
        String host = text(card.hostDisplayName(), "Bir arkadasin");
        return host + " davet etti · " + card.participantCount() + " kisi · bumpinto.app";
    }

    private static String text(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.strip();
    }

    /**
     * Kelime kelime sarar ve HER satirin {@code maxWidth}'e sigdigini GARANTI eder. Sigmayan
     * satiri kirpmadan birakmak, bosluksuz uzun bir oturum adinda (kullanici girdisi) yaziyi
     * tuvalin disina tasirdi; PNG 1200 px kalir ama kart kirpik gorunurdu.
     *
     * <p>Satirlar listeye YALNIZ {@link #emit} uzerinden girer: kirpmayi dallara serpistirmek
     * bir dali (bir onceki surumde "sigmayan kelime yeni satirin BASI olur" dali) sessizce
     * disarida birakmisti ve kisa bir kelimeden sonra gelen uzun kelime tuvali tasiriyordu.
     */
    private static List<String> wrap(FontMetrics metrics, String text, int maxWidth, int maxLines) {
        List<String> lines = new ArrayList<>(maxLines);
        String line = "";
        for (String word : text(text, "BumpInto").split("\\s+")) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            if (metrics.stringWidth(candidate) <= maxWidth) {
                line = candidate;
            } else if (lines.size() + 1 >= maxLines) {
                // Son satir: kalan metin sigdigi kadar yazilir, sonrasi cizilmez.
                line = candidate;
                break;
            } else if (line.isEmpty()) {
                // Tek basina bile sigmayan kelime: bolunemez, kendi satirinda kirpilir.
                emit(lines, metrics, word, maxWidth);
            } else {
                emit(lines, metrics, line, maxWidth);
                line = word;
            }
        }
        emit(lines, metrics, line, maxWidth);
        return lines.isEmpty() ? List.of("BumpInto") : lines;
    }

    /** Cizilecek satirlarin TEK cikis kapisi: hangi dal urettiyse uretsin, sigdirilmis girer. */
    private static void emit(List<String> lines, FontMetrics metrics, String line, int maxWidth) {
        if (!line.isEmpty()) {
            lines.add(fit(metrics, line, maxWidth));
        }
    }

    /** Sigana kadar sondan kirpar ve "…" ekler; sigiyorsa oldugu gibi doner. */
    private static String fit(FontMetrics metrics, String text, int maxWidth) {
        if (metrics.stringWidth(text) <= maxWidth) {
            return text;
        }
        int end = text.length();
        while (end > 0 && metrics.stringWidth(text.substring(0, end) + ELLIPSIS) > maxWidth) {
            end--;
        }
        return text.substring(0, end) + ELLIPSIS;
    }

    /**
     * Bellek ici onbellek BILINCLI: {@code ImageIO.write(.., OutputStream)} varsayilan olarak
     * {@code java.io.tmpdir} altinda gecici bir dosya acar — salt okunur bir konteyner kokunde
     * ya da her istekte disk yazmak istemedigimiz bir uc icin yanlis varsayilan.
     */
    private static byte[] toPng(BufferedImage image) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024);
        try (MemoryCacheImageOutputStream stream = new MemoryCacheImageOutputStream(out)) {
            if (!ImageIO.write(image, "png", stream)) {
                throw new IllegalStateException("no PNG writer registered");
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }
}
