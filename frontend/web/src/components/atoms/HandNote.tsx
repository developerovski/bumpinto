import type { CSSProperties, ReactNode } from "react";

export default function HandNote(props: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p className="a-hand" style={props.style}>
      {props.children}
    </p>
  );
}
