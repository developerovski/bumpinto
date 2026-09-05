import { SessionCard } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik.
   SessionsPage'de `open.map(...)` doğrudan Page kolonunun altına diziliyor
   (TwoZone sol bölge, ≥1024 altı tek sütun) — kart bu genişlikte yaşıyor. */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/* `@bumpinto/shared` preview bundle'ında çözülmüyor (yalnız frontend/web/node_modules'te) —
   SessionSummaryDto'nun ihtiyacımız olan alanları burada yerelde yeniden yazıldı
   (bkz. _fixtures.ts'teki aynı gerekçe). */
type SessionStatus = "COLLECTING" | "SUGGESTING" | "BROWSING" | "SWIPING" | "RUNOFF" | "DECIDED" | "EXPIRED";
type SessionType = "GROUP" | "SOLO";
type ActivityType = "COFFEE" | "FOOD" | "BAR" | "WALK" | "ACTIVITY" | "SWIM" | "HIKE" | "FITNESS" | "CINEMA" | "MUSEUM" | "ART" | "NIGHTLIFE" | "THEME_PARK" | "ADVENTURE" | "GAMES";
type SessionRow = {
  slug?: string;
  name?: string;
  activityTypes?: ActivityType[];
  sessionType?: SessionType;
  status?: SessionStatus;
  createdAt?: string;
  participantCount?: number;
  readyCount?: number;
  doneCount?: number;
};

const swiping: SessionRow = {
  slug: "kadikoy-kahve-cuma",
  name: "Kadıköy kahve, Cuma",
  activityTypes: ["COFFEE"],
  sessionType: "GROUP",
  status: "SWIPING",
  createdAt: "2026-09-05T14:00:00Z",
  participantCount: 4,
  readyCount: 4,
  doneCount: 2,
};

const collecting: SessionRow = {
  slug: "karakoy-aksam-yemegi",
  name: "Karaköy akşam yemeği",
  activityTypes: ["FOOD", "BAR"],
  sessionType: "GROUP",
  status: "COLLECTING",
  createdAt: "2026-09-06T09:30:00Z",
  participantCount: 5,
  readyCount: 2,
  doneCount: 0,
};

const browsing: SessionRow = {
  slug: "bebek-sahil-yuruyusu",
  name: "Bebek sahil yürüyüşü",
  activityTypes: ["WALK"],
  sessionType: "GROUP",
  status: "BROWSING",
  createdAt: "2026-09-04T11:00:00Z",
  participantCount: 3,
  readyCount: 3,
  doneCount: 0,
};

const soloRunoff: SessionRow = {
  slug: "balat-kahve-tek",
  name: "Balat kahve molası",
  activityTypes: ["COFFEE"],
  sessionType: "SOLO",
  status: "RUNOFF",
  createdAt: "2026-09-06T08:15:00Z",
  participantCount: 1,
  readyCount: 1,
  doneCount: 1,
};

/** W1 · deste açık — flame kenarlık + "Deste açık!" çıkartması, `doneOf` ilerleme çubuğu. */
export function Swiping() {
  return (
    <div style={COL}>
      <SessionCard row={swiping} />
    </div>
  );
}

/** W1 · konumlar toplanıyor — `readyOf` ilerleme + grup için "linki attın mı?" ipucu. */
export function Collecting() {
  return (
    <div style={COL}>
      <SessionCard row={collecting} />
    </div>
  );
}

/** W1 · mekanlar hazır — ilerleme çubuğu yok, yalnız durum metni + "Mekanlara git" CTA. */
export function Browsing() {
  return (
    <div style={COL}>
      <SessionCard row={browsing} />
    </div>
  );
}

/** W1 · bireysel oturum, son düzlük — "Bireysel" etiketi ve `RUNOFF` durum metni. */
export function SoloRunoff() {
  return (
    <div style={COL}>
      <SessionCard row={soloRunoff} />
    </div>
  );
}
