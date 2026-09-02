import type { AxiosInstance } from "axios";
import type { components } from "./api-types";

export type Schemas = components["schemas"];
export type SessionView = Schemas["SessionView"];
export type VenueDto = Schemas["VenueDto"];
export type ParticipantDto = Schemas["ParticipantDto"];
export type MeResponse = Schemas["MeResponse"];
export type SessionSummaryDto = Schemas["SessionSummaryDto"];
export type SessionPreview = Schemas["SessionPreview"];

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
    logout: () => http.post("/api/auth/logout").then(() => undefined),
    preview: (slug: string) =>
      http.get<SessionPreview>(`/api/sessions/${slug}/preview`).then((r) => r.data),
  };
}

export type BumpintoApi = ReturnType<typeof createBumpintoApi>;
