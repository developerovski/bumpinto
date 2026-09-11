package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.AuthProvider;
import com.bumpinto.domain.user.Consents;
import com.bumpinto.domain.user.UserProfile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class UserStoreAdapter implements UserStorePort {

    private final UserRepository users;

    public UserStoreAdapter(UserRepository users) {
        this.users = users;
    }

    @Override public UUID upsertByEmail(String email, String name) {
        var existing = users.findByEmail(email);
        if (existing.isPresent()) {
            return withName(existing.get(), name);
        }
        try {
            // saveAndFlush: INSERT'ü burada tetikler ki unique(email) ihlali bu blokta yakalansın.
            return users.saveAndFlush(
                    UserEntity.of(UUID.randomUUID(), email, name, AuthProvider.GOOGLE)).id;
        } catch (DataIntegrityViolationException raceLost) {
            // Aynı e-postayla eşzamanlı ikinci login: findByEmail'i ikimiz de ıskaladık,
            // yarışı kazananın satırını oku.
            return users.findByEmail(email).map(u -> withName(u, name))
                    .orElseThrow(() -> raceLost);
        }
    }

    @Override public UUID upsertByAppleSub(String appleSub, String email, String name) {
        // (1) sub: Apple'in bu uygulama icin sabit kimligi — private-relay e-postasi degisse de
        // ayni hesabi bulur.  (2) e-posta: kisi Google ile girmisse HESAP BIRLESIR.
        Optional<UserEntity> bySub = users.findByAppleSub(appleSub);
        if (bySub.isPresent()) {
            return link(bySub.get(), appleSub, name);
        }
        Optional<UserEntity> byEmail = email == null ? Optional.empty() : users.findByEmail(email);
        if (byEmail.isPresent()) {
            return link(byEmail.get(), appleSub, name);
        }
        UserEntity fresh = UserEntity.of(UUID.randomUUID(), email, name, AuthProvider.APPLE);
        fresh.appleSub = appleSub;
        try {
            return users.saveAndFlush(fresh).id;
        } catch (DataIntegrityViolationException raceLost) {
            return users.findByAppleSub(appleSub).map(u -> link(u, appleSub, name))
                    .orElseThrow(() -> raceLost);
        }
    }

    private UUID link(UserEntity user, String appleSub, String name) {
        user.appleSub = appleSub;
        user.authProviders = withProvider(user.authProviders, AuthProvider.APPLE);
        if (name != null && !name.equals(user.name)) {
            user.name = name;
        }
        users.save(user);
        return user.id;
    }

    /** CSV'ye tekrarsiz ekleme; sira enum sirasi ki yanit deterministik olsun. */
    static String withProvider(String csv, AuthProvider added) {
        EnumSet<AuthProvider> set = parseProviders(csv);
        set.add(added);
        return set.stream().map(Enum::name).collect(Collectors.joining(","));
    }

    static EnumSet<AuthProvider> parseProviders(String csv) {
        EnumSet<AuthProvider> set = EnumSet.noneOf(AuthProvider.class);
        if (csv != null && !csv.isBlank()) {
            Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .map(AuthProvider::valueOf).forEach(set::add);
        }
        return set;
    }

    @Override public void saveAppleRefreshToken(UUID userId, String refreshToken) {
        users.findById(userId).ifPresent(u -> {
            u.appleRefreshToken = refreshToken;
            users.save(u);
        });
    }

    @Override public Optional<String> appleRefreshToken(UUID userId) {
        return users.findById(userId).map(u -> u.appleRefreshToken);
    }

    @Override public void softDelete(UUID userId, Instant deletedAt, Instant purgeAfter) {
        users.findById(userId).ifPresent(u -> {
            u.deletedAt = deletedAt;
            u.purgeAfter = purgeAfter;
            // Kimlik ALANLARI serbest birakilir: e-posta benzersizdir, 30 gun tutulsaydi ayni kisi
            // yeniden kayit olamazdi. Satir denetim icin kalir, kimlik icin degil.
            u.email = "deleted+" + userId + "@invalid";
            u.name = "Silindi";
            u.appleSub = null;
            u.appleRefreshToken = null;
            users.save(u);
        });
    }

    private UUID withName(UserEntity user, String name) {
        String providers = withProvider(user.authProviders, AuthProvider.GOOGLE);
        boolean renamed = name != null && !name.equals(user.name);
        if (renamed || !providers.equals(user.authProviders)) {
            if (renamed) {
                user.name = name;
            }
            user.authProviders = providers;
            users.save(user);
        }
        return user.id;
    }

    @Override public Optional<UserProfile> profileOf(UUID userId) {
        return users.findById(userId).filter(u -> u.deletedAt == null)
                .map(UserStoreAdapter::toProfile);
    }

    @Override public UserProfile saveProfile(UserProfile p) {
        UserEntity u = users.findById(p.id())
                .orElseThrow(() -> new IllegalStateException("unknown user " + p.id()));
        u.name = p.name();
        u.defaultLat = p.defaultLocation() == null ? null : p.defaultLocation().lat();
        u.defaultLng = p.defaultLocation() == null ? null : p.defaultLocation().lng();
        u.defaultLocationLabel = p.defaultLocationLabel();
        u.defaultActivity = p.defaultActivity() == null ? null : p.defaultActivity().name();
        u.language = p.language();
        // Bos liste -> null: "hic secmedim" ile "hepsini sildim" ayni sey, sema da null bekliyor.
        u.interests = p.interests().isEmpty() ? null
                : p.interests().stream().map(ActivityType::name)
                        .collect(java.util.stream.Collectors.joining(","));
        u.defaultTravelMode = p.defaultTravelMode() == null ? null : p.defaultTravelMode().name();
        u.consentLocation = p.consents().location();
        u.consentMicrophone = p.consents().microphone();
        u.consentAnalytics = p.consents().analytics();
        u.consentsUpdatedAt = p.consents().updatedAt();
        u.consentsVersion = p.consents().version();
        users.save(u);
        return toProfile(u);
    }

    static UserProfile toProfile(UserEntity u) {
        GeoPoint loc = (u.defaultLat == null || u.defaultLng == null) ? null
                : new GeoPoint(u.defaultLat, u.defaultLng);
        return new UserProfile(u.id, u.email, u.name, loc, u.defaultLocationLabel,
                u.defaultActivity == null ? null : ActivityType.valueOf(u.defaultActivity),
                u.language,
                u.defaultTravelMode == null ? null : TravelMode.valueOf(u.defaultTravelMode),
                parseProviders(u.authProviders),
                new Consents(u.consentLocation, u.consentMicrophone, u.consentAnalytics,
                        u.consentsUpdatedAt, u.consentsVersion),
                parseInterests(u.interests));
    }

    /** CSV -> liste. Bos/null ayni sey: filtresiz. */
    private static List<ActivityType> parseInterests(String csv) {
        return csv == null || csv.isBlank() ? List.of()
                : java.util.Arrays.stream(csv.split(",")).map(ActivityType::valueOf).toList();
    }
}
