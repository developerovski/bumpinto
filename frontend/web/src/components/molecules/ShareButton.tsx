/* Kaynak: artboard Karar 1280 "Gruba paylaş" — Web Share API, yoksa panoya kopyala.
   Deste bitti bekleme lobisi "Bekleyenleri dürt" için etiket/görünüm prop'larıyla genişledi. */
import { Copy, ShareNetwork } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms";

/**
 * Pano yazımı iki yollu: `navigator.clipboard` yalnız GÜVENLİ bağlamda (https ya da localhost)
 * vardır. Bu proje telefondan LAN adresiyle de test ediliyor (`vite.config.ts` → `host: true`),
 * orada bağlam güvensizdir ve API tanımsızdır — eski `execCommand` yolu olmadan buton sessizce
 * hiçbir şey yapmaz ve kullanıcı linke ulaşamaz.
 */
async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // güvensiz bağlam ya da izin reddi — aşağıdaki yola düş
  }
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}

export default function ShareButton(props: {
  text: string;
  url: string;
  /** Varsayılan "Gruba paylaş"; dürtme/hatırlatma için ayrı etiket. */
  label?: string;
  copiedLabel?: string;
  kind?: "white" | "flame";
  size?: "md" | "sm" | "fit";
  /**
   * Paylaşım sayfasını AÇMAZ, linki doğrudan panoya yazar. "Davet linki" gibi tek işi link
   * vermek olan butonlar için: masaüstünde paylaşım sayfası araya bir adım daha koyuyor.
   * Metin değil yalnız URL kopyalanır — butonun adı ne söz veriyorsa o.
   */
  copyOnly?: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function flash() {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  function share() {
    if (!props.copyOnly && navigator.share) {
      navigator.share({ text: props.text, url: props.url }).catch(() => undefined);
      return;
    }
    void copyToClipboard(props.copyOnly ? props.url : `${props.text} ${props.url}`).then((ok) => {
      if (ok) flash();
    });
  }

  const Icon = props.copyOnly ? Copy : ShareNetwork;
  return (
    <Button type="button" kind={props.kind ?? "white"} size={props.size} onClick={share}>
      <Icon size={18} aria-hidden />
      {/* Kopyalandı geçişi ekran okuyucuya duyurulur (coordinator düzeltmesi). */}
      <span aria-live="polite">
        {copied ? (props.copiedLabel ?? t("result.copied")) : (props.label ?? t("result.share"))}
      </span>
    </Button>
  );
}
