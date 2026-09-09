package com.bumpinto.support;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.infra.config.AppProps;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Testlerin ortak AppProps'u; yalniz ilgilendigi kaydi degistirir. */
public final class TestProps {

    private TestProps() {
    }

    public static AppProps.Security security() {
        return new AppProps.Security("cid", "0123456789abcdef0123456789abcdef",
                Duration.ofMinutes(15), Duration.ofDays(30));
    }

    public static AppProps.Apple apple() {
        return new AppProps.Apple("app.bumpinto.web", "app.bumpinto.ios", "TEAM123456",
                "KEY1234567", "");
    }

    /** Apple alanini degistirir (yapilandirilmis/degil varyasyonlari), gerisi defaults(). */
    public static AppProps withApple(AppProps.Apple apple) {
        AppProps base = defaults();
        return new AppProps(base.security(), apple, base.cors(), base.cookies(), base.rateLimit(),
                base.geocode(), base.voice(), base.turn(), base.venues(), base.map(),
                base.routing(), base.retention(), base.og());
    }

    public static AppProps.Og og() {
        return new AppProps.Og(Duration.ofSeconds(24), "https://bumpinto.app",
                "https://api.bumpinto.app");
    }

    public static AppProps.Venues venues() {
        Map<String, AppProps.VenueSourceProps> sources = new LinkedHashMap<>();
        sources.put("foursquare", new AppProps.VenueSourceProps(true, "fsq-key", 5000));
        sources.put("open", new AppProps.VenueSourceProps(true, "", 0));
        sources.put("google", new AppProps.VenueSourceProps(false, "g-key", 1000));
        Map<ActivityType, String> route = new LinkedHashMap<>();
        for (ActivityType type : ActivityType.values()) {
            route.put(type, "open");
        }
        route.put(ActivityType.COFFEE, "foursquare,open");
        route.put(ActivityType.FOOD, "foursquare,open");
        route.put(ActivityType.BAR, "foursquare,open");
        route.put(ActivityType.NIGHTLIFE, "foursquare,open");
        return new AppProps.Venues(sources, route);
    }

    public static AppProps defaults() {
        return of(security(), venues(), new AppProps.RateLimit(false), new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.Security security) {
        return of(security, venues(), new AppProps.RateLimit(false), new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.Venues venues) {
        return of(security(), venues, new AppProps.RateLimit(false), new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.RateLimit rateLimit) {
        return of(security(), venues(), rateLimit, new AppProps.Turn("", ""));
    }

    public static AppProps of(AppProps.Turn turn) {
        return of(security(), venues(), new AppProps.RateLimit(false), turn);
    }

    /** Geocode alanini degistirir (minInterval/contact varyasyonlari icin), gerisi defaults(). */
    public static AppProps withGeocode(AppProps.Geocode geocode) {
        AppProps base = defaults();
        return new AppProps(base.security(), base.apple(), base.cors(), base.cookies(), base.rateLimit(),
                geocode, base.voice(), base.turn(), base.venues(), base.map(),
                base.routing(), base.retention(), base.og());
    }

    /** Voice alanini degistirir (maxDuration varyasyonlari icin), gerisi defaults(). */
    public static AppProps withVoice(AppProps.Voice voice) {
        AppProps base = defaults();
        return new AppProps(base.security(), base.apple(), base.cors(), base.cookies(), base.rateLimit(),
                base.geocode(), voice, base.turn(), base.venues(), base.map(),
                base.routing(), base.retention(), base.og());
    }

    /** Routing alanini degistirir (OSRM base URL varyasyonlari icin), gerisi defaults(). */
    public static AppProps withRouting(AppProps.Routing routing) {
        AppProps base = defaults();
        return new AppProps(base.security(), base.apple(), base.cors(), base.cookies(), base.rateLimit(),
                base.geocode(), base.voice(), base.turn(), base.venues(), base.map(),
                routing, base.retention(), base.og());
    }

    public static AppProps of(AppProps.Security security, AppProps.Venues venues,
                              AppProps.RateLimit rateLimit, AppProps.Turn turn) {
        return of(security, new AppProps.Cors(List.of("http://localhost:5173")),
                new AppProps.Cookies(false, ""), rateLimit, turn, venues);
    }

    /** Cors/Cookies de degisen testler icin (guvenlik matrisi, sir maskeleme). */
    public static AppProps of(AppProps.Security security, AppProps.Cors cors,
                              AppProps.Cookies cookies, AppProps.RateLimit rateLimit,
                              AppProps.Turn turn, AppProps.Venues venues) {
        return new AppProps(security, apple(), cors, cookies, rateLimit,
                new AppProps.Geocode("dev@bumpinto.test", Duration.ofMillis(1),
                        "https://nominatim.openstreetmap.org"),
                new AppProps.Voice(Duration.ofHours(2)), turn,
                venues,
                new AppProps.MapProps("maplibre",
                        new AppProps.MapProps.Tiles("https://tiles.example/style.json")),
                new AppProps.Routing(new AppProps.Routing.Osrm("", "", "")),
                new AppProps.Retention(true), og());
    }
}
