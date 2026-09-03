/* Kaynak: artboard Karar 1280 "Gruba paylaş" — Web Share API, yoksa panoya kopyala.
   Deste bitti bekleme lobisi "Bekleyenleri dürt" için etiket/görünüm prop'larıyla genişledi. */
import { ShareNetwork } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms";

export default function ShareButton(props: {
  text: string;
  url: string;
  /** Varsayılan "Gruba paylaş"; dürtme/hatırlatma için ayrı etiket. */
  label?: string;
  copiedLabel?: string;
  kind?: "white" | "flame";
  size?: "md" | "sm" | "fit";
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function share() {
    if (navigator.share) {
      navigator.share({ text: props.text, url: props.url }).catch(() => undefined);
      return;
    }
    // Güvensiz bağlamlarda (http) clipboard API yok — o zaman sessizce hiçbir şey yapma.
    navigator.clipboard
      ?.writeText(`${props.text} ${props.url}`)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }

  return (
    <Button type="button" kind={props.kind ?? "white"} size={props.size} onClick={share}>
      <ShareNetwork size={18} aria-hidden />
      {/* Kopyalandı geçişi ekran okuyucuya duyurulur (coordinator düzeltmesi). */}
      <span aria-live="polite">
        {copied ? (props.copiedLabel ?? t("result.copied")) : (props.label ?? t("result.share"))}
      </span>
    </Button>
  );
}
