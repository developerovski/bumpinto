/* Kaynak: ui.css .page / .page--deck / .page--result / DS v2 */
import type { ReactNode } from "react";

const variants = {
  default: "gap-[0.9375rem] px-[1.125rem] pt-5 pb-8",
  deck: "gap-0 px-[1.125rem] pt-4 pb-0",
  result: "gap-3.5 px-[1.125rem] pt-5 pb-8 relative",
};

export default function Page(props: {
  variant?: keyof typeof variants;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={[
        "mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col",
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
