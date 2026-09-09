import type { AxiosInstance } from "axios";
import type { components } from "./api-types";

export type Schemas = components["schemas"];
export type SessionView = Schemas["SessionView"];
export type VenueDto = Schemas["VenueDto"];
export type ParticipantDto = Schemas["ParticipantDto"];
export type MeResponse = Schemas["MeResponse"];
export type Consents = Schemas["ConsentsDto"];
export type BlockDto = Schemas["BlockDto"];
export type ReportReason = NonNullable<Schemas["ReportRequest"]["reason"]>;
export type SessionSummaryDto = Schemas["SessionSummaryDto"];
export type SessionPreview = Schemas["SessionPreview"];

/* Yazma gövdesi §2: üç boolean. Üretilen istek şemasının adı B-14'e bağlı olduğundan ELLE
   yazılır — alanlar birebir aynı. Okuma `MeResponse.consents`'tan (updatedAt/version dahil). */
export type ConsentsInput = { location: boolean; microphone: boolean; analytics: boolean };
export type AppleLoginRequest = { identityToken: string; nonce: string; fullName?: string };

/* /api/config sözleşmesi (spec §7) ELLE yazılır: üç planın (B-13 / W-12 / I-2) ortak sözleşmesi. */
export type MapEngine = "maplibre" | "google";
export type AppConfigSource = {
  id: string;
  attributionKey: string;
  attributionUrl: string | null;
  ratingScale: 5 | 10 | null;
};
export type AppConfig = {
  mapEngine: MapEngine;
  tiles: { styleUrl: string };
  sources: AppConfigSource[];
};

