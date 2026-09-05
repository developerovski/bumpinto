import { Badge, HeaderButton, SessionHeader } from "@bumpinto/web";

const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;

/** DeckScreen liste modu — varsayılan `as="h2"`, sayaç+beğeni `meta`, "Desteye dön" `action`.
    En sık görülen dal (kendi başlığını taşımayan ekranların çoğu bunu kullanıyor). */
export function DeckList() {
  return (
    <div style={COL}>
      <SessionHeader
        title="Hangisi olsun?"
        meta="12 mekan · 4 beğeni"
        action={<HeaderButton onClick={() => {}}>Desteye dön</HeaderButton>}
      />
    </div>
  );
}

/** LobbyPage — `as="h1"` (global h1 stili), `badges` dolu (etkinlik + durum rozeti),
    `meta`/`action` yok. Rozetler başlığın hemen altında, meta'nın olduğu yerde oturuyor. */
export function AsH1WithBadges() {
  return (
    <div style={COL}>
      <SessionHeader
        as="h1"
        title="Kahve turu"
        badges={
          <>
            <Badge>Kahve</Badge>
            <Badge tone="amber">konumlar toplanıyor</Badge>
          </>
        }
      />
    </div>
  );
}

/** VenuesPage — `title` + `meta` + `badges` + `action` DÖRDÜ birden dolu; `action` burada bir
    metin rozeti (misafir, host henüz karıştırmadı). SessionHeader'ın tüm slotlarının aynı anda
    dolduğu tek gerçek dal. */
export function AllSlots() {
  return (
    <div style={COL}>
      <SessionHeader
        title="Kahve turu"
        meta="8 mekan · orta noktadan ≤ 2 km"
        badges={<Badge>Kahve</Badge>}
        action={<Badge tone="amber">host karıştırınca deste açılır</Badge>}
      />
    </div>
  );
}

/** SoloSetupPage — `as="h1"` + tek rozet ("Bireysel"), `meta`/`action` yok. `AsH1WithBadges`ten
    farkı: tek rozet ve daha kısa başlık — h1 boyutunun rozet sayısından bağımsız hizasını
    gösteriyor. */
export function SoloMinimal() {
  return (
    <div style={COL}>
      <SessionHeader as="h1" title="Kahve turu (bireysel)" badges={<Badge>Bireysel</Badge>} />
    </div>
  );
}
