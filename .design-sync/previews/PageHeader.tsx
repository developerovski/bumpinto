import { LinkButton, PageHeader } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik. */
const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;

/** ProfilePage kullanımı — yalnız başlık, `action` verilmiyor. Tek satır, sağda boşluk yok. */
export function Default() {
  return (
    <div style={COL}>
      <PageHeader title="Profil" />
    </div>
  );
}

/** SessionsPage kullanımı — `title` bir `<br/>` ile iki satıra bölünmüş ReactNode, `action`
    ikonlu bir `LinkButton`. NOT: `action` sarmalayıcısı `hidden lg:block` — yalnız ≥1024px
    genişlikte görünür. Bu paketin çekim genişliği (900px) `lg:` eşiğinin altında kaldığı için
    buton burada GÖRÜNMEZ; bu, ürünün 390 artboard'ındaki gerçek davranışın (header CTA yok)
    aynısı, bozulma değil. Genişlik ≥1024 olsaydı sağda "Yeni buluşma kur" çıkardı. */
export function WithAction() {
  return (
    <div style={COL}>
      <PageHeader
        title={
          <>
            Nereye
            <br />
            gidiyoruz?
          </>
        }
        action={
          <LinkButton href="/sessions/new" size="fit">
            Yeni buluşma kur
          </LinkButton>
        }
      />
    </div>
  );
}
