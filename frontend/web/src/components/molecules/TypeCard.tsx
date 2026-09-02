import type { Icon } from "@phosphor-icons/react";

export default function TypeCard(props: { icon: Icon; title: string; copy: string; selected: boolean; onSelect: () => void }) {
  const I = props.icon;
  return (
    <button type="button" role="radio" aria-checked={props.selected} onClick={props.onSelect}
      className={`flex flex-1 cursor-pointer items-start gap-3 rounded-[1.125rem] border-[1.5px] p-[0.875rem_1rem] text-left ${props.selected ? "border-flame-deep bg-flame-wash" : "border-line2 bg-card"}`}>
      <I size={22} className="mt-px flex-none text-flame-deep" aria-hidden />
      <span className="flex flex-col gap-0.5">
        <span className="text-[0.875rem] font-semibold">{props.title}</span>
        <span className="text-[0.75rem] leading-[1.35] text-ink2">{props.copy}</span>
      </span>
    </button>
  );
}
