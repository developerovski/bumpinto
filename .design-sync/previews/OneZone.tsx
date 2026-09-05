import { Heading, LinkButton, MapMark, Note, OneZone } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik. OneZone'un
   TEK gerçek ebeveyni her zaman `Page` (ErrorPage) — kendi `max-w-[34rem]` (544px) hiçbir zaman
   asıl genişliğe ulaşmıyor, ürün kolonunun 27.75rem'i (444px) tarafından kesiliyor; sadakat için
   aynı sarmalayıcı kullanılıyor. */
const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1.5rem 1rem" } as const;

/** ErrorPage `kind="notFound"` — en sık görülen dal: silik pin + başlık + gövde + ipucu +
    "Ana sayfa" linki. `hint` dolu olduğu için üç metin bloğu üst üste. */
export function NotFound() {
  return (
    <div style={COL}>
      <OneZone>
        <MapMark muted />
        <Heading center>Hmm.</Heading>
        <Note center>Bu oturum bulunamadı — link doğru mu?</Note>
        <Note center>Linki atan kişiden yeniden iste; harf hatası olabilir.</Note>
        <LinkButton href="/" kind="white" size="fit">
          Ana sayfa
        </LinkButton>
      </OneZone>
    </div>
  );
}

/** ErrorPage `kind="decided"` — HATA değil: karara bağlanmış bir oturuma giren kişiye aynı
    düzen, farklı ton (§ karar dokümanı). Nerede buluşulduğu bilerek yazılmıyor. */
export function Decided() {
  return (
    <div style={COL}>
      <OneZone>
        <MapMark muted />
        <Heading center>Bu buluşma karara bağlandı.</Heading>
        <Note center>Nereye gidileceği belli olmuş; katılım kapandı.</Note>
        <Note center>Nerede buluşulacağını kuran kişiye sor. Yenisi için ana sayfadan başlayabilirsin.</Note>
        <LinkButton href="/" kind="white" size="fit">
          Ana sayfa
        </LinkButton>
      </OneZone>
    </div>
  );
}

/** ErrorPage `kind="lost"` — `hint` YOK dalı: yalnız iki metin bloğu + link, tek boşluksuz
    dikey yığın. `hint`in koşullu render'ının atlandığı hâl bu. */
export function Lost() {
  return (
    <div style={COL}>
      <OneZone>
        <MapMark muted />
        <Heading center>Burada bir şey yok.</Heading>
        <Note center>Aradığın sayfa taşınmış ya da hiç olmamış olabilir.</Note>
        <LinkButton href="/" kind="white" size="fit">
          Ana sayfa
        </LinkButton>
      </OneZone>
    </div>
  );
}
