/* Kaynak: artboard Karar 1280 "Gruba paylaş" — Web Share API, yoksa panoya kopyala.
   Deste bitti bekleme lobisi "Bekleyenleri dürt" için etiket/görünüm prop'larıyla genişledi. */
import { Copy, Image as ImageIcon, ShareNetwork } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { shareOrDownload } from "../../lib/shareCard";
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
  /** "file": `getFile` ile üretilen PNG'yi Web Share dosya modunda paylaşır, olmazsa/çökerse
      metin paylaşımına düşer. Varsayılan "text" — mevcut linkli davranış değişmez. */
  mode?: "text" | "file";
  getFile?: () => Promise<{ blob: Blob; fileName: string } | null>;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function flash() {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  function shareText() {
    if (!props.copyOnly && navigator.share) {
      navigator.share({ text: props.text, url: props.url }).catch(() => undefined);
      return;
    }
    void copyToClipboard(props.copyOnly ? props.url : `${props.text} ${props.url}`).then((ok) => {
      if (ok) flash();
    });
  }

  function share() {
    if (props.mode !== "file" || !props.getFile) return shareText();
    setBusy(true);
    // `Promise.resolve().then(...)` yerine doğrudan `props.getFile()` çağrılsaydı, senkron bir
    // throw `.finally` bağlanmadan önce zincirin dışına kaçardı — buton kalıcı "hazırlanıyor"da
    // kilitli kalırdı. Zincire almak hem senkron throw'u hem async reject'i aynı `.catch` yoluna
    // (metin paylaşımına düşüş) sokar (coordinator düzeltmesi).
    Promise.resolve()
      .then(() => props.getFile!())
      .then(async (file) => {
        if (file && (await shareOrDownload(file.blob, file.fileName, props.text)) !== "failed") return;
        shareText();
      })
      .catch(() => shareText())
      .finally(() => setBusy(false));
  }

  const Icon = props.mode === "file" ? ImageIcon : props.copyOnly ? Copy : ShareNetwork;
  return (
    <Button type="button" kind={props.kind ?? "white"} size={props.size} onClick={share} disabled={busy}>
      <Icon size={18} aria-hidden />
      {/* Kopyalandı geçişi ekran okuyucuya duyurulur (coordinator düzeltmesi). */}
      <span aria-live="polite">
        {busy
          ? t("share.preparing")
          : copied
            ? (props.copiedLabel ?? t("result.copied"))
            : (props.label ?? t("result.share"))}
      </span>
    </Button>
  );
}
