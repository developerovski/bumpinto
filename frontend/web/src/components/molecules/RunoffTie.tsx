/* Kaynak: artboard W7b Berabere 390 (4398-4402) ve 1280 (4450-4453).
 *
 * v3'te beraberlik kutusu KALKTI: "Berabere" artık sayfanın manşeti (RunoffIntro) ve artboard
 * 4407'nin sağ bölgesinde amber bir kart YOK — aynı cümleyi h1 + kopya zaten söylüyor. Geriye
 * host'un iki çıkışı kalır; 390'da yapışkan CTA'da alt alta, 1280'de sol bölgede yan yana.
 *
 * Kilitli kart ("diğerlerini bekliyoruz") burada YANLIŞTIR: herkes oy vermiştir, beklenecek
 * kimse yoktur. Bu dal olmadan oturum RUNOFF'ta sonsuza kadar kilitli kalıyordu — sunucu
 * beraberlikte kararı bilerek host'un force-decision'ına bırakıyor (spec §4).
 */
import { Scales } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText } from "../atoms";

export default function RunoffTie(props: {
  host: boolean;
  choice: string | null;
  sending: boolean;
  onDecide: () => void;
  onFair: () => void;
  error?: string | null;
  /** `row` = 1280 sol bölge (iki buton yan yana, artboard `.fit` + 0 32px iç boşluk);
      varsayılan `stack` = 390 yapışkan CTA (tam genişlik, alt alta). */
  layout?: "row" | "stack";
}) {
  const { t } = useTranslation();
  // Beraberlikte karar YALNIZ host'ta; diğerleri kimin karar verdiğini manşet kopyasından okur.
  if (!props.host) return null;
  const row = props.layout === "row";
  const fit = row ? ("fit" as const) : ("md" as const);
  const pad = row ? "px-8" : undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className={row ? "flex items-center gap-3.5" : "flex flex-col gap-2"}>
        {/* Ürünün varsayılanı ADALETTİR: artboard 4400 birincil (flame) butona "Adil olana
            bırak" yazar, host'un kendi kararı ikincil çıkıştır. Sıra ters çevrilirse ekran
            "sen karar ver, istersen adil olanı seç" demeye başlar — anlam değişir. */}
        <Button type="button" size={fit} className={pad} onClick={props.onFair} disabled={props.sending}>
          <Scales size={18} aria-hidden />
          {t("runoff.tieFair")}
        </Button>
        {/* B-7'de uç YOK: en adil finalist istemcide seçilir (min fark → min toplam → puan → id)
            ve mevcut force-decision ile gönderilir (fairestOf, @bumpinto/shared). */}
        <Button
          type="button"
          kind="white"
          size={fit}
          className={pad}
          onClick={props.onDecide}
          disabled={!props.choice || props.sending}
        >
          {t("runoff.tieDecide")}
        </Button>
      </div>
      {props.error && <ErrorText>{props.error}</ErrorText>}
    </div>
  );
}