export function createBumpintoApi(http: AxiosInstance) {
  return {
    loginGoogle: (idToken: string) =>
      http.post<Schemas["LoginResponse"]>("/api/auth/google", { idToken }).then((r) => r.data),
    createSession: (body: Schemas["CreateSessionRequest"]) =>
      http.post<Schemas["CreateSessionResponse"]>("/api/sessions", body).then((r) => r.data),
    getSession: (slug: string) =>
      http.get<SessionView>(`/api/sessions/${slug}`).then((r) => r.data),
    join: (slug: string, body: Schemas["JoinRequest"]) =>
      http.post<Schemas["JoinResponse"]>(`/api/sessions/${slug}/participants`, body)
        .then((r) => r.data),
    updateLocation: (slug: string, body: Schemas["LocationRequest"]) =>
      http.put(`/api/sessions/${slug}/location`, body).then(() => undefined),
    findVenues: (slug: string) =>
      http.post<SessionView>(`/api/sessions/${slug}/find-venues`).then((r) => r.data),
    swipe: (slug: string, body: Schemas["SwipeRequest"]) =>
      http.post(`/api/sessions/${slug}/swipes`, body).then(() => undefined),
    undoSwipe: (slug: string, venueId: string) =>
      http.delete(`/api/sessions/${slug}/swipes/${venueId}`).then(() => undefined),
    deckDone: (slug: string) =>
      http.post(`/api/sessions/${slug}/deck-done`).then(() => undefined),
    forceDecision: (slug: string, body?: Schemas["ForceDecisionRequest"]) =>
      http.post<SessionView>(`/api/sessions/${slug}/force-decision`, body ?? {})
        .then((r) => r.data),
    runoffVote: (slug: string, body: Schemas["RunoffVoteRequest"]) =>
      http.post(`/api/sessions/${slug}/runoff-votes`, body).then(() => undefined),
    shuffle: (slug: string) =>
      http.post<SessionView>(`/api/sessions/${slug}/shuffle`).then((r) => r.data),
    addPoint: (slug: string, body: Schemas["PointRequest"]) =>
      http.post<ParticipantDto>(`/api/sessions/${slug}/points`, body).then((r) => r.data),
    removePoint: (slug: string, participantId: string) =>
      http.delete(`/api/sessions/${slug}/points/${participantId}`).then(() => undefined),
    listSessions: () =>
      http.get<Schemas["SessionListResponse"]>("/api/sessions").then((r) => r.data),
    me: () => http.get<MeResponse>("/api/me").then((r) => r.data),
    updateMe: (body: Schemas["UpdateMeRequest"]) =>
      http.put<MeResponse>("/api/me", body).then((r) => r.data),
    /* Yenileme jetonu SUNUCUDA iptal edilsin diye gönderilir: mobilde gövdeyle (çerez yok),
       webde çerez zaten gider ve argüman verilmez. Yalnız cihazdan silmek, çalınmış bir
       kopyayı 30 gün daha canlı bırakırdı.
       `refresh` BİLEREK bu arayüze EKLENMEZ: kesicinin takılı olduğu örnekten çağrılırsa
       kendi 401'i kesiciye geri düşer. Platformlar onu kesicisiz ham axios ile atar. */
    logout: (refreshToken?: string) =>
      http.post("/api/auth/logout", refreshToken ? { refreshToken } : {}).then(() => undefined),
    preview: (slug: string) =>
      http.get<SessionPreview>(`/api/sessions/${slug}/preview`).then((r) => r.data),
    /* 5 haneli davet kodunu slug'a çevirir (§2). Kod GİZLİ değildir ama oturumu da açmaz:
       yanıt yalnız `SessionPreview` — katılım hâlâ `/j/<slug>` akışından geçer. */
    sessionByCode: (code: string) =>
      http.get<SessionPreview>(`/api/sessions/by-code/${code}`).then((r) => r.data),
    getConfig: () => http.get<AppConfig>("/api/config").then((r) => r.data),
    geocode: (body: { query: string; biasLat?: number; biasLng?: number }) =>
      http.post<{ lat: number; lng: number; label: string }>("/api/geocode", body).then((r) => r.data),
    reverseGeocode: (body: { lat: number; lng: number }) =>
      http.post<{ label: string | null }>("/api/geocode/reverse", body).then((r) => r.data),
    voiceStart: (slug: string) =>
      http.post<Schemas["VoiceStartResponse"]>(`/api/sessions/${slug}/voice`).then((r) => r.data),
    voiceEnd: (slug: string) =>
      http.delete(`/api/sessions/${slug}/voice`).then(() => undefined),
    voiceCredentials: (slug: string) =>
      http.post<Schemas["VoiceCredentialsResponse"]>(`/api/sessions/${slug}/voice/credentials`)
        .then((r) => r.data),
    report: (body: Schemas["ReportRequest"]) =>
      http.post("/api/reports", body).then(() => undefined),
    blockParticipant: (body: Schemas["BlockRequest"]) =>
      http.post<Schemas["BlockDto"]>("/api/me/blocks", body).then((r) => r.data),
    /* Sunucu ZARFSIZ dizi döner (`BlockDto[]`) — sözleşmede `BlockListResponse` yok (M-5:T1). */
    listBlocks: () =>
      http.get<Schemas["BlockDto"][]>("/api/me/blocks").then((r) => r.data),
    removeBlock: (blockId: string) =>
      http.delete(`/api/me/blocks/${blockId}`).then(() => undefined),
    nudge: (slug: string, participantId: string) =>
      http.post(`/api/sessions/${slug}/nudge/${participantId}`).then(() => undefined),
    loginApple: (body: AppleLoginRequest) =>
      http.post<Schemas["LoginResponse"]>("/api/auth/apple", body).then((r) => r.data),
    // PUT yanıt gövdesi sözleşmede sabit değil — yazımdan sonra `me()` tazelenir (authStore).
    putConsents: (body: ConsentsInput) =>
      http.put("/api/me/consents", body).then(() => undefined),
    // 1/saat sınırlı, attachment JSON. Blob alınır; indirmeyi çağıran yapar.
    // NOT (K-W27): sunucu ucu B-15'te iniyor — o zamana dek çalışma anında 404 döner.
    exportMyData: () =>
      http.get<Blob>("/api/me/export", { responseType: "blob" }).then((r) => r.data),
    deleteMe: () => http.delete("/api/me").then(() => undefined),
  };
}

export type BumpintoApi = ReturnType<typeof createBumpintoApi>;
