/* Kaynak: ui.css .page / .page--deck / .page--result / DS v2 §07 Yerleşim — içerik max 1120px, yatay boşluk 24/48px */
import type { ReactNode } from "react";

const variants = {
  default: "gap-[0.9375rem] px-[1.125rem] pt-5 pb-8 lg:gap-[1.375rem] lg:px-12 lg:pt-[2.125rem] lg:pb-11",
  deck: "gap-0 px-[1.125rem] pt-4 pb-0 lg:gap-4 lg:px-12 lg:pt-[2.125rem] lg:pb-11",
  result: "gap-3.5 px-[1.125rem] pt-5 pb-8 relative lg:gap-[1.375rem] lg:px-12 lg:pt-[2.125rem] lg:pb-11",
  landing:
    "gap-[0.9375rem] px-[1.125rem] pt-5 pb-8 relative lg:gap-[1.375rem] lg:px-12 lg:pt-[2.125rem] lg:pb-11",
};

export default function Page(props: {
  variant?: keyof typeof variants;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={[
        "mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[30rem] flex-col lg:min-h-[calc(100dvh-4rem)] lg:max-w-[70rem]",
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
