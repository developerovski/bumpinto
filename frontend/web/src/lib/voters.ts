import type { ParticipantDto } from "@bumpinto/shared";

/** Deste/Runoff akışına dahil katılımcılar — canlı konumu var ve host tarafından elle
    eklenmemiş. RunoffScreen (tie), RunoffStatus (sayaç), DeckProgressNote ve FinishedCard
    aynı süzgeci uyguluyordu; TEK yerde tanımlanır (code-review bulgusu). */
export function votersOf(participants: ParticipantDto[]): ParticipantDto[] {
  return participants.filter((p) => p.hasLocation && !p.manual);
}

/** `voters`in TAMAMI `ids` içinde mi (herkes oy verdi/kilitledi mi). Boş listede FALSE döner —
    "oy verecek kimse yok" durumu "herkes bitirdi" değildir. */
export function allVoted(voters: ParticipantDto[], ids: string[]): boolean {
  return voters.length > 0 && voters.every((p) => !!p.id && ids.includes(p.id));
}
