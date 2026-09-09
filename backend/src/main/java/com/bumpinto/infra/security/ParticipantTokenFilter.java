package com.bumpinto.infra.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Bean DEĞİL: Boot her Filter bean'ini servlet zincirine de kaydeder, o da bu filtreyi
 * istek başına iki kez çalıştırırdı. Yalnızca SecurityConfig kurar.
 *
 * <p>Tek işi vardır: <b>kimlik var mı</b>. İmza + iki claim karşılaştırması, SIFIR DB okuması ve
 * SIFIR yetki kararı. "Bu kişi host mu, üye mi, ne yapabilir" sorularının hiçbiri buraya ait
 * değildir; hepsi uygulama katmanında, veriye bakarak yanıtlanır ({@code DeckFlow.requireHost},
 * {@code requireMember}, {@code SessionCommands.updateLocation}). Bu yüzden silinmiş bir
 * katılımcının token'ı imzası geçerli olsa da hiçbir şey yazamaz.
 *
 * <p>Bearer filtresinden SONRA kurulur ve hesap kimliğinin ÜSTÜNE yazar. Sıra tersi olamaz:
 * Spring'in {@code BearerTokenAuthenticationFilter}'ı context'i koşulsuz değiştirir, ondan önce
 * konan katılımcı principal'i hiçbir zaman hayatta kalmazdı — Google ile girmiş bir davetli
 * katıldıktan sonra kendi konumunu bile kaydedemiyordu (2026-09-03).
 *
 * <p>Bu sıranın bedeli 2026-09-09'da ortaya çıktı (K-M38): bearer filtresi GEÇERSİZ bir jetonda
 * zinciri kesince bu filtre hiç çalışamıyor ve misafirin geçerli oturum kimliği görülemeden
 * 401 dönüyordu. Çözüm sırayı değiştirmek değil, bayat jetonu resolver'da düşürmek oldu
 * (bkz. {@link SecurityConfig#bearerTokenResolver}).
 *
 * <p>Katılımcı principal'i hesap principal'inin üstüne yazar ama hesap kimliğini YOK ETMEZ:
 * doğrulanmış {@code Jwt} {@code details}'e asılır. Çünkü tarayıcıda kalmış bir katılımcı çerezi
 * yanlış koltuğu gösteriyor olabilir — üye önce anonim katılıp sonra giriş yapmışsa, o çerez
 * kendi oturumunun sahibini bile misafire çevirirdi. Hangi koltuğun doğru olduğunu ancak VERİYE
 * bakan katman bilir ({@code WebPrincipals.seatOf}, {@code participants.user_id}); filtre o kararı
 * vermez, yalnızca iki kimliği de sonraki katmana taşır.
 */
public class ParticipantTokenFilter extends OncePerRequestFilter {

    /** Çözüm gövdesi {@link ParticipantTokens}'te; bu sabit çağıranların adresidir. */
    public static final String HEADER = ParticipantTokens.HEADER;

    private final JwtDecoder decoder;

    public ParticipantTokenFilter(JwtDecoder decoder) {
        this.decoder = decoder;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        ParticipantTokens.resolve(request, decoder)
                .ifPresent(ParticipantTokenFilter::authenticate);
        chain.doFilter(request, response);
    }

    private static void authenticate(ParticipantPrincipal participant) {
        Authentication previous = SecurityContextHolder.getContext().getAuthentication();
        var auth = new UsernamePasswordAuthenticationToken(participant, null,
                List.of(new SimpleGrantedAuthority("ROLE_PARTICIPANT")));
        if (previous != null && previous.getPrincipal() instanceof Jwt account) {
            auth.setDetails(account); // uzerine yazilan hesap kimligi: kaybolmaz, yanda durur
        }
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
