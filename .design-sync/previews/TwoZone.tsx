import {
  Button,
  FinishedCard,
  HandNote,
  Heading,
  Highlight,
  JoinedCard,
  Lead,
  LikedList,
  MapMark,
  Overline,
  ParticipantList,
  PolaroidFan,
  StepList,
  TwoZone,
} from "@bumpinto/web";
import { DECK, ELIF_P, KARAKOY, MEHMET, MODA, ROSTER, SELF, SELIN_P, TRAVEL } from "./_fixtures";

/* DeckScreen.tsx'in gerçek kompozisyonu: `<Page><DeckHeader/><TwoZone left={...} right={...}/>
   </Page>`. Page'in ürün kolonu ≥1024'te bile 30rem/27.75rem'i geçmiyor (`variant`/`wide`
   farkı yalnız `lg:` sınıflarında), bu yüzden TwoZone'un GERÇEK ebeveyni her zaman bu genişlik.

   ÖNEMLİ SINIRLAMA (learnings'e de yazıldı): TwoZone'un iki-kolonlu ızgarası (`lg:grid`),
   `centerY`/`leftGap`/`rightGap`/`variant="map"` TAMAMI yalnız `lg:` (≥1024px) sınıflarıyla
   çalışıyor; bu paketin çekim genişliği (900px) eşiğin altında kaldığı için üçü de bu
   ekran görüntülerinde görünmez — bileşen HER ZAMAN tek sütun (`flex-col`) olarak render olur.
   Bu gerçek ürünün <1024 davranışının AYNISI (mobil kullanıcı bunu görür), bozulma değil;
   ama TwoZone'un adını taşıyan asıl "iki bölge yan yana" hâli bu genişlikte KANITLANAMIYOR.
   Kanıtlamak için orkestratörün `overrides.TwoZone.viewport` (ör. "1280x900") eklemesi gerekir
   — bu dosya DEĞİŞMEDEN aynı üç hücre o genişlikte ızgara olarak da doğru render olur (hiçbiri
   1024 altı genişliğe özel bir varsayım yapmıyor). `mobileFirst` (flex `order-*`) ve
   `rightLgOnly` (sağ bölgeyi `hidden lg:flex` ile TAMAMEN kaldırma) istisna — ikisi de bu
   genişlikte GÖZLEMLENEBİLİYOR, aşağıdaki iki hücrede bilerek kullanıldı. */

const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;

/** DeckScreen — deste bittiğinde, gönderildikten SONRAKİ an: sol bölge `FinishedCard`
    (host + hâlâ kaydıran "Elif" + "Bekleyenleri dürt" + "olmadan devam et"), sağ bölge
    `LikedList` (2 beğenilen mekan, adalet sırasına göre). Varsayılan `TwoZone` — özel prop yok. */
export function DeckFinished() {
  const participants = [
    { ...MEHMET, deckDone: true },
    { ...ELIF_P, deckDone: false },
    { ...SELIN_P, deckDone: true },
  ];
  return (
    <div style={COL}>
      <TwoZone
        left={
          <FinishedCard
            likedCount={2}
            sending={false}
            sent
            host
            selfId={SELF}
            participants={participants}
            shareText="Kahve turu için 4 mekan hazır, seni bekliyoruz:"
            shareUrl="https://bumpinto.app/j/kahve-turu"
            onSend={() => {}}
            onList={() => {}}
            onForce={() => {}}
          />
        }
        right={<LikedList venues={DECK} liked={{ [MODA.id]: true, [KARAKOY.id]: true }} travel={TRAVEL} />}
      />
    </div>
  );
}

/** Landing — `centerY rightLgOnly leftGap="md" rightGap="lg"`: sol bölge marka bloğu (pin,
    başlık, `Lead`, el yazısı, giriş CTA'sı), sağ bölge dekoratif polaroid + adım listesi.
    `rightLgOnly` sağ bölgeyi bu genişlikte TAMAMEN kaldırıyor (`hidden lg:flex`) — ekranda
    yalnız sol bölge görünüyor, bu ürünün 390 artboard'ının BİREBİR aynısı.
    NOT: gerçek `Landing.tsx` burada `GoogleSignIn` kullanıyor ama o `useNavigate()` çağırıyor —
    bu paket şeklinde `react-router-dom` paylaşılan `window.React` gibi harici DEĞİL (yalnız
    react/react-dom/react-is/scheduler öyle, bkz. `lib/bundle.mjs` reactShim); bu dosyadan
    `<MemoryRouter>` ile sarmalamak da işe yaramıyor (denendi: TopBar'daki AYNI hata —
    `useNavigate() may be used only in the context of a <Router>` — çünkü sarmalayıcı ayrı bir
    esbuild derlemesinin FARKLI bir react-router-dom kopyasını kullanıyor). Bu yüzden
    `GoogleSignIn` yerine aynı gerçek metni taşıyan statik bir `Button` kullanılıyor — kök sebep
    learnings'te, TopBar ile ORTAK (2. örnek). */
export function LandingHero() {
  return (
    <div style={COL}>
      <TwoZone
        centerY
        rightLgOnly
        leftGap="md"
        rightGap="lg"
        left={
          <>
            <MapMark />
            <Heading size="hero">
              <Highlight>Ortada</Highlight>
              <br />
              buluşalım.
            </Heading>
            <Lead>
              Sen Den Bosch'tasın, o Someren'de. Dert değil — adil orta noktayı ve oradaki en
              iyi mekânı birlikte bulun.
            </Lead>
            <HandNote>kavga yok, kaydırma var →</HandNote>
            <Button type="button" kind="white">
              Google ile devam et
            </Button>
          </>
        }
        right={
          <>
            <PolaroidFan />
            <StepList />
          </>
        }
      />
    </div>
  );
}

/** WaitingRoom — `fill mobileFirst="right"`: DOM sırası aynı kalır ama `order-*` sınıfları
    sağ bölgeyi (orta nokta özeti + "Haritayı aç") solun (Katıldın kartı + katılımcı listesi)
    ÖNÜNE taşır — artboard 390'ın "önce orta nokta, sonra kim var" sırası. `MidpointCard`
    barrel'dan export edilmediği için (bkz. learnings) gerçek bileşeni değil, onun aynı gerçek
    metnini taşıyan sadık bir `Overline`+başlık ikilisini kullanıyoruz. */
export function WaitingRoomMobileFirst() {
  return (
    <div style={COL}>
      <TwoZone
        fill
        mobileFirst="right"
        left={
          <>
            <JoinedCard self={{ ...MEHMET, deckDone: false }} />
            <ParticipantList participants={ROSTER} />
          </>
        }
        right={
          <>
            <div className="flex items-center gap-4 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
              <MapMark />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Overline>Orta nokta</Overline>
                <h2 className="text-[1.125rem]">Kadıköy civarı</h2>
                <span className="text-[0.8125rem] text-ink2 tabular-nums">
                  ≤ 2 km · herkes ~9–18 dk
                </span>
              </div>
            </div>
            <Button type="button" kind="white" size="fit">
              Haritayı aç
            </Button>
          </>
        }
      />
    </div>
  );
}
