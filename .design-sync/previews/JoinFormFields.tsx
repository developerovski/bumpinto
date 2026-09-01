import { JoinFormFields } from "@bumpinto/web";

const FRAME = "mx-auto w-full max-w-[27.75rem]";
const NOOP = {
  onNameChange: () => {},
  onAddressChange: () => {},
  onUseLocation: () => {},
};

/** W1 · formun açılış hâli — ad boş, konum seçilmemiş, "Katıl" ad girilene
    kadar devre dışı. Etiket/placeholder/gizlilik notu i18n'den (`join.*`). */
export function Empty() {
  return (
    <div className={FRAME}>
      <JoinFormFields
        name=""
        address=""
        locationLabel={null}
        error={null}
        busy={false}
        onSubmit={(e) => e.preventDefault()}
        {...NOOP}
      />
    </div>
  );
}

/** Adres yolundan doldurulmuş hâli — ad ve adres girili, gönderim açık. */
export function Filled() {
  return (
    <div className={FRAME}>
      <JoinFormFields
        name="Mehmet"
        address="Kadıköy, İstanbul"
        locationLabel={null}
        error={null}
        busy={false}
        onSubmit={(e) => e.preventDefault()}
        {...NOOP}
      />
    </div>
  );
}

/** Tarayıcı konumu alındı — buton metni "Mevcut konumumu kullan" yerine
    dönen etiketi basar; adres alanı yedek yol olarak açık kalır. */
export function LocationResolved() {
  return (
    <div className={FRAME}>
      <JoinFormFields
        name="Elif"
        address=""
        locationLabel="Mevcut konumun"
        error={null}
        busy={false}
        onSubmit={(e) => e.preventDefault()}
        {...NOOP}
      />
    </div>
  );
}

/** Geocode başarısız — hata satırı adres bloğu ile gönder butonu arasına girer. */
export function WithError() {
  return (
    <div className={FRAME}>
      <JoinFormFields
        name="Deniz"
        address="Moda Sahil"
        locationLabel={null}
        error="Bu adres bulunamadı — yakındaki bir şehri dene."
        busy={false}
        onSubmit={(e) => e.preventDefault()}
        {...NOOP}
      />
    </div>
  );
}

/** Gönderim sürerken — `busy` yalnız "Katıl" butonunu kilitler, alanlar açık. */
export function Submitting() {
  return (
    <div className={FRAME}>
      <JoinFormFields
        name="Mehmet"
        address=""
        locationLabel="Mevcut konumun"
        error={null}
        busy
        onSubmit={(e) => e.preventDefault()}
        {...NOOP}
      />
    </div>
  );
}
