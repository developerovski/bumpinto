import { useEffect, useRef, type ReactNode } from "react";
import { RunoffList } from "@bumpinto/web";

// travelMinutes katılımcı UUID'siyle anahtarlı — etiketler aynı anahtarlarla eşleşmeli.
const SELF = "8f2c1a44-3d5e-4b17-9c0a-2e6b7d4f1a90";
const ELIF = "b31d9e70-6a42-4f8c-8d55-1c07a9be3d21";

/** RunoffScreen'in kurduğu eşleme: kendi satırın "Sen", diğerleri adıyla. */
const TRAVEL_LABELS = { [SELF]: "Sen", [ELIF]: "Elif" };

// İkisini de herkes beğendi → finale kalan iki mekan. deckOrder tek/çift olduğu
// için kartlar artboard'daki gibi ters yönde eğik durur (-2° / +2°).
const FINALISTS = [
  {
    id: "c6a83b51-2e94-4f70-8d2b-61c9f4a0e7d3",
    name: "Karaköy Lokantası",
    rating: 4.5,
    priceLevel: 3,
    deckOrder: 0,
    travelMinutes: { [SELF]: 28, [ELIF]: 19 },
  },
  {
    id: "17e5d9c8-4b30-42a6-b5f1-8c02d6e93a15",
    name: "Bebek Kahve",
    rating: 4.4,
    priceLevel: 2,
    deckOrder: 1,
    travelMinutes: { [SELF]: 34, [ELIF]: 26 },
  },
];

/** 07 Runoff sayfa sütunu — Page(default) ölçüleri: 480px kolon, 15px dikey ritim.
    `pick` verilirse finalist kartına gerçek bir tıklama gönderir: seçim bileşenin
    kendi state'inde tutulur, prop'la dışarıdan kurulamaz. Sahte işaret çizilmiyor —
    bileşenin kendi onClick'i çalışıyor, oy gönderimi (lockIn) tetiklenmiyor. */
function Column({ pick, children }: { pick?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pick == null) return;
    ref.current?.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")[pick]?.click();
  }, [pick]);
  return (
    <div
      ref={ref}
      className="mx-auto flex w-full max-w-[30rem] flex-col gap-[0.9375rem] px-[1.125rem] py-5"
    >
      {children}
    </div>
  );
}

/** 07 Runoff · ekran açıldığında: iki finalist eşit ağırlıkta, seçim dairesi boş,
    "Seçimimi kilitle" bir şey seçilene kadar devre dışı. */
export function Undecided() {
  return (
    <Column>
      <RunoffList slug="x7k2m" finalists={FINALISTS} travelLabels={TRAVEL_LABELS} />
    </Column>
  );
}

/** 07 Runoff · Bebek Kahve seçildi — kart flame kenarlığa geçer, daire gradyan
    dolgu + beyaz tik alır, kilitleme düğmesi etkinleşir. */
export function Picked() {
  return (
    <Column pick={1}>
      <RunoffList slug="x7k2m" finalists={FINALISTS} travelLabels={TRAVEL_LABELS} />
    </Column>
  );
}

/** 07 Runoff · ilk finalist seçili — seçim yalnız bir karta düşer, diğeri
    sönümlenmez; ayrım tamamen kenarlık ve tikte. */
export function PickedFirst() {
  return (
    <Column pick={0}>
      <RunoffList slug="x7k2m" finalists={FINALISTS} travelLabels={TRAVEL_LABELS} />
    </Column>
  );
}
