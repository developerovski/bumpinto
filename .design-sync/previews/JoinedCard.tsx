import { JoinedCard } from "@bumpinto/web";
import { ELIF_P, MEHMET } from "./_fixtures";

const FRAME = "mx-auto w-full max-w-[27.75rem]";

/** W2 · katılım onayı — yeşil kart, tik ve "semt · ad" alt satırı.
    Başlık i18n'den (`waiting.joined`); alt satır katılımcı nesnesinden türetilir. */
export function WithLocation() {
  return (
    <div className={FRAME}>
      <JoinedCard self={MEHMET} />
    </div>
  );
}

/** Konum etiketi yoksa ayraç düşer, yalnız ad basılır. */
export function NameOnly() {
  return (
    <div className={FRAME}>
      <JoinedCard self={{ ...ELIF_P, locationLabel: undefined }} />
    </div>
  );
}

/** Sayfa yenilendiğinde store'daki `self` boştur (yalnız çerez kalır):
    kart tikle birlikte durur, alt satır hiç render edilmez. */
export function NoSelf() {
  return (
    <div className={FRAME}>
      <JoinedCard self={null} />
    </div>
  );
}
