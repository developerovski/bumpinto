import { WaitingStatus } from "@bumpinto/web";

/** W2 · "Deste hazırlanıyor…" durum bloğu — harita işareti + başlık + 34ch'lik
    açıklama. Props almaz; tüm metin i18n'den (`waiting.*`) gelir. */
export function Preparing() {
  return (
    <div className="mx-auto w-full max-w-[27.75rem]">
      <WaitingStatus />
    </div>
  );
}
