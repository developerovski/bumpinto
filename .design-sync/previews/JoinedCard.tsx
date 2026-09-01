import { JoinedCard } from "@bumpinto/web";

const FRAME = "mx-auto w-full max-w-[27.75rem]";

/** W2 · katılım onayı — geocode edilmiş konum etiketi ve ad alt satırda
    "Kadıköy · Mehmet" olarak birleşir. Başlık i18n'den (`waiting.joined`). */
export function WithLocation() {
  return (
    <div className={FRAME}>
      <JoinedCard self={{ id: "9f2c", name: "Mehmet", locationLabel: "Kadıköy" }} />
    </div>
  );
}

/** Konum atlanmış katılım — yalnız ad basılır, ayraç düşer. */
export function NameOnly() {
  return (
    <div className={FRAME}>
      <JoinedCard self={{ id: "4a71", name: "Elif", locationLabel: null }} />
    </div>
  );
}

/** Sayfa yenilendiğinde store'daki `self` boştur (yalnız cookie kalır):
    kart tikle birlikte durur, alt satır hiç render edilmez. */
export function NoSelf() {
  return (
    <div className={FRAME}>
      <JoinedCard self={null} />
    </div>
  );
}
