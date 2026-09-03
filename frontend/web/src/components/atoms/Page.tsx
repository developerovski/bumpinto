/* Kaynak: ui.css .page / .page--deck / .page--result / DS v2 §07 Yerleşim — içerik max 1120px,
   yatay boşluk 24/48px. UI review: masaüstü ekranlar dar sütuna hapsolmasın — lg/xl'de kapak
   genişler (`wide` harita ekranlarında kapağı tamamen kaldırır). */
import type { ReactNode } from "react";

const variants = {
  default: "gap-[0.9375rem] px-[1.125rem] pt-5 pb-8 lg:gap-[1.375rem] lg:px-8 xl:px-12 lg:pt-[2.125rem] lg:pb-11",
  deck: "gap-0 px-[1.125rem] pt-4 pb-0 lg:gap-4 lg:px-8 xl:px-12 lg:pt-[2.125rem] lg:pb-11",
  result: "gap-3.5 px-[1.125rem] pt-5 pb-8 relative lg:gap-[1.375rem] lg:px-8 xl:px-12 lg:pt-[2.125rem] lg:pb-11",
  landing:
    "gap-[0.9375rem] px-[1.125rem] pt-5 pb-8 relative lg:gap-[1.375rem] lg:px-8 xl:px-12 lg:pt-[2.125rem] lg:pb-11",
};

export default function Page(props: {
  variant?: keyof typeof variants;
  center?: boolean;
  /** Harita ekranları (Mekanlar) — lg kapağı tamamen kaldırır, harita sağ tarafı doldurur. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={[
        "mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[30rem] flex-col",
        props.wide ? "" : "lg:min-h-[calc(100dvh-4rem)]",
        // wide: sayfa kaymaz — main tam viewport yüksekliği (TopBar 4rem + OSM altbilgi ~2.25rem düşülür);
        // içerideki liste kayar (VenueBrowser). UI review 2026-09-03.
        props.wide
          ? "lg:max-w-none lg:h-[calc(100dvh-6.25rem)] lg:min-h-0 lg:overflow-hidden lg:pb-4"
          : "lg:max-w-[80rem] xl:max-w-[96rem]",
        variants[props.variant ?? "default"],
        props.center ? "justify-center" : "",
      ]
        .join(" ")
        .trim()}
    >
      {props.children}
    </main>
  );
}
