/* Artboard W19 · SSS satırı (5390-5397 / 5439-5455) — sorular TEK kartın içinde `.srow`
   satırlarıdır: kendi kenarlığı yoktur, ayracı ve yüzeyi kap (`SettingsCard`) verir. Satır
   `<details>`: cevaplar artboard'da çizilmemiş ama üründe var ve JS'siz açılır — caret açılınca
   90° döner. `<li>` sarmalayıcı kabın ayraç seçicisiyle (`[&>li+li]`) aynı sözleşmede. */
import { CaretRight } from "@phosphor-icons/react";

export default function FaqItem(props: { question: string; answer: string }) {
  return (
    <li className="flex flex-col">
      <details className="group flex-1">
        {/* `list-none` + webkit ezmesi: tarayıcının kendi üçgeni artboard'da yok. */}
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-[0.8125rem] text-[0.875rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span className="flex-1">{props.question}</span>
          <CaretRight
            size={16}
            aria-hidden
            className="flex-none text-ink3 transition-transform group-open:rotate-90"
          />
        </summary>
        <p className="px-4 pb-[0.8125rem] text-[0.875rem] leading-relaxed text-ink2">{props.answer}</p>
      </details>
    </li>
  );
}
