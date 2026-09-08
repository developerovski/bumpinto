import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";

import AppText from "./AppText";

/** El yazısı yan not (`.hand`). Hizalama çağırandan gelir; renk/eğim tema kararıdır. */
export default function HandNote(p: {
  children: ReactNode;
  align?: "left" | "center" | "right";
  style?: StyleProp<TextStyle>;
}) {
  return (
    <AppText variant="hand" style={[{ textAlign: p.align ?? "center" }, p.style]}>
      {p.children}
    </AppText>
  );
}
