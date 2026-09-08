/* Kaynak: ui.css .field / .label / .err */
import type { InputHTMLAttributes, ReactNode } from "react";
import ErrorText from "../atoms/ErrorText";
import TextInput from "../atoms/TextInput";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Artboard 3049/3218: `<span class="m2" style="font-weight:400">· istersen</span>` — ek
      etiketin İÇİNDE ama onun 600 ağırlığını/ink rengini TAŞIMAZ. Düz dize olarak
      birleştirildiğinde "isteğe bağlı" ifadesi zorunlu alan başlığı kadar baskın görünüyordu. */
  labelSuffix?: ReactNode;
  /** Artboard 3856/3924: iç içe geçmiş alt alanın `.lb` ezmesi 13px — üstteki bölüm
      başlığından bir kademe küçük ("Nerede buluşulsun?" > "Buluşma yeri"). */
  labelSize?: "md" | "sm";
  error?: string | null;
};

export default function Field({ label, labelSuffix, labelSize = "md", error, id, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className={`font-semibold ${labelSize === "sm" ? "text-[0.8125rem]" : "text-[0.875rem]"}`} htmlFor={id}>
        {label}
        {labelSuffix != null && <span className="font-normal text-ink2"> {labelSuffix}</span>}
      </label>
      <TextInput id={id} aria-invalid={!!error} {...rest} />
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
