package com.bumpinto.adapter.out.turn;

import com.bumpinto.domain.port.TurnCredentialsPort;
import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Cloudflare Realtime TURN: uzun omurlu anahtar YALNIZ burada, istemciye kisa omurlu kimlik
 * gider. Her hata yolu STUN'a duser ve WARN loglar — TURN azinliga lazim, cogunlugu ucuncu
 * tarafin kesintisine kurban etmeyiz (spec K11).
 */
@Component
public class CloudflareTurnCredentials implements TurnCredentialsPort {

    private static final Logger log = LoggerFactory.getLogger(CloudflareTurnCredentials.class);
    private static final String URL =
            "https://rtc.live.cloudflare.com/v1/turn/keys/{keyId}/credentials/generate-ice-servers";
    /** "Katil" yolundadir; paylasilan 5 sn butcesi burada fazla, STUN'a dusmek ucuz. */
    private static final int REQUEST_TIMEOUT_MS = 2000;

    private final UnirestInstance http;
    private final AppProps.Turn turn;

    public CloudflareTurnCredentials(UnirestInstance http, AppProps props) {
        this.http = http;
        this.turn = props.turn();
        if (!turn.configured()) {
            log.warn("TURN is not configured (bumpinto.turn.*): voice chat will offer STUN only");
        }
    }

    @Override
    public IceConfig issue(Duration ttl) {
        if (!turn.configured()) {
            return IceConfig.stunOnly();
        }
        try {
            HttpResponse<JsonNode> response = http.post(URL)
                    .routeParam("keyId", turn.keyId())
                    .requestTimeout(REQUEST_TIMEOUT_MS)
                    .header("Authorization", "Bearer " + turn.apiToken())
                    .header("Content-Type", "application/json")
                    .body("{\"ttl\":" + ttl.toSeconds() + "}")
                    .asJson();
            if (!response.isSuccess() || response.getBody() == null) {
                log.warn("TURN credentials refused: HTTP {}", response.getStatus());
                return IceConfig.stunOnly();
            }
            List<IceConfig.IceServer> servers = parse(response.getBody().getObject());
            if (servers.isEmpty()) {
                log.warn("TURN credentials response carried no usable iceServers");
                return IceConfig.stunOnly();
            }
            return new IceConfig(servers, true);
        } catch (RuntimeException e) {
            // UnirestException (ag/zaman asimi) ve JSONException (beklenmedik govde sekli)
            // ayni cikisi paylasir: hicbiri firlamaz, STUN'a duseriz.
            log.warn("TURN credentials unreachable: {}", e.getMessage());
            return IceConfig.stunOnly();
        }
    }

    /** Cevap: {"iceServers":[{urls, username, credential}]} — eski uc tek nesne dondurur, ikisi de okunur. */
    private static List<IceConfig.IceServer> parse(JSONObject body) {
        List<IceConfig.IceServer> out = new ArrayList<>();
        JSONArray array = body.optJSONArray("iceServers");
        if (array != null) {
            for (int i = 0; i < array.length(); i++) {
                add(out, server(array.getJSONObject(i)));
            }
            return out;
        }
        JSONObject single = body.optJSONObject("iceServers");
        if (single != null) {
            add(out, server(single));
        }
        return out;
    }

    /** urls'siz sunucu RTCPeerConnection kurucusunu patlatir; listeye girmez. */
    private static void add(List<IceConfig.IceServer> out, IceConfig.IceServer server) {
        if (!server.urls().isEmpty()) {
            out.add(server);
        }
    }

    private static IceConfig.IceServer server(JSONObject node) {
        List<String> urls = new ArrayList<>();
        JSONArray array = node.optJSONArray("urls");
        if (array != null) {
            for (int i = 0; i < array.length(); i++) {
                urls.add(array.getString(i));
            }
        } else if (node.optString("urls", null) != null) {
            urls.add(node.getString("urls"));
        }
        return new IceConfig.IceServer(urls, node.optString("username", null),
                node.optString("credential", null));
    }
}
