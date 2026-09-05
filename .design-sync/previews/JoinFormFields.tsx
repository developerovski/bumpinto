import { JoinFormFields } from "@bumpinto/web";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/* Form denetimli (controlled): her hücre statik bir anlık görüntü, geri çağrılar boş.
   Etkileşim (yazma, konum izni) statik çekimde temsil edilemez — atlanan hâller NOTES'ta. */
const NOOP = {
  onNameChange: () => {},
  onAddressChange: () => {},
  onUseLocation: () => {},
  onOtherAddress: () => {},
  onTravelModeChange: () => {},
  onSubmit: (e: { preventDefault: () => void }) => e.preventDefault(),
};

/** W1 · boş form — ad girilmediği için gönder butonu devre dışı (`disabled:opacity-45`).
    Konum bloğu "idle": otomatik konum butonu + adres alternatifi. */
export function Empty() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name=""
        address=""
        locationState="idle"
        locationLabel={null}
        travelMode="CAR"
        error={null}
        busy={false}
      />
    </div>
  );
}

/** Konum izni verilmiş — yeşil onay kartı + "Konum tamam" rozeti, altında
    "başka adres" kısayolu. Ulaşım türü toplu taşımaya çekilmiş. */
export function LocationGranted() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Mehmet"
        address=""
        locationState="granted"
        locationLabel="Moda"
        travelMode="TRANSIT"
        error={null}
        busy={false}
      />
    </div>
  );
}

/** İzin reddedilmiş/atlanmış — elle adres girişi dalı. */
export function ManualAddress() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Elif"
        address="Moda Sahil, Kadıköy"
        locationState="denied"
        locationLabel={null}
        travelMode="BIKE"
        error={null}
        busy={false}
      />
    </div>
  );
}

/** Sunucu hatası — `ErrorText` gönder butonunun ÜSTÜNDE, tuğla kırmızısıyla. */
export function WithError() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Deniz"
        address=""
        locationState="granted"
        locationLabel="Beşiktaş"
        travelMode="CAR"
        error="Bu buluşmaya katılım kapanmış."
        busy={false}
      />
    </div>
  );
}

/** Gönderim sürerken — buton devre dışı; `TextInput`'ün disabled stili YOK
    (ürün boşluğu, NOTES'ta kayıtlı), o yüzden alanlar dolu görünmeye devam eder. */
export function Submitting() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Mehmet"
        address=""
        locationState="granted"
        locationLabel="Moda"
        travelMode="TRANSIT"
        error={null}
        busy
      />
    </div>
  );
}

/** Konum alınıyor — `locationBusy` yalnız konum bloğunu meşgul eder, form açık kalır. */
export function LocatingBusy() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Selin"
        address=""
        locationState="idle"
        locationLabel={null}
        locationBusy
        travelMode="WALK"
        error={null}
        busy={false}
      />
    </div>
  );
}
