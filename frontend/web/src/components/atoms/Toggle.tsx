/* Artboard .tog / .tog.off — 46×28 pill anahtar. `role="switch"` zorunlu: rıza ekranı klavye
   ve ekran okuyucuyla çalışmak zorunda (KVKK m.5/1 · GDPR Art. 7(1) açık rıza kanıtlanabilir olmalı). */
export default function Toggle(props: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className={[
        "relative h-7 w-[2.875rem] flex-none cursor-pointer rounded-full border-[1.5px] transition-colors",
        "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        props.checked ? "border-transparent bg-flame-deep" : "border-line2 bg-sand",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute top-[0.1875rem] h-[1.25rem] w-[1.25rem] rounded-full bg-white shadow-sh1 transition-all",
          props.checked ? "left-[1.4375rem]" : "left-[0.1875rem]",
        ].join(" ")}
      />
    </button>
  );
}
