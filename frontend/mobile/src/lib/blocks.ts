import type { ParticipantDto } from "@bumpinto/shared";

/**
 * Sesli sohbet eşleşme listesi (R-M7).
 *
 * M-6 mesh'i YALNIZ bu listeye teklif gönderir: engellenmiş çift asla aynı odaya alınmaz.
 * Süzme istemcide yapılır çünkü engelleme TEK YÖNLÜDÜR ve karşı taraf bunu görmemelidir
 * (Apple 1.2: bildiren, bildirdiğini göstermez).
 */
export function voicePeers(participants: ParticipantDto[], selfId: string): ParticipantDto[] {
  return participants.filter((p) => p.id !== selfId && p.blocked !== true);
}
