import { ViralCard } from "@bumpinto/web";

/** W4 · viral döngü bloğu: karttan taşan "sıra sende" çıkartması, flame-wash
    gövde ve beyaz "Buluşma kur" butonu. Props almaz — metin i18n'den (`result.*`).
    Üstteki boşluk çıkartmanın -12px taşma payı için. */
export function Invitation() {
  return (
    <div
      style={{
        width: "27.75rem",
        background: "var(--color-paper)",
        padding: "1.5rem 1rem 1rem",
      }}
    >
      <ViralCard />
    </div>
  );
}
