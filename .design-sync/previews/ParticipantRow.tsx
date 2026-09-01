import type { ReactNode } from "react";
import { ParticipantRow } from "@bumpinto/web";

/* W2 · satırlar ParticipantList'in kart kabuğunda yaşar; tek satır da orada gösterilmeli.
   Dış çerçeve satır içi stille: `.design-sync/previews` sınıfları hızlı döngüde
   compile olmuyor — kart kabuğu ise ParticipantList'ten birebir alındığı için sınıfla. */
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

const MEHMET = {
  id: "5b0e2a4c-3f77-4a19-9d21-0f6c8a1e5d33",
  displayName: "Mehmet",
  host: true,
  hasLocation: true,
};
const ELIF = {
  id: "c41d9b6e-2a08-4f5b-8e72-1b93d4a7c610",
  displayName: "Elif",
  host: false,
  hasLocation: true,
};
const DENIZ = {
  id: "a72f3c15-9d4e-4b60-b1a8-7e05f2c9d844",
  displayName: "Deniz",
  host: false,
  hasLocation: false,
};
const SELIN = {
  id: "e08b41d7-6c2a-4f39-95b0-72da8e1c4b06",
  displayName: "Selin",
  host: false,
  hasLocation: true,
};

/** W2 · buluşmayı kuran: rozet önceliği "Kuran"da — hazır/bekliyor rozeti basılmaz. */
export function Host() {
  return (
    <RowCard>
      <ParticipantRow participant={MEHMET} index={0} />
    </RowCard>
  );
}

/** Konumunu atmış katılımcı — halkalı avatar + yeşil "Hazır" rozeti. */
export function Ready() {
  return (
    <RowCard>
      <ParticipantRow participant={ELIF} index={1} />
    </RowCard>
  );
}

/** Henüz konum göndermemiş katılımcı — soluk avatar, "Konum bekleniyor…" alt satırı,
    amber "Bekliyor" rozeti. */
export function WaitingLocation() {
  return (
    <RowCard>
      <ParticipantRow participant={DENIZ} index={2} />
    </RowCard>
  );
}

/** Kendi satırın — adın yanında "(sen)" ve yalnız burada dolan konum etiketi. */
export function Self() {
  return (
    <RowCard>
      <ParticipantRow participant={SELIN} index={3} isSelf locationLabel="Mevcut konumun" />
    </RowCard>
  );
}

/** W2 "Kimler var" kartının tamamı — satır arası 1px `bg-line` ayraçla. */
export function Roster() {
  return (
    <RowCard>
      <ParticipantRow participant={MEHMET} index={0} />
      <div className="mx-4 h-px bg-line" />
      <ParticipantRow participant={ELIF} index={1} />
      <div className="mx-4 h-px bg-line" />
      <ParticipantRow participant={DENIZ} index={2} />
      <div className="mx-4 h-px bg-line" />
      <ParticipantRow participant={SELIN} index={3} isSelf locationLabel="Mevcut konumun" />
    </RowCard>
  );
}
