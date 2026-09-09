#!/usr/bin/env node
/* BASE=http://localhost:8060 node scripts/ws-smoke.mjs
 *
 * Oturum kurar, ses odasını açar, kendi ses kutusuna abone olur ve KENDİNE bir ICE sinyali
 * yollar: sunucu `from` damgasını basıp geri iletirse köprü çalışıyordur.
 *
 * NEDEN VAR: birim testler sahte soketle koşar. El sıkışma kimliği (`X-Participant-Token`
 * BAŞLIĞI — mobilde çerez yok) ve `/app/.../voice/signal` rölesi framework YAPIŞTIRICISIDIR;
 * repo kuralı gereği gerçek istemciyle doğrulanır.
 */
import { Client } from "@stomp/stompjs";
import WebSocket from "ws";

const base = process.env.BASE ?? "http://localhost:8060";

const post = async (path, body, token) => {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "content-type": "application/json",
      "X-Client": "mobile",
      ...(token ? { "X-Participant-Token": token } : {}),
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

/* Oturum KURMAK kimlik doğrulaması ister (SecurityConfig: yalnız katılım ucu
   `/api/sessions/{slug}/participants` herkese açık). Bu yüzden betik MİSAFİR yolundan gider — mobilin derin linkle katılan
   kullanıcısının yaptığı şeyin aynısı: var olan bir oturuma katıl, katılımcı jetonunu al.

   SLUG=<slug> node scripts/ws-smoke.mjs   (oturum COLLECTING/BROWSING olmalı) */
const slug = process.env.SLUG;
if (!slug) {
  console.error("SLUG gerekli: SLUG=x7k2m node scripts/ws-smoke.mjs");
  console.error("Açık bir oturum yoksa uygulamadan/web'den bir tane kur.");
  process.exit(2);
}

/* TOKEN verilirse katılım ADIMI ATLANIR ve o kimlikle bağlanılır. Sinyal RÖLESİNİ uçtan uca
   doğrulamak için bu ŞART: oda açmak host'a özeldir (`403 only the host can do this`) ve
   röle odası olmayan sinyali sessizce düşürür (VoiceSignalController: `room.hasMember`).
   Host jetonu uygulamanın ağ günlüğünden ya da web oturumundan alınır. */
const givenToken = process.env.TOKEN;

/* Sözleşme `JoinRequest` (§2) — alan adları DEĞİŞTİRİLMEZ. Konum orta noktaya 100 km'den
   uzaksa sunucu 409 döner; Eindhoven merkezli oturumlar için bu koordinat güvenli. */
let token = givenToken;
let me;
if (token) {
  const view = await fetch(`${base}/api/sessions/${slug}`, {
    headers: { "X-Client": "mobile", "X-Participant-Token": token },
  }).then((r) => r.json());
  me = view.viewer?.participantId;
} else {
  const joined = await post(`/api/sessions/${slug}/participants`, {
    displayName: "Smoke",
    lat: 51.44,
    lng: 5.47,
    locationLabel: "Eindhoven",
    travelMode: "BIKE",
  });
  token = joined.participantToken;
  me = joined.participantId ?? joined.viewer?.participantId;
}
if (!token || !me) {
  throw new Error("katılımcı kimliği alınamadı");
}

/* Ses odasını AÇMAK host'a özeldir. Misafirde 403 gelir; o durumda EL SIKIŞMA yine sınanır
   ama röle sınanamaz — betik bunu açıkça söyler, sessizce "geçti" demez. */
let roomOpen = true;
try {
  await post(`/api/sessions/${slug}/voice`, null, token);
} catch (e) {
  roomOpen = false;
  console.warn(`UYARI oda açılamadı: ${e.message}`);
}

const client = new Client({
  webSocketFactory: () =>
    new WebSocket(`${base.replace(/^http/, "ws")}/api/sessions/${slug}/ws`, {
      headers: { "X-Participant-Token": token },
    }),
  reconnectDelay: 0,
});

const done = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("sinyal 5 sn içinde dönmedi")), 5000);
  client.onStompError = (frame) => reject(new Error(frame.headers.message));
  client.onWebSocketError = (e) => reject(new Error(`ws hatası: ${e?.message ?? e}`));
  client.onConnect = () => {
    // BURAYA GELMEK el sıkışmanın geçtiği anlamına gelir: token başlıkla taşındı, 401 yok.
    console.log("OK el sıkışma — X-Participant-Token başlıkla kabul edildi");
    if (!roomOpen) {
      clearTimeout(timer);
      reject(
        new Error(
          "röle sınanamadı: ses odası KAPALI (host değilsin). TOKEN=<host jetonu> ile tekrar koş.",
        ),
      );
      return;
    }
    client.subscribe(`/topic/session/${slug}/voice/${me}`, (message) => {
      clearTimeout(timer);
      const signal = JSON.parse(message.body);
      if (signal.from !== me) reject(new Error(`from damgası yanlış: ${signal.from}`));
      else resolve(signal);
    });
    // Abonelik = üyelik (K4): koltuk kurulmadan rölenin hedefi yoktur.
    setTimeout(
      () =>
        client.publish({
          destination: `/app/sessions/${slug}/voice/signal`,
          body: JSON.stringify({
            to: me,
            type: "ice",
            candidate: { candidate: "smoke", sdpMid: "0", sdpMLineIndex: 0 },
          }),
          headers: { "content-type": "application/json" },
        }),
      300,
    );
  };
});

client.activate();
console.log("OK", await done);
await client.deactivate();
