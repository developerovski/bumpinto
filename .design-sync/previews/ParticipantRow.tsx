import type { ReactNode } from "react";
import { ParticipantRow } from "@bumpinto/web";
import { DENIZ_P, ELIF_P, MEHMET, SELIN_P } from "./_fixtures";

/* W2 · satırlar ParticipantList'in kart kabuğunda yaşar; tek satır da orada gösterilmeli.
   Dış çerçeve satır içi stille: `.design-sync/previews` sınıfları hızlı döngüde
   (preview-rebuild) compile olmuyor — kart kabuğu ise ParticipantList'ten birebir alındı. */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

function RowCard({ children }: { children: ReactNode }) {
  return (
    <div style={COL}>
      <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">{children}</div>
    </div>
  );
}

/** W2 · buluşmayı kuran: rozet önceliği "Kuran"da — hazır/bekliyor rozeti basılmaz.
    Alt satır semt + ulaşım ikonu + orta noktaya dakika. */
export function Host() {
  return (
    <RowCard>
      <ParticipantRow participant={MEHMET} index={0} />
    </RowCard>
  );
}

/** Konumunu atmış katılımcı — halkalı avatar, yeşil "Hazır", araba ikonu. */
export function Ready() {
  return (
    <RowCard>
      <ParticipantRow participant={ELIF_P} index={1} />
    </RowCard>
  );
}

/** Henüz konum göndermemiş — soluk avatar, "Konum bekleniyor…" alt satırı,
    amber "Bekliyor" rozeti; ulaşım ikonu hiç çizilmez. */
export function WaitingLocation() {
  return (
    <RowCard>
      <ParticipantRow participant={DENIZ_P} index={2} />
    </RowCard>
  );
}

/** Kendi satırın — adın yanında "(sen)". Konum etiketi katılımcı nesnesinden gelir,
    ayrı prop DEĞİL (B-7:T1 — `travelMode`/`midpointMinutes` de aynı nesnede). */
export function Self() {
  return (
    <RowCard>
      <ParticipantRow participant={MEHMET} index={0} isSelf />
    </RowCard>
  );
}

/** Çevrimdışı satır: `online === false` → %55 opaklık + alt satıra tek kelime.
    Ayrı rozet YOK, "geç kaldı" damgası YOK — ürünün dil kuralları suçlayıcı ifadeyi yasaklar.
    EBIKE tek glif değil, iki glifle (şimşek + bisiklet) temsil edilir. */
export function Offline() {
  return (
    <RowCard>
      <ParticipantRow participant={SELIN_P} index={3} />
    </RowCard>
  );
}

/** W2 "Kimler var" kartının tamamı — satır arası 1px `bg-line` ayraçla. */
export function Roster() {
  return (
    <RowCard>
      <ParticipantRow participant={MEHMET} index={0} isSelf />
      <div className="mx-4 h-px bg-line" />
      <ParticipantRow participant={ELIF_P} index={1} />
      <div className="mx-4 h-px bg-line" />
      <ParticipantRow participant={DENIZ_P} index={2} />
      <div className="mx-4 h-px bg-line" />
      <ParticipantRow participant={SELIN_P} index={3} />
    </RowCard>
  );
}
