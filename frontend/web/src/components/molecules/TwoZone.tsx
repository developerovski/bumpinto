/* Kaynak: DS v2 §07 — ≥1024 grid 58fr 42fr gap 40; harita ekranlarında 42/58. */
import type { ReactNode } from "react";

const cols = {
  default: "lg:grid-cols-[58fr_42fr]",
  // UI review: harita tarafına daha çok yer — masaüstünde harita bölgesi sabit min genişlikte
  // başlar, kalanı harita doldurur (geniş masaüstü ekranda dar sabit oran yerine akışkan).
  map: "lg:grid-cols-[minmax(24rem,2fr)_3fr]",
};

// .zone varsayılanı 16px; artboard Landing sol 18px / sağ 26px kullanır (yalnız ≥1024).
const zoneGaps = {
  default: "",
  md: "lg:gap-[1.125rem]",
  lg: "lg:gap-[1.625rem]",
};

export default function TwoZone(props: {
  left: ReactNode;
  right: ReactNode;
  variant?: keyof typeof cols;
  /** Landing: iki bölge dikeyde ortalanır. */
  centerY?: boolean;
  /** Artboard 390: sağ bölge yok — yalnız ≥1024'te göster. */
  rightLgOnly?: boolean;
  /** ≥1024 bölge içi boşluk — artboard bölge bazında 18/26px isteyebilir. */
  leftGap?: keyof typeof zoneGaps;
  rightGap?: keyof typeof zoneGaps;
  /** Lobi/Bekle masaüstü: iki bölge kalan yüksekliği paylaşır, taşan bölge KENDİ içinde kayar
      (sayfa kaymaz). Yalnız `fit:` kapısı açıkken; kısa pencerede yerleşim normale döner. */
  fill?: boolean;
  /** Artboard Lobi/Bekle 390: `.f-mid` (sağ bölgede) roster'dan (sol bölgede) ÖNCE görünür.
      Yalnız GÖRSEL sırayı değiştirir (`order-*`, ≥1024'te `lg:order-none` ile sıfırlanır) —
      DOM/okuma sırası AYNI kalır, bileşen tek yerde kalır (kopyalanmaz). */
  mobileFirst?: "right";
}) {
  const leftOrder = props.mobileFirst === "right" ? "order-2 lg:order-none" : "";
  const rightOrder = props.mobileFirst === "right" ? "order-1 lg:order-none" : "";
  // Bölge içi kaydırma kabı; sol bölgede davet kartının kart üstüne taşan sticker'ı kırpılmasın
  // diye üstte 16px pay açılır ve aynı kadar negatif marjla hizası geri alınır.
  const fillZone = props.fill ? "fit:min-h-0 fit:overflow-y-auto" : "";
  return (
    <div
      className={[
        "flex flex-col gap-4 lg:grid lg:gap-10",
        cols[props.variant ?? "default"],
        props.centerY ? "lg:items-center" : props.fill ? "lg:items-stretch" : "lg:items-start",
        props.fill ? "fit:min-h-0 fit:flex-1" : "",
      ].join(" ")}
    >
      <div
        data-testid="zone-left"
        className={`flex min-w-0 flex-col gap-4 ${leftOrder} ${zoneGaps[props.leftGap ?? "default"]} ${fillZone} ${
          props.fill ? "fit:-mt-4 fit:pt-4" : ""
        }`}
      >
        {props.left}
      </div>
      <div
        data-testid="zone-right"
        className={
          `${props.rightLgOnly ? "hidden lg:flex" : "flex"} min-w-0 flex-col gap-4 ${rightOrder} ` +
          `${zoneGaps[props.rightGap ?? "default"]} ${fillZone}`
        }
      >
        {props.right}
      </div>
    </div>
  );
}
