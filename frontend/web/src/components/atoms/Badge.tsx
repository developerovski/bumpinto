import type { ReactNode } from "react";

export default function Badge(props: {
  tone?: "flame" | "grass" | "amber" | "violet" | "neutral";
  children: ReactNode;
}) {
  return <span className={`a-badge a-badge--${props.tone ?? "neutral"}`}>{props.children}</span>;
}
