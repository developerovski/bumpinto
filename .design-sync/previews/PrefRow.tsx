import { PrefRow } from "@bumpinto/web";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/* Gerçek ebeveyni her zaman `ProfilePrefs`in tek kartı (rounded-card border bg-card) — tek
   satır gösterirken bile o çerçeveyi taşıyoruz, yoksa satır çıplak görünüp inandırıcılığını
   kaybediyor. Aside rozeti ProfilePrefs'teki BİREBİR sınıf dizisiyle (zaten derlenmiş,
   arbitrary değer üretmiyoruz). */
const CARD = "rounded-card border border-line bg-card py-0.5 shadow-sh1";
const CHIP =
  "inline-flex items-center gap-2 rounded-full border-[1.5px] border-flame-deep bg-flame-wash px-3 py-1.5 text-[0.875rem] font-semibold text-flame-deep";

/** Kapalı satır, değer dolu — "Varsayılan konum" tercihi Moda'ya ayarlı, ok sağa bakar. */
export function Closed() {
  return (
    <div style={COL}>
      <div className={CARD}>
        <PrefRow label="Varsayılan konum" value="Moda" onToggle={() => {}} />
      </div>
    </div>
  );
}

/** Sağda ek rozet (`aside`) taşıyan satır — "Varsayılan etkinlik" seçiliyken ProfilePrefs
    aynı chip'i basar (etkinlik adı + grup). */
export function WithAside() {
  return (
    <div style={COL}>
      <div className={CARD}>
        <PrefRow
          label="Varsayılan etkinlik"
          value="Kahve · Yeme-içme"
          aside={<span className={CHIP}>Kahve</span>}
          onToggle={() => {}}
        />
      </div>
    </div>
  );
}

/** Değer hiç ayarlanmamış — `value` `null` geldiğinde bileşen kendi i18n varsayılanına
    ("Seçilmedi") düşer; çağıran metin geçirmiyor. */
export function Unset() {
  return (
    <div style={COL}>
      <div className={CARD}>
        <PrefRow label="Varsayılan konum" value={null} onToggle={() => {}} />
      </div>
    </div>
  );
}

/** `open` gerçekten satırın altına `children`'ı açar (ok 90° döner) — ProfilePrefs bunu
    konum/etkinlik/ulaşım/dil panellerini basmak için kullanıyor; burada aynı ölçülerle
    (`mx-[1.125rem] mb-3.5`) kısa bir panel örneği. */
export function Open() {
  return (
    <div style={COL}>
      <div className={CARD}>
        <PrefRow label="Varsayılan ulaşım" value="Toplu taşımayla" open onToggle={() => {}}>
          <div className="mx-[1.125rem] mb-3.5 flex flex-col gap-2">
            <p className="text-[0.8125rem] text-ink2">Panel içeriği burada açılır.</p>
          </div>
        </PrefRow>
      </div>
    </div>
  );
}
